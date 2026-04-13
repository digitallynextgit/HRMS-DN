"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { useLeaveTypes, useLeaveBalances, useApplyLeave } from "@/hooks/use-leave"
import { cn } from "@/lib/utils"
import { CalendarDays, Info } from "lucide-react"

function countWorkingDays(start: Date, end: Date): number {
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0
  let count = 0
  const current = new Date(start)
  current.setHours(0, 0, 0, 0)
  const endNorm = new Date(end)
  endNorm.setHours(0, 0, 0, 0)
  while (current <= endNorm) {
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

export function ApplyLeaveForm() {
  const router = useRouter()
  const applyLeave = useApplyLeave()

  const [leaveTypeId, setLeaveTypeId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")

  const { data: typesData, isLoading: typesLoading } = useLeaveTypes()
  const { data: balancesData } = useLeaveBalances()

  const leaveTypes = typesData?.data ?? []
  const balances = balancesData?.data ?? []

  const currentYear = new Date().getFullYear()

  const selectedBalance = useMemo(
    () => balances.find((b) => b.leaveTypeId === leaveTypeId && b.year === currentYear),
    [balances, leaveTypeId, currentYear]
  )

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0
    return countWorkingDays(new Date(startDate), new Date(endDate))
  }, [startDate, endDate])

  const available = selectedBalance
    ? selectedBalance.allocated + selectedBalance.carried - selectedBalance.used - selectedBalance.pending
    : null

  const hasInsufficientBalance =
    available !== null && totalDays > 0 && available < totalDays

  const today = new Date().toISOString().split("T")[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!leaveTypeId || !startDate || !endDate) return

    await applyLeave.mutateAsync({
      leaveTypeId,
      startDate,
      endDate,
      reason: reason.trim() || undefined,
    })

    router.push("/leave")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {/* Leave Type */}
      <div className="space-y-2">
        <Label htmlFor="leave-type">Leave Type</Label>
        <Select
          value={leaveTypeId}
          onValueChange={setLeaveTypeId}
          disabled={typesLoading}
        >
          <SelectTrigger id="leave-type">
            <SelectValue placeholder={typesLoading ? "Loading..." : "Select leave type"} />
          </SelectTrigger>
          <SelectContent>
            {leaveTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
                {type.isPaid ? " (Paid)" : " (Unpaid)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Balance info for selected type */}
        {leaveTypeId && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-md px-3 py-2 text-sm border",
              hasInsufficientBalance
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-blue-50 border-blue-200 text-blue-700"
            )}
          >
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            {selectedBalance ? (
              <span>
                Available balance:{" "}
                <strong>{Math.max(0, available ?? 0)} day(s)</strong>
                {selectedBalance.carried > 0 && (
                  <> (includes {selectedBalance.carried} carried forward)</>
                )}
              </span>
            ) : (
              <span>No balance record found for {currentYear}. Your request will still be submitted.</span>
            )}
          </div>
        )}
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              if (endDate && e.target.value > endDate) setEndDate(e.target.value)
            }}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            id="end-date"
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Calculated days */}
      {totalDays > 0 && (
        <Card className="border-dashed">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Working days:</span>
              <span className="font-semibold">{totalDays} day{totalDays !== 1 ? "s" : ""}</span>
              <span className="text-xs text-muted-foreground">(weekends excluded)</span>
            </div>
            {hasInsufficientBalance && (
              <p className="text-xs text-destructive mt-1">
                Insufficient balance. You have {Math.max(0, available ?? 0)} day(s) available but
                requested {totalDays}.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="reason">
          Reason <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="reason"
          placeholder="Provide a reason for your leave request..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={
            applyLeave.isPending ||
            !leaveTypeId ||
            !startDate ||
            !endDate ||
            totalDays === 0 ||
            hasInsufficientBalance
          }
        >
          {applyLeave.isPending ? "Submitting..." : "Submit Leave Request"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/leave")}
          disabled={applyLeave.isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

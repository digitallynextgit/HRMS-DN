"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LeaveBalanceCard } from "@/components/leave/leave-balance-card"
import { useLeaveBalances, useLeaveRequests } from "@/hooks/use-leave"
import { formatDate, cn } from "@/lib/utils"
import { LEAVE_STATUS_LABELS, LEAVE_STATUS_COLORS } from "@/lib/constants"
import { CalendarRange, AlertTriangle, Inbox } from "lucide-react"

interface EmployeeLeaveTabProps {
  employeeId: string
}

export function EmployeeLeaveTab({ employeeId }: EmployeeLeaveTabProps) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  const { data: balancesData, isLoading: balancesLoading } = useLeaveBalances(
    employeeId,
    year
  )
  const { data: requestsData, isLoading: requestsLoading } = useLeaveRequests({
    employeeId,
    page: 1,
    limit: 50,
  })

  const balances = balancesData?.data ?? []
  const requests = requestsData?.data ?? []

  // Year dropdown — current and 2 previous years
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2]

  // Summary stats for the selected year
  const yearRequests = requests.filter(
    (r) => new Date(r.startDate).getFullYear() === year
  )
  const approvedDays = yearRequests
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + r.totalDays, 0)
  const pendingDays = yearRequests
    .filter((r) => r.status === "PENDING")
    .reduce((sum, r) => sum + r.totalDays, 0)
  const lateNoticeCount = yearRequests.filter(
    (r) => (r as { lateNoticePenalty?: boolean }).lateNoticePenalty
  ).length

  return (
    <div className="space-y-6">
      {/* Header with year selector */}
      <div className="flex items-center justify-between gap-4 -mt-1">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Leave Overview</h3>
        </div>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year summary strip — compact, single row */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
            <SummaryStat label="Approved" value={approvedDays} suffix={approvedDays === 1 ? "day" : "days"} />
            <SummaryStat label="Pending" value={pendingDays} suffix={pendingDays === 1 ? "day" : "days"} tone="amber" />
            <SummaryStat
              label="Total Requests"
              value={yearRequests.length}
              suffix={yearRequests.length === 1 ? "request" : "requests"}
            />
            <SummaryStat
              label="Late Notice"
              value={lateNoticeCount}
              suffix={lateNoticeCount === 1 ? "flagged" : "flagged"}
              tone={lateNoticeCount > 0 ? "red" : "default"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Leave balances */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          Balances · {year}
        </h4>
        {balancesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : balances.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No leave balances allocated for {year}.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {balances.map((b) => (
              <LeaveBalanceCard key={b.id} balance={b} />
            ))}
          </div>
        )}
      </div>

      {/* Leave request history */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          Request History · {year}
        </h4>
        {requestsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-md" />
            ))}
          </div>
        ) : yearRequests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No leave requests found for {year}.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-2.5 font-medium">Type</th>
                      <th className="px-4 py-2.5 font-medium">From</th>
                      <th className="px-4 py-2.5 font-medium">To</th>
                      <th className="px-4 py-2.5 font-medium text-center">Days</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Approver</th>
                      <th className="px-4 py-2.5 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {yearRequests.map((r) => {
                      const lateNotice = (r as { lateNoticePenalty?: boolean }).lateNoticePenalty
                      return (
                        <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{r.leaveType.name}</span>
                              {!r.leaveType.isPaid && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4">
                                  Unpaid
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {r.leaveType.code}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {formatDate(r.startDate)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {formatDate(r.endDate)}
                          </td>
                          <td className="px-4 py-2.5 text-center font-medium">
                            {r.totalDays}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  LEAVE_STATUS_COLORS[r.status]
                                )}
                              >
                                {LEAVE_STATUS_LABELS[r.status]}
                              </Badge>
                              {lateNotice && (
                                <span title="Late notice — double salary deduction flagged">
                                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {r.approver
                              ? `${r.approver.firstName} ${r.approver.lastName}`
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">
                            {r.reason || "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  suffix,
  tone = "default",
}: {
  label: string
  value: number
  suffix: string
  tone?: "default" | "amber" | "red"
}) {
  const valueColor =
    tone === "red" && value > 0
      ? "text-red-600 dark:text-red-400"
      : tone === "amber" && value > 0
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground"
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className={cn("text-xl font-bold tabular-nums", valueColor)}>{value}</span>
        <span className="text-[11px] text-muted-foreground">{suffix}</span>
      </p>
    </div>
  )
}

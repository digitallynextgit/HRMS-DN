"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { LeaveBalance } from "@/hooks/use-leave"

interface LeaveBalanceCardProps {
  balance: LeaveBalance
}

export function LeaveBalanceCard({ balance }: LeaveBalanceCardProps) {
  const { leaveType, allocated, carried, used, pending } = balance
  const total = allocated + carried
  const available = total - used - pending
  const usedPercent = total > 0 ? Math.round(((used + pending) / total) * 100) : 0
  const availablePercent = total > 0 ? Math.round((available / total) * 100) : 100

  const colorClass =
    availablePercent > 50
      ? "text-green-700"
      : availablePercent > 25
      ? "text-amber-700"
      : "text-red-700"

  const progressColorClass =
    availablePercent > 50
      ? "[&>div]:bg-green-500"
      : availablePercent > 25
      ? "[&>div]:bg-amber-500"
      : "[&>div]:bg-red-500"

  const bgClass =
    availablePercent > 50
      ? "bg-green-50 border-green-200"
      : availablePercent > 25
      ? "bg-amber-50 border-amber-200"
      : "bg-red-50 border-red-200"

  return (
    <Card className={cn("border", bgClass)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-foreground leading-tight">
            {leaveType.name}
          </CardTitle>
          <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-card border border-current text-muted-foreground">
            {leaveType.isPaid ? "Paid" : "Unpaid"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{leaveType.code}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Available days — the hero number */}
        <div>
          <span className={cn("text-3xl font-bold", colorClass)}>
            {Math.max(0, available)}
          </span>
          <span className="text-sm text-muted-foreground ml-1">
            / {total} days available
          </span>
        </div>

        {/* Progress bar */}
        <Progress value={usedPercent} className={cn("h-2 bg-muted", progressColorClass)} />

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-semibold text-foreground">{used}</p>
            <p className="text-xs text-muted-foreground">Used</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-600">{pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{carried}</p>
            <p className="text-xs text-muted-foreground">Carried</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

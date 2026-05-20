"use client"

import Link from "next/link"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useMyWfhRequests, useWfhEligibility, useCancelWfh } from "@/hooks/use-wfh"
import { LEAVE_STATUS_LABELS, LEAVE_STATUS_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Plus, Home, AlertTriangle, Ban, Inbox } from "lucide-react"

export default function MyWfhPage() {
  const { data: eligibility, isLoading: eligLoading } = useWfhEligibility()
  const { data: requestsData, isLoading: reqLoading } = useMyWfhRequests({ page: 1, limit: 30 })
  const cancel = useCancelWfh()

  const requests = requestsData?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work From Home"
        description="Apply for and track your WFH requests."
        actions={
          <Button asChild>
            <Link href="/wfh/apply" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Apply WFH
            </Link>
          </Button>
        }
      />

      {/* Eligibility card */}
      {eligLoading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : eligibility ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "shrink-0 h-9 w-9 rounded-lg flex items-center justify-center",
                  eligibility.tier === 3
                    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                )}
              >
                {eligibility.tier === 3 ? <Home className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Tier {eligibility.tier}
                  </span>
                  {eligibility.tier === 3 && (
                    <Badge variant="outline" className="text-xs">
                      {eligibility.usedThisMonth} / {eligibility.monthlyQuota} used this month
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground">{eligibility.label}</p>
                {eligibility.eligibleFromDate && eligibility.tier !== 3 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Standard WFH eligibility from{" "}
                    <span className="font-medium text-foreground">
                      {new Date(eligibility.eligibleFromDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Requests list */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          Request History
        </h4>
        {reqLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-md" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No WFH requests yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-2.5 font-medium">Date</th>
                      <th className="px-4 py-2.5 font-medium">Reason</th>
                      <th className="px-4 py-2.5 font-medium">Type</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                          {new Date(r.date).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                          })}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground max-w-[300px] truncate">
                          {r.reason || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {r.isEmergency ? (
                            <Badge variant="outline" className="text-xs bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
                              Emergency
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Standard</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className={cn("text-xs", LEAVE_STATUS_COLORS[r.status])}>
                            {LEAVE_STATUS_LABELS[r.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {r.status === "PENDING" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => cancel.mutate(r.id)}
                              disabled={cancel.isPending}
                            >
                              <Ban className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
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

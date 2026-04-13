"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { LeaveBalanceCard } from "@/components/leave/leave-balance-card"
import { LeaveRequestTable } from "@/components/leave/leave-request-table"
import { useLeaveBalances, useMyLeaveRequests } from "@/hooks/use-leave"
import { Plus } from "lucide-react"

export default function LeaveDashboardPage() {
  const { data: session } = useSession()
  const currentYear = new Date().getFullYear()

  const { data: balancesData, isLoading: balancesLoading } = useLeaveBalances(
    undefined,
    currentYear
  )
  const { data: requestsData, isLoading: requestsLoading } = useMyLeaveRequests({
    page: 1,
    limit: 10,
  })

  const balances = balancesData?.data ?? []
  const requests = requestsData?.data ?? []

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Leave"
        description="View your leave balances and recent requests."
        actions={
          <Button asChild>
            <Link href="/leave/apply" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Apply Leave
            </Link>
          </Button>
        }
      />

      {/* Leave Balances */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">
          Leave Balances — {currentYear}
        </h2>

        {balancesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : balances.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No leave balances have been allocated for {currentYear}.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Contact your HR administrator to set up your leave balance.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {balances.map((balance) => (
              <LeaveBalanceCard key={balance.id} balance={balance} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Requests */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Recent Requests</h2>
        </div>

        {requestsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <LeaveRequestTable
            requests={requests}
            showEmployee={false}
            canApprove={false}
            currentUserId={session?.user.id}
          />
        )}
      </section>
    </div>
  )
}

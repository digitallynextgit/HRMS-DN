import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession } from "@/lib/permissions"
import { isOnProbation, getProbationEndDate } from "@/lib/probation"
import type { Session } from "next-auth"

export const GET = withSession(
  async (_req: NextRequest, _ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const employee = await db.employee.findUnique({
        where: { id: session.user.id },
        select: { onProbation: true, probationMonths: true, dateOfJoining: true },
      })

      const now = new Date()
      const probationEnd = getProbationEndDate(employee ?? {})
      const onProbation = employee ? isOnProbation(employee, now) : true

      // Tier 3 unlocks 6 months after probation ends.
      const tier3From = probationEnd ? new Date(probationEnd) : null
      if (tier3From) tier3From.setMonth(tier3From.getMonth() + 6)

      let tier: 1 | 2 | 3 = 1
      let eligibleFromDate: string | null = null
      let label = ""

      if (onProbation) {
        tier = 1
        label = "On Probation - WFH allowed only in emergencies (Manager + HR approval required)"
        eligibleFromDate = tier3From ? tier3From.toISOString().split("T")[0] : null
      } else if (tier3From && now < tier3From) {
        tier = 2
        label =
          "Within 6 months of probation completion - WFH allowed only in emergencies (Manager + HR approval required)"
        eligibleFromDate = tier3From.toISOString().split("T")[0]
      } else {
        tier = 3
        label = "Eligible for 1 WFH day per month"
      }

      // For tier 3, return WFH usage this month
      let usedThisMonth = 0
      if (tier === 3) {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        usedThisMonth = await db.wfhRequest.count({
          where: {
            employeeId: session.user.id,
            status: { in: ["PENDING", "APPROVED"] },
            date: { gte: monthStart, lte: monthEnd },
          },
        })
      }

      return NextResponse.json({
        tier,
        label,
        eligibleFromDate,
        monthlyQuota: tier === 3 ? 1 : 0,
        usedThisMonth,
        canApplyEmergencyOnly: tier !== 3,
        joiningDate: employee?.dateOfJoining?.toISOString().split("T")[0] ?? null,
        probationEnd: probationEnd ? new Date(probationEnd).toISOString().split("T")[0] : null,
      })
    } catch (error) {
      console.error("[WFH_ELIGIBILITY_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession } from "@/lib/permissions"
import type { Session } from "next-auth"

export const GET = withSession(
  async (_req: NextRequest, _ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const employee = await db.employee.findUnique({
        where: { id: session.user.id },
        select: { probationEndDate: true, confirmationDate: true, dateOfJoining: true },
      })

      const now = new Date()
      const probationEnd = employee?.probationEndDate ?? employee?.confirmationDate ?? null

      let tier: 1 | 2 | 3 = 1
      let eligibleFromDate: string | null = null
      let label = ""

      if (!probationEnd || now < new Date(probationEnd)) {
        tier = 1
        label = "On Probation - WFH allowed only in emergencies (Manager + HR approval required)"
        if (probationEnd) {
          const sixMonthsAfter = new Date(probationEnd)
          sixMonthsAfter.setMonth(sixMonthsAfter.getMonth() + 6)
          eligibleFromDate = sixMonthsAfter.toISOString().split("T")[0]
        }
      } else {
        const sixMonthsAfter = new Date(probationEnd)
        sixMonthsAfter.setMonth(sixMonthsAfter.getMonth() + 6)
        if (now < sixMonthsAfter) {
          tier = 2
          label =
            "Within 6 months of probation completion - WFH allowed only in emergencies (Manager + HR approval required)"
          eligibleFromDate = sixMonthsAfter.toISOString().split("T")[0]
        } else {
          tier = 3
          label = "Eligible for 1 WFH day per month"
        }
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

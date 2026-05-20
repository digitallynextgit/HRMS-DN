import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession, hasPermission } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

// ─── Eligibility tiers per Digitally Next WFH Policy ──────────────────────────
// Tier 1 — During probation:               BLOCKED (emergency only, Mgr+HR approval)
// Tier 2 — Post probation, 0-6 months:     BLOCKED (emergency only, Mgr+HR approval)
// Tier 3 — Post probation + 6 months:      1 WFH/month, manager approval, HR notification
type Tier = 1 | 2 | 3

function getEmployeeTier(
  probationEndDate: Date | null,
  confirmationDate: Date | null
): Tier {
  const now = new Date()
  const probationEnd = probationEndDate ?? confirmationDate
  if (!probationEnd || now < new Date(probationEnd)) return 1
  const sixMonthsAfter = new Date(probationEnd)
  sixMonthsAfter.setMonth(sixMonthsAfter.getMonth() + 6)
  if (now < sixMonthsAfter) return 2
  return 3
}

export const GET = withSession(
  async (req: NextRequest, _ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { searchParams } = new URL(req.url)
      const canApprove = hasPermission(session, PERMISSIONS.WFH_APPROVE)

      const page  = Math.max(1, Number(searchParams.get("page")  ?? 1))
      const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)))
      const skip  = (page - 1) * limit

      const where: Record<string, unknown> = {}

      if (canApprove) {
        const statusParam     = searchParams.get("status")
        const employeeIdParam = searchParams.get("employeeId")
        const fromParam       = searchParams.get("from")
        const toParam         = searchParams.get("to")

        if (statusParam)     where.status     = statusParam
        if (employeeIdParam) where.employeeId = employeeIdParam
        if (fromParam || toParam) {
          where.date = {}
          if (fromParam) (where.date as Record<string, unknown>).gte = new Date(fromParam)
          if (toParam)   (where.date as Record<string, unknown>).lte = new Date(toParam)
        }
      } else {
        where.employeeId = session.user.id
        const statusParam = searchParams.get("status")
        if (statusParam) where.status = statusParam
      }

      const [requests, total] = await Promise.all([
        db.wfhRequest.findMany({
          where,
          include: {
            employee:        { select: { id: true, firstName: true, lastName: true, employeeNo: true, profilePhoto: true } },
            managerApprover: { select: { id: true, firstName: true, lastName: true } },
            hrApprover:      { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        db.wfhRequest.count({ where }),
      ])

      return NextResponse.json({
        data: requests,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      })
    } catch (error) {
      console.error("[WFH_REQUESTS_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const POST = withSession(
  async (req: NextRequest, _ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const body = await req.json()
      const { date, reason, isEmergency } = body

      if (!date) {
        return NextResponse.json({ error: "date is required" }, { status: 400 })
      }

      const wfhDate = new Date(date)
      wfhDate.setUTCHours(0, 0, 0, 0)

      if (isNaN(wfhDate.getTime())) {
        return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
      }

      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      if (wfhDate < today) {
        return NextResponse.json({ error: "Cannot apply for WFH in the past" }, { status: 400 })
      }

      // Block weekends — WFH applies only to working days
      const dow = wfhDate.getUTCDay()
      if (dow === 0 || dow === 6) {
        return NextResponse.json({ error: "WFH cannot be applied for weekends" }, { status: 400 })
      }

      // Block holidays
      const holiday = await db.holiday.findFirst({
        where: { date: wfhDate, isOptional: false },
      })
      if (holiday) {
        return NextResponse.json({ error: `${wfhDate.toDateString()} is a holiday (${holiday.name})` }, { status: 400 })
      }

      // Fetch employee tier
      const employee = await db.employee.findUnique({
        where: { id: session.user.id },
        select: { probationEndDate: true, confirmationDate: true },
      })

      const tier = getEmployeeTier(
        employee?.probationEndDate ?? null,
        employee?.confirmationDate ?? null
      )

      // ── Tier rules ──
      if (tier === 1 || tier === 2) {
        if (!isEmergency) {
          const tierMsg = tier === 1
            ? "You are currently on probation. WFH is only available in emergencies and requires both Manager and HR approval."
            : "You are within 6 months of probation completion. WFH is only available in emergencies and requires both Manager and HR approval."
          return NextResponse.json({ error: tierMsg, tier, requiresEmergency: true }, { status: 422 })
        }
      }

      // ── Tier 3: enforce 1 WFH/month ──
      if (tier === 3) {
        const monthStart = new Date(wfhDate.getUTCFullYear(), wfhDate.getUTCMonth(), 1)
        const monthEnd   = new Date(wfhDate.getUTCFullYear(), wfhDate.getUTCMonth() + 1, 0)
        const usedThisMonth = await db.wfhRequest.count({
          where: {
            employeeId: session.user.id,
            status:     { in: ["PENDING", "APPROVED"] },
            date:       { gte: monthStart, lte: monthEnd },
          },
        })
        if (usedThisMonth >= 1) {
          return NextResponse.json(
            { error: "You have already used or applied for your 1 WFH day this month." },
            { status: 422 }
          )
        }
      }

      // ── Anti-clubbing: WFH cannot overlap with leaves (Leave Policy rule) ──
      const overlappingLeave = await db.leaveRequest.findFirst({
        where: {
          employeeId: session.user.id,
          status:     { in: ["PENDING", "APPROVED"] },
          AND: [
            { startDate: { lte: wfhDate } },
            { endDate:   { gte: wfhDate } },
          ],
        },
      })
      if (overlappingLeave) {
        return NextResponse.json(
          { error: "WFH cannot be clubbed with a leave on the same day." },
          { status: 422 }
        )
      }

      // ── Duplicate WFH check ──
      const duplicate = await db.wfhRequest.findFirst({
        where: {
          employeeId: session.user.id,
          date:       wfhDate,
          status:     { in: ["PENDING", "APPROVED"] },
        },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: "You already have a WFH request for this date." },
          { status: 409 }
        )
      }

      const request = await db.wfhRequest.create({
        data: {
          employeeId:  session.user.id,
          date:        wfhDate,
          reason:      reason ? String(reason).trim() : null,
          status:      "PENDING",
          isEmergency: !!isEmergency,
        },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeNo: true, profilePhoto: true } },
        },
      })

      return NextResponse.json({ data: request, tier }, { status: 201 })
    } catch (error) {
      console.error("[WFH_REQUESTS_POST]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

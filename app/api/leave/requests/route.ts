import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession, hasPermission } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

// Calendar days inclusive - applies the sandwich rule (weekends between leave days are counted)
function countCalendarDays(start: Date, end: Date): number {
  const s = new Date(start)
  s.setHours(0, 0, 0, 0)
  const e = new Date(end)
  e.setHours(0, 0, 0, 0)
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
}

// Difference in calendar days from today (negative = past/today)
function daysFromToday(date: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return Math.floor((d.getTime() - today.getTime()) / 86400000)
}

export const GET = withSession(
  async (req: NextRequest, _ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { searchParams } = new URL(req.url)
      const canApprove = hasPermission(session, PERMISSIONS.LEAVE_APPROVE)

      const page = Math.max(1, Number(searchParams.get("page") ?? 1))
      const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)))
      const skip = (page - 1) * limit

      const where: Record<string, unknown> = {}

      if (canApprove) {
        const statusParam = searchParams.get("status")
        const employeeIdParam = searchParams.get("employeeId")
        const leaveTypeIdParam = searchParams.get("leaveTypeId")
        const fromParam = searchParams.get("from")
        const toParam = searchParams.get("to")

        if (statusParam) where.status = statusParam
        if (employeeIdParam) where.employeeId = employeeIdParam
        if (leaveTypeIdParam) where.leaveTypeId = leaveTypeIdParam
        if (fromParam || toParam) {
          where.startDate = {}
          if (fromParam) (where.startDate as Record<string, unknown>).gte = new Date(fromParam)
          if (toParam) (where.startDate as Record<string, unknown>).lte = new Date(toParam)
        }
      } else {
        where.employeeId = session.user.id
        const statusParam = searchParams.get("status")
        const leaveTypeIdParam = searchParams.get("leaveTypeId")
        if (statusParam) where.status = statusParam
        if (leaveTypeIdParam) where.leaveTypeId = leaveTypeIdParam
      }

      const [requests, total] = await Promise.all([
        db.leaveRequest.findMany({
          where,
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNo: true,
                profilePhoto: true,
              },
            },
            leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
            approver: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        db.leaveRequest.count({ where }),
      ])

      return NextResponse.json({
        data: requests,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      })
    } catch (error) {
      console.error("[LEAVE_REQUESTS_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

export const POST = withSession(
  async (req: NextRequest, _ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const body = await req.json()
      const { leaveTypeId, startDate, endDate, reason, isHalfDay } = body

      if (!leaveTypeId || !startDate || !endDate) {
        return NextResponse.json(
          { error: "leaveTypeId, startDate, and endDate are required" },
          { status: 400 },
        )
      }

      const start = new Date(startDate)
      start.setUTCHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setUTCHours(0, 0, 0, 0)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
      }
      if (end < start) {
        return NextResponse.json(
          { error: "End date must be on or after start date" },
          { status: 400 },
        )
      }

      // Fetch leave type
      const leaveType = await db.leaveType.findUnique({ where: { id: leaveTypeId } })
      if (!leaveType || !leaveType.isActive) {
        return NextResponse.json({ error: "Leave type not found or inactive" }, { status: 404 })
      }

      // Fetch employee info (needed for multiple policy checks)
      const employee = await db.employee.findUnique({
        where: { id: session.user.id },
        select: { probationEndDate: true, confirmationDate: true, dateOfJoining: true },
      })

      // ── Policy: No leaves during probation ────────────────────────────────────
      if (employee?.probationEndDate && new Date() < new Date(employee.probationEndDate)) {
        return NextResponse.json(
          { error: "Employees are not eligible for leaves during the probation period." },
          { status: 422 },
        )
      }

      // ── Sandwich rule: count ALL calendar days (weekends in between are charged) ──
      let totalDays = isHalfDay ? 0.5 : countCalendarDays(start, end)

      // Short Leave is always 0.5 day per use
      if (leaveType.code === "SHORT") totalDays = 0.5

      if (totalDays === 0) {
        return NextResponse.json(
          { error: "Selected date range results in zero leave days" },
          { status: 400 },
        )
      }

      // ── Policy: EL eligibility (probation + 6 months) ─────────────────────────
      if (leaveType.code === "EL") {
        const probationEnd = employee?.probationEndDate ?? employee?.confirmationDate
        if (probationEnd) {
          const eligibleFrom = new Date(probationEnd)
          eligibleFrom.setMonth(eligibleFrom.getMonth() + 6)
          if (new Date() < eligibleFrom) {
            return NextResponse.json(
              {
                error:
                  "Earned Leave is available only after completing probation period plus 6 months.",
              },
              { status: 422 },
            )
          }
        }
      }

      // ── Policy: Maternity Leave requires 2 years of service ──────────────────
      if (leaveType.code === "ML") {
        if (employee?.dateOfJoining) {
          const twoYearsAfter = new Date(employee.dateOfJoining)
          twoYearsAfter.setFullYear(twoYearsAfter.getFullYear() + 2)
          if (new Date() < twoYearsAfter) {
            return NextResponse.json(
              { error: "Maternity Leave is only available after completing 2 years of service." },
              { status: 422 },
            )
          }
        }
      }

      // ── Policy: CL advance notice (2 days) → flag late penalty ──────────────
      let lateNoticePenalty = false
      if (leaveType.code === "CL" || leaveType.code === "LWP") {
        if (daysFromToday(start) < 2) {
          lateNoticePenalty = true
          // We allow submission but flag it - payroll will apply double deduction
        }
      }

      // ── Policy: EL advance notice (60 days) ──────────────────────────────────
      if (leaveType.code === "EL") {
        if (daysFromToday(start) < 60) {
          return NextResponse.json(
            { error: "Earned Leave requires at least 60 days advance notice. Please plan ahead." },
            { status: 422 },
          )
        }
      }

      // ── Policy: EL min 3 days, max 7 days per application ────────────────────
      if (leaveType.code === "EL") {
        if (totalDays < 3) {
          return NextResponse.json(
            { error: "Earned Leave requires a minimum of 3 consecutive days per application." },
            { status: 422 },
          )
        }
        if (totalDays > 7) {
          return NextResponse.json(
            { error: "Earned Leave allows a maximum of 7 days per application." },
            { status: 422 },
          )
        }
      }

      // ── Policy: CL max 2 days per month ──────────────────────────────────────
      if (leaveType.code === "CL") {
        const monthStart = new Date(start.getUTCFullYear(), start.getUTCMonth(), 1)
        const monthEnd = new Date(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)
        const existing = await db.leaveRequest.findMany({
          where: {
            employeeId: session.user.id,
            leaveTypeId,
            status: { in: ["PENDING", "APPROVED"] },
            startDate: { gte: monthStart, lte: monthEnd },
          },
        })
        const usedThisMonth = existing.reduce((sum, r) => sum + r.totalDays, 0)
        if (usedThisMonth + totalDays > 2) {
          return NextResponse.json(
            {
              error: `Casual Leave limit exceeded: maximum 2 days per month. You have already used/pending ${usedThisMonth} day(s) this month.`,
            },
            { status: 422 },
          )
        }
      }

      // ── Policy: Short Leave max 2 per month (3rd → auto half-day LWP) ────────
      if (leaveType.code === "SHORT") {
        const monthStart = new Date(start.getUTCFullYear(), start.getUTCMonth(), 1)
        const monthEnd = new Date(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)
        const usedCount = await db.leaveRequest.count({
          where: {
            employeeId: session.user.id,
            leaveTypeId,
            status: { in: ["PENDING", "APPROVED"] },
            startDate: { gte: monthStart, lte: monthEnd },
          },
        })
        if (usedCount >= 2) {
          // 3rd short leave = half day without pay - convert to 0.5 LWP
          const lwpType = await db.leaveType.findUnique({ where: { code: "LWP" } })
          if (lwpType) {
            return NextResponse.json(
              {
                error:
                  "You have already used 2 Short Leaves this month. A 3rd Short Leave will be treated as a half-day Leave Without Pay. Please apply for 0.5 days of Leave Without Pay instead.",
              },
              { status: 422 },
            )
          }
        }
      }

      // ── Policy: CL/SL cannot be clubbed with EL ──────────────────────────────
      if (leaveType.code === "CL" || leaveType.code === "SL") {
        const elType = await db.leaveType.findUnique({ where: { code: "EL" } })
        if (elType) {
          // Check for adjacent (within 1 day gap) EL request
          const dayBefore = new Date(start)
          dayBefore.setDate(dayBefore.getDate() - 1)
          const dayAfter = new Date(end)
          dayAfter.setDate(dayAfter.getDate() + 1)
          const adjacent = await db.leaveRequest.findFirst({
            where: {
              employeeId: session.user.id,
              leaveTypeId: elType.id,
              status: { in: ["PENDING", "APPROVED"] },
              OR: [
                { endDate: { gte: dayBefore, lte: start } },
                { startDate: { gte: end, lte: dayAfter } },
              ],
            },
          })
          if (adjacent) {
            return NextResponse.json(
              {
                error: `${leaveType.name} cannot be combined with Earned Leave as per company policy.`,
              },
              { status: 422 },
            )
          }
        }
      }

      if (leaveType.code === "EL") {
        const clType = await db.leaveType.findFirst({ where: { code: { in: ["CL", "SL"] } } })
        if (clType) {
          const dayBefore = new Date(start)
          dayBefore.setDate(dayBefore.getDate() - 1)
          const dayAfter = new Date(end)
          dayAfter.setDate(dayAfter.getDate() + 1)
          const adjacent = await db.leaveRequest.findFirst({
            where: {
              employeeId: session.user.id,
              leaveType: { code: { in: ["CL", "SL"] } },
              status: { in: ["PENDING", "APPROVED"] },
              OR: [
                { endDate: { gte: dayBefore, lte: start } },
                { startDate: { gte: end, lte: dayAfter } },
              ],
            },
          })
          if (adjacent) {
            return NextResponse.json(
              {
                error:
                  "Earned Leave cannot be combined with Casual Leave or Sick Leave as per company policy.",
              },
              { status: 422 },
            )
          }
        }
      }

      // ── Policy: Leaves cannot be combined with WFH ────────────────────────────
      // (informational - enforced by HR; we log it in reason if needed)

      // ── Check for overlapping approved/pending leaves ─────────────────────────
      const overlapping = await db.leaveRequest.findFirst({
        where: {
          employeeId: session.user.id,
          status: { in: ["PENDING", "APPROVED"] },
          AND: [{ startDate: { lte: end } }, { endDate: { gte: start } }],
        },
      })
      if (overlapping) {
        return NextResponse.json(
          { error: "You already have a leave request that overlaps with the selected dates." },
          { status: 409 },
        )
      }

      const year = start.getUTCFullYear()

      // ── Balance check ─────────────────────────────────────────────────────────
      const balance = await db.leaveBalance.findUnique({
        where: { employeeId_leaveTypeId_year: { employeeId: session.user.id, leaveTypeId, year } },
      })
      if (balance && leaveType.maxDaysPerYear > 0) {
        const available = balance.allocated + balance.carried - balance.used - balance.pending
        if (available < totalDays) {
          return NextResponse.json(
            {
              error: `Insufficient leave balance. Available: ${available} day(s), Requested: ${totalDays} day(s).`,
            },
            { status: 422 },
          )
        }
      }

      // ── Create request + update balance ───────────────────────────────────────
      const result = await db.$transaction(async (tx) => {
        const request = await tx.leaveRequest.create({
          data: {
            employeeId: session.user.id,
            leaveTypeId,
            startDate: start,
            endDate: end,
            totalDays,
            reason: reason ? String(reason).trim() : null,
            status: "PENDING",
            lateNoticePenalty,
          },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNo: true,
                profilePhoto: true,
              },
            },
            leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
          },
        })

        await tx.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: { employeeId: session.user.id, leaveTypeId, year },
          },
          update: { pending: { increment: totalDays } },
          create: {
            employeeId: session.user.id,
            leaveTypeId,
            year,
            allocated: 0,
            used: 0,
            pending: totalDays,
            carried: 0,
          },
        })

        return request
      })

      return NextResponse.json({ data: result }, { status: 201 })
    } catch (error) {
      console.error("[LEAVE_REQUESTS_POST]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

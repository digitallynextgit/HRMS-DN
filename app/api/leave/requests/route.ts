import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession, hasPermission } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

// Count working days (Mon–Fri) between two dates inclusive
function countWorkingDays(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  current.setHours(0, 0, 0, 0)
  const endNorm = new Date(end)
  endNorm.setHours(0, 0, 0, 0)

  while (current <= endNorm) {
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  return count
}

export const GET = withSession(
  async (req: NextRequest, _ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { searchParams } = new URL(req.url)
      const canApprove = hasPermission(session, PERMISSIONS.LEAVE_APPROVE)

      const page = Math.max(1, Number(searchParams.get("page") ?? 1))
      const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)))
      const skip = (page - 1) * limit

      // Approvers can filter by employee/type/status/date; others see only own
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {}

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
          if (fromParam) where.startDate.gte = new Date(fromParam)
          if (toParam) where.startDate.lte = new Date(toParam)
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
              select: { id: true, firstName: true, lastName: true, employeeNo: true, profilePhoto: true },
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
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error("[LEAVE_REQUESTS_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const POST = withSession(
  async (req: NextRequest, _ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const body = await req.json()
      const { leaveTypeId, startDate, endDate, reason } = body

      if (!leaveTypeId || !startDate || !endDate) {
        return NextResponse.json(
          { error: "leaveTypeId, startDate, and endDate are required" },
          { status: 400 }
        )
      }

      const start = new Date(startDate)
      const end = new Date(endDate)
      start.setUTCHours(0, 0, 0, 0)
      end.setUTCHours(0, 0, 0, 0)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
      }

      if (end < start) {
        return NextResponse.json({ error: "End date must be on or after start date" }, { status: 400 })
      }

      const totalDays = countWorkingDays(start, end)
      if (totalDays === 0) {
        return NextResponse.json({ error: "Selected date range has no working days" }, { status: 400 })
      }

      // Verify leave type exists and is active
      const leaveType = await db.leaveType.findUnique({ where: { id: leaveTypeId } })
      if (!leaveType || !leaveType.isActive) {
        return NextResponse.json({ error: "Leave type not found or inactive" }, { status: 404 })
      }

      // Check for overlapping approved or pending leaves
      const overlapping = await db.leaveRequest.findFirst({
        where: {
          employeeId: session.user.id,
          status: { in: ["PENDING", "APPROVED"] },
          AND: [
            { startDate: { lte: end } },
            { endDate: { gte: start } },
          ],
        },
      })

      if (overlapping) {
        return NextResponse.json(
          { error: "You already have a leave request that overlaps with the selected dates" },
          { status: 409 }
        )
      }

      const year = start.getUTCFullYear()

      // Check balance sufficiency
      const balance = await db.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: session.user.id,
            leaveTypeId,
            year,
          },
        },
      })

      if (balance) {
        const available = balance.allocated + balance.carried - balance.used - balance.pending
        if (leaveType.maxDaysPerYear > 0 && available < totalDays) {
          return NextResponse.json(
            {
              error: `Insufficient leave balance. Available: ${available} day(s), Requested: ${totalDays} day(s)`,
            },
            { status: 422 }
          )
        }
      }

      // Create request and update balance in a transaction
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
          },
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, employeeNo: true, profilePhoto: true },
            },
            leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
          },
        })

        // Upsert balance and increment pending
        await tx.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: session.user.id,
              leaveTypeId,
              year,
            },
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
  }
)

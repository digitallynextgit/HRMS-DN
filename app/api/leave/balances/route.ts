import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, withSession, hasPermission } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

export const GET = withSession(
  async (req: NextRequest, _ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { searchParams } = new URL(req.url)
      const year = Number(searchParams.get("year") ?? new Date().getFullYear())
      const requestedEmployeeId = searchParams.get("employeeId")

      // If no employeeId given, default to self
      // If employeeId given and not self, require leave:approve
      let employeeId: string
      if (!requestedEmployeeId || requestedEmployeeId === session.user.id) {
        employeeId = session.user.id
      } else {
        if (!hasPermission(session, PERMISSIONS.LEAVE_APPROVE)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        employeeId = requestedEmployeeId
      }

      const balances = await db.leaveBalance.findMany({
        where: { employeeId, year },
        include: {
          leaveType: true,
        },
        orderBy: { leaveType: { name: "asc" } },
      })

      return NextResponse.json({ data: balances })
    } catch (error) {
      console.error("[LEAVE_BALANCES_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const POST = withAuth(
  PERMISSIONS.LEAVE_APPROVE,
  async (req: NextRequest, _ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const body = await req.json()
      const { employeeId, leaveTypeId, year, allocated, carried } = body

      if (!employeeId || !leaveTypeId || !year) {
        return NextResponse.json(
          { error: "employeeId, leaveTypeId, and year are required" },
          { status: 400 }
        )
      }

      // Verify employee and leave type exist
      const [employee, leaveType] = await Promise.all([
        db.employee.findUnique({ where: { id: employeeId } }),
        db.leaveType.findUnique({ where: { id: leaveTypeId } }),
      ])

      if (!employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 })
      }
      if (!leaveType) {
        return NextResponse.json({ error: "Leave type not found" }, { status: 404 })
      }

      const balance = await db.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId,
            leaveTypeId,
            year: Number(year),
          },
        },
        update: {
          allocated: Number(allocated ?? 0),
          carried: Number(carried ?? 0),
        },
        create: {
          employeeId,
          leaveTypeId,
          year: Number(year),
          allocated: Number(allocated ?? 0),
          used: 0,
          pending: 0,
          carried: Number(carried ?? 0),
        },
        include: { leaveType: true },
      })

      await db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "ALLOCATE",
          module: "leave",
          entityType: "LeaveBalance",
          entityId: balance.id,
          changes: { employeeId, leaveTypeId, year, allocated, carried },
        },
      })

      return NextResponse.json({ data: balance }, { status: 201 })
    } catch (error) {
      console.error("[LEAVE_BALANCES_POST]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

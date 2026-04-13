import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, withSession } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

export const GET = withSession(
  async (_req: NextRequest, _ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const types = await db.leaveType.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      })
      return NextResponse.json({ data: types })
    } catch (error) {
      console.error("[LEAVE_TYPES_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const POST = withAuth(
  PERMISSIONS.LEAVE_APPROVE,
  async (req: NextRequest, _ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const body = await req.json()
      const {
        name,
        code,
        description,
        isPaid,
        maxDaysPerYear,
        carryForward,
        maxCarryDays,
        requiresApproval,
      } = body

      if (!name || !code) {
        return NextResponse.json({ error: "Name and code are required" }, { status: 400 })
      }

      const leaveType = await db.leaveType.create({
        data: {
          name: String(name).trim(),
          code: String(code).trim().toUpperCase(),
          description: description ? String(description).trim() : null,
          isPaid: Boolean(isPaid ?? true),
          maxDaysPerYear: Number(maxDaysPerYear ?? 0),
          carryForward: Boolean(carryForward ?? false),
          maxCarryDays: Number(maxCarryDays ?? 0),
          requiresApproval: Boolean(requiresApproval ?? true),
          isActive: true,
        },
      })

      await db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "CREATE",
          module: "leave",
          entityType: "LeaveType",
          entityId: leaveType.id,
        },
      })

      return NextResponse.json({ data: leaveType }, { status: 201 })
    } catch (error: unknown) {
      console.error("[LEAVE_TYPES_POST]", error)
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { error: "A leave type with that name or code already exists" },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

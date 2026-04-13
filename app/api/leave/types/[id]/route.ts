import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

export const PATCH = withAuth(
  PERMISSIONS.LEAVE_APPROVE,
  async (req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id } = ctx.params
      const body = await req.json()

      const existing = await db.leaveType.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: "Leave type not found" }, { status: 404 })
      }

      const updateData: Record<string, unknown> = {}
      if (body.name !== undefined) updateData.name = String(body.name).trim()
      if (body.code !== undefined) updateData.code = String(body.code).trim().toUpperCase()
      if (body.description !== undefined) updateData.description = body.description ? String(body.description).trim() : null
      if (body.isPaid !== undefined) updateData.isPaid = Boolean(body.isPaid)
      if (body.maxDaysPerYear !== undefined) updateData.maxDaysPerYear = Number(body.maxDaysPerYear)
      if (body.carryForward !== undefined) updateData.carryForward = Boolean(body.carryForward)
      if (body.maxCarryDays !== undefined) updateData.maxCarryDays = Number(body.maxCarryDays)
      if (body.requiresApproval !== undefined) updateData.requiresApproval = Boolean(body.requiresApproval)
      if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive)

      const leaveType = await db.leaveType.update({
        where: { id },
        data: updateData,
      })

      await db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "UPDATE",
          module: "leave",
          entityType: "LeaveType",
          entityId: id,
          changes: updateData as object,
        },
      })

      return NextResponse.json({ data: leaveType })
    } catch (error: unknown) {
      console.error("[LEAVE_TYPE_PATCH]", error)
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

export const DELETE = withAuth(
  PERMISSIONS.LEAVE_APPROVE,
  async (_req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id } = ctx.params

      const existing = await db.leaveType.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: "Leave type not found" }, { status: 404 })
      }

      await db.leaveType.update({
        where: { id },
        data: { isActive: false },
      })

      await db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "DELETE",
          module: "leave",
          entityType: "LeaveType",
          entityId: id,
          changes: { softDeleted: true },
        },
      })

      return NextResponse.json({ message: "Leave type deactivated successfully" })
    } catch (error) {
      console.error("[LEAVE_TYPE_DELETE]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

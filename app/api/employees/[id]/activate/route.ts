import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import { createAuditLog } from "@/lib/audit"
import type { Session } from "next-auth"

/**
 * POST /api/employees/[id]/activate
 * Marks the employee as active again (isActive=true, status=ACTIVE).
 * Requires `employee:write`.
 */
export const POST = withAuth(
  PERMISSIONS.EMPLOYEE_WRITE,
  async (req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id } = ctx.params

      const existing = await db.employee.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 })
      }

      const employee = await db.employee.update({
        where: { id },
        data: { isActive: true, status: "ACTIVE" },
        include: {
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, title: true } },
        },
      })

      await createAuditLog(session, {
        action: "ACTIVATE",
        module: "employee",
        entityType: "Employee",
        entityId: id,
        changes: { previousStatus: existing.status, previousIsActive: existing.isActive },
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      })

      return NextResponse.json({ data: employee })
    } catch (error) {
      console.error("[EMPLOYEE_ACTIVATE]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

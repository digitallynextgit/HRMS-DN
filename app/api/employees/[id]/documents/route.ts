import { NextRequest, NextResponse } from "next/server"
import { withSession, hasPermission } from "@/lib/permissions"
import { db } from "@/lib/db"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

export const GET = withSession(
  async (req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id } = ctx.params

      // Allow access if the user has document:read OR is the employee themselves
      const canRead = hasPermission(session, PERMISSIONS.DOCUMENT_READ)
      const isSelf = session.user.id === id

      if (!canRead && !isSelf) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const documents = await db.document.findMany({
        where: { employeeId: id },
        orderBy: { createdAt: "desc" },
      })

      return NextResponse.json({ data: documents })
    } catch (error) {
      console.error("[employees/[id]/documents] GET error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

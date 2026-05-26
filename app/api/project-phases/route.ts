import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, withSession } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

// GET /api/project-phases — anyone signed in can read
export const GET = withSession(async (_req: NextRequest, _ctx: unknown, _session: Session) => {
  try {
    const phases = await db.projectPhase.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    })
    return NextResponse.json({ data: phases })
  } catch (error) {
    console.error("[PROJECT_PHASES_GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

// POST /api/project-phases — admin only
export const POST = withAuth(
  PERMISSIONS.PROJECT_WRITE,
  async (req: NextRequest, _ctx: unknown, session: Session) => {
    try {
      const body = await req.json()
      const { name, description, displayOrder } = body

      if (!name || !name.trim()) {
        return NextResponse.json({ error: "Phase name is required" }, { status: 400 })
      }

      // Duplicate check (case-insensitive via unique constraint on name)
      const dupe = await db.projectPhase.findUnique({ where: { name: name.trim() } })
      if (dupe) {
        return NextResponse.json({ error: `A phase named "${name.trim()}" already exists` }, { status: 409 })
      }

      // Default displayOrder to max + 1 if not provided
      let order = Number(displayOrder)
      if (isNaN(order)) {
        const last = await db.projectPhase.findFirst({ orderBy: { displayOrder: "desc" } })
        order = (last?.displayOrder ?? 0) + 1
      }

      const phase = await db.projectPhase.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          displayOrder: order,
        },
      })

      await db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "CREATE",
          module: "project",
          entityType: "ProjectPhase",
          entityId: phase.id,
          changes: { name: phase.name, description: phase.description, displayOrder: phase.displayOrder },
        },
      })

      return NextResponse.json({ data: phase }, { status: 201 })
    } catch (error) {
      console.error("[PROJECT_PHASES_POST]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, withSession } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

export const GET = withSession(async (_req: NextRequest, ctx: { params: Record<string, string> }, _session: Session) => {
  try {
    const project = await db.project.findUnique({
      where: { id: ctx.params.id },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
        members: {
          include: { employee: { select: { id: true, firstName: true, lastName: true, profilePhoto: true, designation: { select: { title: true } } } } },
        },
        tasks: {
          orderBy: { createdAt: "desc" },
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
          },
        },
        _count: { select: { tasks: true, timesheets: true } },
      },
    })

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    return NextResponse.json({ data: project })
  } catch (error) {
    console.error("[PROJECT_GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const PATCH = withAuth(
  PERMISSIONS.PROJECT_WRITE,
  async (req: NextRequest, ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const body = await req.json()
      const { name, description, status, priority, startDate, endDate, budget, isArchived } = body

      const project = await db.project.update({
        where: { id: ctx.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(status !== undefined && { status }),
          ...(priority !== undefined && { priority }),
          ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
          ...(budget !== undefined && { budget: budget ? parseFloat(budget) : null }),
          ...(isArchived !== undefined && { isArchived }),
        },
      })

      return NextResponse.json({ data: project })
    } catch (error) {
      console.error("[PROJECT_PATCH]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const DELETE = withAuth(
  PERMISSIONS.PROJECT_DELETE,
  async (_req: NextRequest, ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      await db.project.delete({ where: { id: ctx.params.id } })
      return NextResponse.json({ message: "Project deleted" })
    } catch (error) {
      console.error("[PROJECT_DELETE]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

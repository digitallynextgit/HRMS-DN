import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession } from "@/lib/permissions"
import type { Session } from "next-auth"

export const PATCH = withSession(async (req: NextRequest, ctx: { params: Record<string, string> }, _session: Session) => {
  try {
    const body = await req.json()
    const { title, description, status, priority, assigneeId, startDate, dueDate, estimatedHours, loggedHours, tags } = body

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (status !== undefined) {
      data.status = status
      if (status === "DONE") data.completedAt = new Date()
      else if (data.completedAt !== undefined) data.completedAt = null
    }
    if (priority !== undefined) data.priority = priority
    if (assigneeId !== undefined) data.assigneeId = assigneeId ?? null
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (estimatedHours !== undefined) data.estimatedHours = estimatedHours ? parseFloat(estimatedHours) : null
    if (loggedHours !== undefined) data.loggedHours = parseFloat(loggedHours)
    if (tags !== undefined) data.tags = tags

    const task = await db.projectTask.update({
      where: { id: ctx.params.id },
      data,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
      },
    })

    return NextResponse.json({ data: task })
  } catch (error) {
    console.error("[TASK_PATCH]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const DELETE = withSession(async (_req: NextRequest, ctx: { params: Record<string, string> }, _session: Session) => {
  try {
    await db.projectTask.delete({ where: { id: ctx.params.id } })
    return NextResponse.json({ message: "Task deleted" })
  } catch (error) {
    console.error("[TASK_DELETE]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

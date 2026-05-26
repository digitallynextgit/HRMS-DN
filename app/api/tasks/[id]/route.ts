import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession, hasPermission } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

// Permission helper: returns roles for the current user against a task
async function getTaskAuthContext(taskId: string, userId: string) {
  const task = await db.projectTask.findUnique({
    where: { id: taskId },
    include: {
      team: { select: { id: true, managerId: true, projectId: true } },
    },
  })
  if (!task) return null
  return {
    task,
    isAssignee: task.assigneeId === userId,
    isManager: task.team?.managerId === userId,
  }
}

export const PATCH = withSession(
  async (req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const body = await req.json()
      const {
        title,
        description,
        status,
        priority,
        assigneeId,
        startDate,
        dueDate,
        estimatedHours,
        loggedHours,
        tags,
      } = body

      const auth = await getTaskAuthContext(ctx.params.id, session.user.id)
      if (!auth) return NextResponse.json({ error: "Task not found" }, { status: 404 })

      const isAdmin = hasPermission(session, PERMISSIONS.PROJECT_WRITE)

      // Only assignee, manager, or admin may modify
      if (!auth.isAssignee && !auth.isManager && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      // Members can only change status of their own tasks; everything else needs manager
      const isStructuralChange =
        title !== undefined ||
        description !== undefined ||
        priority !== undefined ||
        assigneeId !== undefined ||
        startDate !== undefined ||
        dueDate !== undefined ||
        estimatedHours !== undefined ||
        tags !== undefined
      if (isStructuralChange && !auth.isManager && !isAdmin) {
        return NextResponse.json(
          { error: "Only the team manager can edit task details. You can update status only." },
          { status: 403 }
        )
      }

      const data: Record<string, unknown> = {}
      if (title !== undefined) data.title = title
      if (description !== undefined) data.description = description
      if (status !== undefined) {
        data.status = status
        if (status === "DONE") data.completedAt = new Date()
        else data.completedAt = null
      }
      if (priority !== undefined) data.priority = priority
      if (assigneeId !== undefined) data.assigneeId = assigneeId ?? null
      if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
      if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
      if (estimatedHours !== undefined)
        data.estimatedHours = estimatedHours ? parseFloat(estimatedHours) : null
      if (loggedHours !== undefined) data.loggedHours = parseFloat(loggedHours)
      if (tags !== undefined) data.tags = tags

      const task = await db.projectTask.update({
        where: { id: ctx.params.id },
        data,
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
        },
      })

      await db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "UPDATE",
          module: "project",
          entityType: "ProjectTask",
          entityId: ctx.params.id,
          changes: data as object,
        },
      })

      return NextResponse.json({ data: task })
    } catch (error) {
      console.error("[TASK_PATCH]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

export const DELETE = withSession(
  async (_req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const auth = await getTaskAuthContext(ctx.params.id, session.user.id)
      if (!auth) return NextResponse.json({ error: "Task not found" }, { status: 404 })

      const isAdmin = hasPermission(session, PERMISSIONS.PROJECT_WRITE)
      if (!auth.isManager && !isAdmin) {
        return NextResponse.json({ error: "Only the team manager can delete tasks" }, { status: 403 })
      }

      await db.projectTask.delete({ where: { id: ctx.params.id } })

      await db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "DELETE",
          module: "project",
          entityType: "ProjectTask",
          entityId: ctx.params.id,
          changes: { title: auth.task.title },
        },
      })

      return NextResponse.json({ message: "Task deleted" })
    } catch (error) {
      console.error("[TASK_DELETE]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, withSession } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

export const GET = withSession(async (req: NextRequest, _ctx: unknown, session: Session) => {
  try {
    const { searchParams } = req.nextUrl
    const status = searchParams.get("status") ?? undefined
    const mine = searchParams.get("mine") === "true"
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = parseInt(searchParams.get("limit") ?? "20")
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { isArchived: false }
    if (status) where.status = status
    if (mine) {
      where.OR = [
        { ownerId: session.user.id },
        { members: { some: { employeeId: session.user.id } } },
      ]
    }

    const [projects, total] = await Promise.all([
      db.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
          members: {
            include: {
              employee: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
            },
          },
          _count: { select: { tasks: true } },
        },
      }),
      db.project.count({ where }),
    ])

    return NextResponse.json({
      data: projects,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("[PROJECTS_GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const POST = withAuth(
  PERMISSIONS.PROJECT_WRITE,
  async (req: NextRequest, _ctx: unknown, session: Session) => {
    try {
      const body = await req.json()
      const { name, description, code, status, priority, startDate, endDate, budget, memberIds } = body

      const project = await db.project.create({
        data: {
          name,
          description,
          code: code.toUpperCase(),
          status: status ?? "PLANNING",
          priority: priority ?? "MEDIUM",
          ownerId: session.user.id,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          budget: budget ? parseFloat(budget) : null,
          members: memberIds?.length
            ? {
                create: [
                  { employeeId: session.user.id, role: "OWNER" },
                  ...memberIds
                    .filter((id: string) => id !== session.user.id)
                    .map((id: string) => ({ employeeId: id, role: "MEMBER" })),
                ],
              }
            : { create: [{ employeeId: session.user.id, role: "OWNER" }] },
        },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true } },
          members: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
        },
      })

      return NextResponse.json({ data: project }, { status: 201 })
    } catch (error) {
      console.error("[PROJECTS_POST]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession } from "@/lib/permissions"
import type { Session } from "next-auth"

export const GET = withSession(async (_req: NextRequest, ctx: { params: Record<string, string> }, _session: Session) => {
  try {
    const job = await db.jobPosting.findUnique({
      where: { id: ctx.params.id },
      include: {
        department: { select: { name: true } },
        postedBy: { select: { firstName: true, lastName: true } },
        applicants: {
          orderBy: { createdAt: "desc" },
          include: {
            interviews: { orderBy: { scheduledAt: "asc" } },
          },
        },
      },
    })
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ data: job })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const PATCH = withSession(async (req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
  try {
    const body = await req.json()
    const job = await db.jobPosting.update({
      where: { id: ctx.params.id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.departmentId !== undefined && { departmentId: body.departmentId || null }),
        ...(body.location !== undefined && { location: body.location || null }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.salaryMin !== undefined && { salaryMin: body.salaryMin ? parseFloat(body.salaryMin) : null }),
        ...(body.salaryMax !== undefined && { salaryMax: body.salaryMax ? parseFloat(body.salaryMax) : null }),
        ...(body.closingDate !== undefined && { closingDate: body.closingDate ? new Date(body.closingDate) : null }),
        ...(body.status !== undefined && { status: body.status as never }),
      },
    })
    return NextResponse.json({ data: job })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const DELETE = withSession(async (_req: NextRequest, ctx: { params: Record<string, string> }, _session: Session) => {
  try {
    await db.jobPosting.delete({ where: { id: ctx.params.id } })
    return NextResponse.json({ message: "Job posting deleted" })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

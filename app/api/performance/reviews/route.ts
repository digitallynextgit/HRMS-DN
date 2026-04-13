import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession } from "@/lib/permissions"
import type { Session } from "next-auth"

export const GET = withSession(async (req: NextRequest, _ctx: unknown, session: Session) => {
  try {
    const { searchParams } = req.nextUrl
    const cycleId = searchParams.get("cycleId") ?? undefined
    const mine = searchParams.get("mine") === "true"
    const asReviewer = searchParams.get("asReviewer") === "true"

    const where: Record<string, unknown> = {}
    if (cycleId) where.cycleId = cycleId
    if (mine) where.revieweeId = session.user.id
    if (asReviewer) where.reviewerId = session.user.id

    const reviews = await db.performanceReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        cycle: true,
        reviewee: { select: { id: true, firstName: true, lastName: true, employeeNo: true, profilePhoto: true, department: { select: { name: true } }, designation: { select: { title: true } } } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({ data: reviews })
  } catch (error) {
    console.error("[REVIEWS_GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

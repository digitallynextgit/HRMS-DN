import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession } from "@/lib/permissions"
import { randomUUID } from "crypto"
import type { Session } from "next-auth"

export const POST = withSession(async (_req: NextRequest, _ctx: unknown, session: Session) => {
  try {
    // Expire old sessions
    await db.qrSession.deleteMany({ where: { expiresAt: { lt: new Date() } } })

    // Create new session — expires in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    const session_ = await db.qrSession.create({
      data: {
        token: randomUUID(),
        expiresAt,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({ data: { token: session_.token, expiresAt: session_.expiresAt } })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

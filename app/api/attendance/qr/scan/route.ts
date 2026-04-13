import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession } from "@/lib/permissions"
import type { Session } from "next-auth"

export const POST = withSession(async (req: NextRequest, _ctx: unknown, session: Session) => {
  try {
    const { token, type } = await req.json() // type: "IN" | "OUT"

    if (!token || !type) {
      return NextResponse.json({ error: "token and type are required" }, { status: 400 })
    }

    // Validate QR session
    const qrSession = await db.qrSession.findUnique({ where: { token } })
    if (!qrSession || qrSession.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired QR code" }, { status: 400 })
    }

    // Upsert attendance log
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const existing = await db.attendanceLog.findFirst({
      where: { employeeId: session.user.id, date: today },
    })

    if (type === "IN") {
      if (!existing) {
        await db.attendanceLog.create({
          data: {
            employeeId: session.user.id,
            date: today,
            checkIn: new Date(),
            source: "QR",
            status: "PRESENT" as never,
          },
        })
      }
    } else if (type === "OUT" && existing) {
      await db.attendanceLog.update({
        where: { id: existing.id },
        data: { checkOut: new Date() },
      })
    }

    const employee = await db.employee.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true },
    })

    return NextResponse.json({
      message: `${type === "IN" ? "Checked in" : "Checked out"} successfully`,
      employee: employee ? `${employee.firstName} ${employee.lastName}` : undefined,
      time: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

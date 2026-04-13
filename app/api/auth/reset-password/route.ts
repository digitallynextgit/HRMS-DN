import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export const POST = async (req: NextRequest) => {
  try {
    const { token, password } = await req.json()
    if (!token || !password) return NextResponse.json({ error: "Token and password are required" }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })

    const reset = await db.passwordReset.findUnique({ where: { token } })
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)

    await db.$transaction([
      db.employee.update({ where: { id: reset.employeeId }, data: { passwordHash: hashed } }),
      db.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ])

    return NextResponse.json({ message: "Password reset successfully" })
  } catch (error) {
    console.error("[RESET_PASSWORD]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession } from "@/lib/permissions"
import bcrypt from "bcryptjs"
import type { Session } from "next-auth"

export const GET = withSession(async (_req: NextRequest, _ctx: unknown, session: Session) => {
  try {
    const employee = await db.employee.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        employeeNo: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        currentAddress: true,
        dateOfBirth: true,
        profilePhoto: true,
        emergencyContact: true,
        department: { select: { name: true } },
        designation: { select: { title: true } },
        status: true,
        dateOfJoining: true,
      },
    })
    if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ data: employee })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const PATCH = withSession(async (req: NextRequest, _ctx: unknown, session: Session) => {
  try {
    const body = await req.json()

    // Allow only self-service fields
    const data: Record<string, unknown> = {}
    if (body.phone !== undefined) data.phone = body.phone || null
    if (body.currentAddress !== undefined) data.currentAddress = body.currentAddress || null
    if (body.emergencyContact !== undefined) data.emergencyContact = body.emergencyContact || null

    // Password change
    if (body.currentPassword && body.newPassword) {
      const employee = await db.employee.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } })
      if (!employee?.passwordHash) return NextResponse.json({ error: "Cannot change password for this account" }, { status: 400 })
      const valid = await bcrypt.compare(body.currentPassword, employee.passwordHash)
      if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      if (body.newPassword.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
      data.passwordHash = await bcrypt.hash(body.newPassword, 12)
    }

    const updated = await db.employee.update({
      where: { id: session.user.id },
      data,
      select: { id: true, phone: true, currentAddress: true, emergencyContact: true },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

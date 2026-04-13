import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/mailer"
import { randomUUID } from "crypto"

export const POST = async (req: NextRequest) => {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const employee = await db.employee.findUnique({ where: { email: email.toLowerCase().trim() } })

    // Always return success to prevent user enumeration
    if (!employee) return NextResponse.json({ message: "If that email exists, a reset link has been sent." })

    // Expire old tokens
    await db.passwordReset.deleteMany({ where: { employeeId: employee.id } })

    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.passwordReset.create({
      data: { employeeId: employee.id, token, expiresAt },
    })

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
    const firstName = employee.firstName

    await sendEmail({
      to: employee.email,
      subject: "Reset your HRMS password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Password Reset Request</h2>
          <p>Hi ${firstName},</p>
          <p>We received a request to reset your HRMS password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">If the button doesn't work, copy and paste this URL into your browser:<br/>${resetUrl}</p>
        </div>
      `,
      text: `Hi ${firstName},\n\nReset your HRMS password by visiting:\n${resetUrl}\n\nThis link expires in 1 hour.`,
    })

    return NextResponse.json({ message: "If that email exists, a reset link has been sent." })
  } catch (error) {
    console.error("[FORGOT_PASSWORD]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

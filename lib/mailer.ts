import nodemailer from "nodemailer"
import type { EmailTemplate } from "@prisma/client"
import { db } from "@/lib/db"
import { tryDecrypt } from "@/lib/crypto"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>
  replyTo?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "HRMS <noreply@company.com>",
    to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    attachments: options.attachments,
    replyTo: options.replyTo,
  })
}

/**
 * Sends an email impersonating the given employee, using their stored Gmail App Password.
 * Falls back to the system mailer (sendEmail) if the employee has no App Password set.
 *
 * Use for emails that should appear to come from a specific person — e.g. a manager
 * approving a leave, a recruiter sending a stage-change message. System-level mail
 * (password resets, birthdays) should keep using sendEmail.
 */
export async function sendEmailAs(
  employeeId: string,
  options: SendEmailOptions,
): Promise<void> {
  const emp = await db.employee.findUnique({
    where: { id: employeeId },
    select: { email: true, firstName: true, lastName: true, gmailAppPassword: true },
  })

  // No employee or no App Password on file → fall back to the shared system mailer.
  if (!emp?.gmailAppPassword) {
    await sendEmail(options)
    return
  }

  const password = tryDecrypt(emp.gmailAppPassword)
  if (!password) {
    console.error("[sendEmailAs] Failed to decrypt App Password for", employeeId, "— falling back to system mailer")
    await sendEmail(options)
    return
  }

  // Build a one-off transporter for this employee, send, discard.
  const perUser = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: emp.email, pass: password },
  })

  const fromName = `${emp.firstName} ${emp.lastName}`.trim() || emp.email

  try {
    await perUser.sendMail({
      from: `"${fromName}" <${emp.email}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
      replyTo: options.replyTo,
    })
  } finally {
    perUser.close()
  }
}

export function renderTemplate(
  template: Pick<EmailTemplate, "subject" | "bodyHtml">,
  data: Record<string, string>,
): { subject: string; html: string } {
  let subject = template.subject
  let html = template.bodyHtml

  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g")
    subject = subject.replace(regex, value)
    html = html.replace(regex, value)
  }

  return { subject, html }
}

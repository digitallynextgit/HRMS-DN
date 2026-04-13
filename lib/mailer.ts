import nodemailer from "nodemailer"
import type { EmailTemplate } from "@prisma/client"

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
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "HRMS <noreply@company.com>",
    to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    attachments: options.attachments,
  })
}

export function renderTemplate(
  template: Pick<EmailTemplate, "subject" | "bodyHtml">,
  data: Record<string, string>
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

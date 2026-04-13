/**
 * BullMQ Email Worker + Daily Cron Jobs
 *
 * Run alongside the Next.js app:
 *   pnpm worker          (dev — tsx watch)
 *   pnpm worker:prod     (prod — compiled node)
 *
 * This process:
 *  1. Consumes jobs from the "email" BullMQ queue and sends via Nodemailer
 *  2. Runs daily cron jobs (birthday emails at 9 AM every day)
 */
import { Worker } from "bullmq"
import { redisConnection } from "./lib/queue"
import { sendEmail } from "./lib/mailer"
import { db } from "./lib/db"
import type { EmailJobData } from "./lib/queue"

const emailWorker = new Worker<EmailJobData>(
  "email",
  async (job) => {
    const { to, subject, html, text, logId } = job.data
    console.log(`[worker] Processing job ${job.id} → ${to}`)

    try {
      await sendEmail({ to, subject, html, text })

      if (logId) {
        await db.emailLog.update({
          where: { id: logId },
          data: { status: "sent", sentAt: new Date() },
        })
      }
      console.log(`[worker] Email sent to ${to}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[worker] Failed to send email to ${to}: ${message}`)

      if (logId) {
        await db.emailLog.update({
          where: { id: logId },
          data: { status: "failed", error: message },
        })
      }
      // Re-throw so BullMQ applies its retry/backoff policy.
      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
)

emailWorker.on("completed", (job) => {
  console.log(`[worker] Job ${job.id} completed`)
})

emailWorker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed: ${err.message}`)
})

emailWorker.on("error", (err) => {
  console.error("[worker] Worker error:", err)
})

console.log("[worker] Email worker started — waiting for jobs...")

// ─── Daily Birthday Emails (runs at 09:00 every day) ────────────────────────
function scheduleDailyAt(hour: number, minute: number, task: () => Promise<void>) {
  function runNext() {
    const now = new Date()
    const next = new Date()
    next.setHours(hour, minute, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    const delay = next.getTime() - now.getTime()
    setTimeout(async () => {
      try { await task() } catch (e) { console.error("[cron]", e) }
      runNext()
    }, delay)
  }
  runNext()
}

async function sendBirthdayEmails() {
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()
  console.log(`[cron] Running birthday check for ${day}/${month}`)

  const employees = await db.employee.findMany({
    where: { status: "ACTIVE", dateOfBirth: { not: null } },
    select: { firstName: true, email: true, dateOfBirth: true },
  })

  const birthdays = employees.filter((e) => {
    if (!e.dateOfBirth) return false
    const d = new Date(e.dateOfBirth)
    return d.getMonth() + 1 === month && d.getDate() === day
  })

  for (const emp of birthdays) {
    await sendEmail({
      to: emp.email,
      subject: `Happy Birthday, ${emp.firstName}! 🎂`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;text-align:center;">
          <div style="font-size:64px;margin:24px 0;">🎂</div>
          <h2 style="color:#7c3aed;">Happy Birthday, ${emp.firstName}!</h2>
          <p style="font-size:16px;color:#444;">Wishing you a wonderful birthday filled with joy and happiness.<br/>Thank you for being an amazing part of our team!</p>
          <p style="color:#888;font-size:13px;margin-top:32px;">— The HR Team</p>
        </div>
      `,
      text: `Happy Birthday, ${emp.firstName}! Wishing you a wonderful day. — The HR Team`,
    }).catch((e) => console.error(`[cron] Birthday email failed for ${emp.email}:`, e))
    console.log(`[cron] Birthday email sent to ${emp.email}`)
  }

  console.log(`[cron] Birthday check done — ${birthdays.length} email(s) sent`)
}

scheduleDailyAt(9, 0, sendBirthdayEmails)

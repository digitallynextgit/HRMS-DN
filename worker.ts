/**
 * This file is no longer used.
 *
 * Email sending is now done directly in-process (no Redis/BullMQ queue).
 * Birthday emails are handled by the API cron route:
 *   GET /api/cron/birthdays  (protected by CRON_SECRET env var)
 *
 * To trigger birthday emails daily, point any free cron scheduler
 * (e.g. cron-job.org) at:
 *   https://your-domain.com/api/cron/birthdays
 *   Header: Authorization: Bearer <CRON_SECRET>
 */

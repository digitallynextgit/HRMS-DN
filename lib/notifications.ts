import { db } from "@/lib/db"

type NotificationType = "info" | "success" | "warning" | "error"

interface CreateNotificationOptions {
  employeeId: string
  title: string
  message: string
  type?: NotificationType
  link?: string
}

/**
 * Creates a single in-app notification for an employee.
 * Always non-blocking — errors are swallowed so the caller's main operation
 * is never disrupted by a notification failure.
 */
export async function createNotification(opts: CreateNotificationOptions): Promise<void> {
  try {
    await db.notification.create({
      data: {
        employeeId: opts.employeeId,
        title: opts.title,
        message: opts.message,
        type: opts.type ?? "info",
        link: opts.link ?? null,
      },
    })
  } catch (err) {
    console.error("[createNotification] failed:", err)
  }
}

/**
 * Creates in-app notifications for multiple employees at once.
 */
export async function createNotifications(
  notifications: CreateNotificationOptions[]
): Promise<void> {
  try {
    await db.notification.createMany({
      data: notifications.map((n) => ({
        employeeId: n.employeeId,
        title: n.title,
        message: n.message,
        type: n.type ?? "info",
        link: n.link ?? null,
      })),
    })
  } catch (err) {
    console.error("[createNotifications] failed:", err)
  }
}

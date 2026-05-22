import type { Session } from "next-auth"
import { db } from "@/lib/db"
import { SYSTEM_ROLES } from "@/lib/constants"

interface AuditLogInput {
  action: string
  module: string
  entityType?: string
  entityId?: string
  changes?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Write an audit log entry.
 *
 * Actions performed by a super_admin (the CEO role) are intentionally NOT
 * recorded — that account is invisible to the system. Pass the session of the
 * actor; if it carries the super_admin role the call returns silently.
 */
export async function createAuditLog(session: Session | null, input: AuditLogInput): Promise<void> {
  if (session?.user?.roles?.includes(SYSTEM_ROLES.SUPER_ADMIN)) return

  await db.auditLog.create({
    data: {
      actorId: session?.user?.id ?? null,
      action: input.action,
      module: input.module,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      changes: (input.changes as never) ?? undefined,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  })
}

/** Returns true when the given session represents a super_admin account. */
export function isSuperAdminSession(session: Session | null): boolean {
  return !!session?.user?.roles?.includes(SYSTEM_ROLES.SUPER_ADMIN)
}

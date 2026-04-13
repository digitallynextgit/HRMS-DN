import { NextRequest, NextResponse } from "next/server"
import { withAuth, withSession, hasPermission } from "@/lib/permissions"
import { getSignedUrl, deleteFile } from "@/lib/storage"
import { db } from "@/lib/db"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

// GET — return pre-signed download URL for the document
export const GET = withSession(
  async (req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id } = ctx.params

      const document = await db.document.findUnique({
        where: { id },
      })

      if (!document) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 })
      }

      // Access check
      if (document.employeeId !== null) {
        const canRead = hasPermission(session, PERMISSIONS.DOCUMENT_READ)
        const isOwner = session.user.id === document.employeeId
        if (!canRead && !isOwner) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
      } else {
        // Company document — requires document:read
        if (!hasPermission(session, PERMISSIONS.DOCUMENT_READ)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
      }

      const url = await getSignedUrl(document.objectKey, 900) // 15 min

      return NextResponse.json({ data: { url, document } })
    } catch (error) {
      console.error("[documents/[id]] GET error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

// DELETE — remove from MinIO and DB
export const DELETE = withAuth(
  PERMISSIONS.DOCUMENT_DELETE,
  async (req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id } = ctx.params

      const document = await db.document.findUnique({
        where: { id },
      })

      if (!document) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 })
      }

      await deleteFile(document.objectKey)

      await db.document.delete({ where: { id } })

      await db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "document.delete",
          module: "document",
          entityType: "Document",
          entityId: id,
          changes: {
            title: document.title,
            fileName: document.fileName,
            category: document.category,
            employeeId: document.employeeId,
          },
          ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
          userAgent: req.headers.get("user-agent") ?? undefined,
        },
      })

      return NextResponse.json({ data: { success: true } })
    } catch (error) {
      console.error("[documents/[id]] DELETE error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

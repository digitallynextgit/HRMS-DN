import { NextRequest, NextResponse } from "next/server"
import { withSession, hasPermission } from "@/lib/permissions"
import { db } from "@/lib/db"
import { deleteFile, getSignedUrl } from "@/lib/storage"
import { PERMISSIONS } from "@/lib/constants"
import { createAuditLog } from "@/lib/audit"
import type { Session } from "next-auth"

/**
 * GET /api/employees/[id]/documents/[docId]
 * Returns a short-lived signed URL for downloading the file.
 */
export const GET = withSession(
  async (_req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id: employeeId, docId } = ctx.params
      const canRead = hasPermission(session, PERMISSIONS.DOCUMENT_READ)
      const isSelf = session.user.id === employeeId
      if (!canRead && !isSelf) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const document = await db.employeeDocument.findFirst({
        where: { id: docId, employeeId },
      })
      if (!document) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 })
      }

      const url = await getSignedUrl(document.objectKey)
      return NextResponse.json({ data: { ...document, url } })
    } catch (error) {
      console.error("[employees/[id]/documents/[docId]] GET error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

/**
 * DELETE /api/employees/[id]/documents/[docId]
 * Removes the EmployeeDocument row and its underlying object.
 * Requires document:delete.
 */
export const DELETE = withSession(
  async (req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id: employeeId, docId } = ctx.params
      if (!hasPermission(session, PERMISSIONS.DOCUMENT_DELETE)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const document = await db.employeeDocument.findFirst({
        where: { id: docId, employeeId },
      })
      if (!document) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 })
      }

      await deleteFile(document.objectKey).catch((err) =>
        console.error("[employee-document] storage delete failed:", err),
      )

      await db.employeeDocument.delete({ where: { id: docId } })

      await createAuditLog(session, {
        action: "employee_document.delete",
        module: "document",
        entityType: "EmployeeDocument",
        entityId: docId,
        changes: { employeeId, title: document.title, fileName: document.fileName },
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      })

      return NextResponse.json({ data: { id: docId } })
    } catch (error) {
      console.error("[employees/[id]/documents/[docId]] DELETE error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

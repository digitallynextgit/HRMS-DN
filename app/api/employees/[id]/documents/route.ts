import { NextRequest, NextResponse } from "next/server"
import { withSession, hasPermission } from "@/lib/permissions"
import { db } from "@/lib/db"
import { uploadFile, getObjectKey } from "@/lib/storage"
import { PERMISSIONS, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/constants"
import { createAuditLog } from "@/lib/audit"
import type { Session } from "next-auth"
import type { DocumentCategory } from "@prisma/client"

/**
 * GET /api/employees/[id]/documents
 * Returns the personal document list for an employee.
 * Allowed when the caller has document:read OR is viewing their own profile.
 */
export const GET = withSession(
  async (_req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id } = ctx.params
      const canRead = hasPermission(session, PERMISSIONS.DOCUMENT_READ)
      const isSelf = session.user.id === id
      if (!canRead && !isSelf) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const documents = await db.employeeDocument.findMany({
        where: { employeeId: id },
        orderBy: { createdAt: "desc" },
      })

      return NextResponse.json({ data: documents })
    } catch (error) {
      console.error("[employees/[id]/documents] GET error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

/**
 * POST /api/employees/[id]/documents
 * Multipart upload - saves the file to object storage and inserts an
 * EmployeeDocument row pointing at it.
 * Form fields:
 *   file       (required) - the binary
 *   title      (required) - display name
 *   category   (optional, default OTHER) - DocumentCategory
 *   expiresAt  (optional) - ISO date
 */
export const POST = withSession(
  async (req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id: employeeId } = ctx.params
      const canWrite = hasPermission(session, PERMISSIONS.DOCUMENT_WRITE)
      const isSelf = session.user.id === employeeId
      if (!canWrite && !isSelf) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const employee = await db.employee.findUnique({
        where: { id: employeeId },
        select: { id: true },
      })
      if (!employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 })
      }

      const formData = await req.formData()
      const file = formData.get("file") as File | null
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
          { status: 400 },
        )
      }

      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type '${file.type}' is not allowed` },
          { status: 400 },
        )
      }

      const title = (formData.get("title") as string)?.trim()
      if (!title) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 })
      }

      const category = ((formData.get("category") as string) ?? "OTHER") as DocumentCategory
      const expiresAtRaw = formData.get("expiresAt") as string | null

      const docId = crypto.randomUUID()
      const objectKey = getObjectKey(`employee-documents/${employeeId}`, file.name, docId)

      const buffer = Buffer.from(await file.arrayBuffer())
      await uploadFile(objectKey, buffer, file.type, file.size)

      const document = await db.employeeDocument.create({
        data: {
          id: docId,
          employeeId,
          title,
          category,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          objectKey,
          uploadedById: session.user.id,
          expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
        },
      })

      await createAuditLog(session, {
        action: "employee_document.upload",
        module: "document",
        entityType: "EmployeeDocument",
        entityId: document.id,
        changes: {
          employeeId,
          title,
          category,
          fileName: file.name,
          fileSize: file.size,
        },
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      })

      return NextResponse.json({ data: document }, { status: 201 })
    } catch (error) {
      console.error("[employees/[id]/documents] POST error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

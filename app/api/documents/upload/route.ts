import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/permissions"
import { uploadFile, getObjectKey } from "@/lib/storage"
import { db } from "@/lib/db"
import { uploadDocumentSchema } from "@/lib/schemas/document"
import { PERMISSIONS, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/constants"
import type { Session } from "next-auth"

export const POST = withAuth(
  PERMISSIONS.DOCUMENT_WRITE,
  async (req: NextRequest, _ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const formData = await req.formData()

      const file = formData.get("file") as File | null
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
          { status: 400 }
        )
      }

      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type '${file.type}' is not allowed` },
          { status: 400 }
        )
      }

      const rawMeta = {
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || undefined,
        category: (formData.get("category") as string) || "OTHER",
        employeeId: (formData.get("employeeId") as string) || undefined,
        expiresAt: (formData.get("expiresAt") as string) || undefined,
      }

      const metaResult = uploadDocumentSchema.safeParse(rawMeta)
      if (!metaResult.success) {
        return NextResponse.json(
          { error: "Invalid metadata", details: metaResult.error.flatten() },
          { status: 422 }
        )
      }

      const meta = metaResult.data
      const id = crypto.randomUUID()
      const objectKey = getObjectKey(
        `documents/${meta.employeeId || "company"}`,
        file.name,
        id
      )

      const buffer = Buffer.from(await file.arrayBuffer())
      await uploadFile(objectKey, buffer, file.type, file.size)

      const isCompanyDoc = !meta.employeeId

      const document = await db.document.create({
        data: {
          id,
          title: meta.title,
          description: meta.description,
          category: meta.category as any,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          objectKey,
          employeeId: meta.employeeId ?? null,
          uploadedById: session.user.id,
          isCompanyDoc,
          expiresAt: meta.expiresAt ? new Date(meta.expiresAt) : null,
        },
      })

      await db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "document.upload",
          module: "document",
          entityType: "Document",
          entityId: document.id,
          changes: {
            title: document.title,
            category: document.category,
            fileName: document.fileName,
            fileSize: document.fileSize,
            employeeId: document.employeeId,
            isCompanyDoc: document.isCompanyDoc,
          },
          ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
          userAgent: req.headers.get("user-agent") ?? undefined,
        },
      })

      return NextResponse.json({ data: document }, { status: 201 })
    } catch (error) {
      console.error("[documents/upload] POST error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

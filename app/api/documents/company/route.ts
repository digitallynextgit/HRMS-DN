import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/permissions"
import { db } from "@/lib/db"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

export const GET = withAuth(
  PERMISSIONS.DOCUMENT_READ,
  async (req: NextRequest, _ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const { searchParams } = new URL(req.url)
      const category = searchParams.get("category")

      const where: Record<string, unknown> = { isCompanyDoc: true }
      if (category) {
        where.category = category
      }

      const documents = await db.document.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          // Manually include uploader details via a sub-select workaround:
          // Prisma doesn't have a direct relation on uploadedById to Employee,
          // so we use a raw join via a separate query or select strategy.
        },
      })

      // Enrich with uploader names
      const uploaderIds = [...new Set(documents.map((d) => d.uploadedById))]
      const uploaders = await db.employee.findMany({
        where: { id: { in: uploaderIds } },
        select: { id: true, firstName: true, lastName: true },
      })
      const uploaderMap = new Map(
        uploaders.map((u) => [u.id, `${u.firstName} ${u.lastName}`])
      )

      const enriched = documents.map((doc) => ({
        ...doc,
        uploaderName: uploaderMap.get(doc.uploadedById) ?? "Unknown",
      }))

      return NextResponse.json({ data: enriched })
    } catch (error) {
      console.error("[documents/company] GET error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

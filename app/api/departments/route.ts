import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, withSession } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import { z } from "zod"
import type { Session } from "next-auth"

const createDepartmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
})

export const GET = withSession(
  async (_req: NextRequest, _ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const departments = await db.department.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          headId: true,
        },
      })

      return NextResponse.json({ data: departments })
    } catch (error) {
      console.error("[DEPARTMENTS_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const POST = withAuth(
  PERMISSIONS.EMPLOYEE_WRITE,
  async (req: NextRequest, _ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const body = await req.json()
      const parsed = createDepartmentSchema.safeParse(body)

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 422 }
        )
      }

      const department = await db.department.create({
        data: {
          name: parsed.data.name,
          code: parsed.data.code.toUpperCase(),
          description: parsed.data.description || null,
        },
      })

      return NextResponse.json({ data: department }, { status: 201 })
    } catch (error: unknown) {
      console.error("[DEPARTMENTS_POST]", error)
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return NextResponse.json({ error: "Department name or code already exists" }, { status: 409 })
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

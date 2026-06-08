import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, withSession } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import { z } from "zod"
import type { Session } from "next-auth"

const createDesignationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  level: z.number().int().min(1, "Level must be at least 1"),
})

export const GET = withSession(
  async (req: NextRequest, _ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      // Admin page passes ?includeInactive=true to manage deactivated designations too.
      // Default (used by every dropdown) returns only active ones.
      const includeInactive = new URL(req.url).searchParams.get("includeInactive") === "true"

      const designations = await db.designation.findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: { level: "asc" },
        select: {
          id: true,
          title: true,
          level: true,
          isActive: true,
          _count: { select: { employees: true } },
        },
      })

      return NextResponse.json({ data: designations })
    } catch (error) {
      console.error("[DESIGNATIONS_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

export const POST = withAuth(
  PERMISSIONS.EMPLOYEE_WRITE,
  async (req: NextRequest, _ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const body = await req.json()
      const parsed = createDesignationSchema.safeParse(body)

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 422 },
        )
      }

      const designation = await db.designation.create({
        data: {
          title: parsed.data.title,
          level: parsed.data.level,
        },
      })

      return NextResponse.json({ data: designation }, { status: 201 })
    } catch (error: unknown) {
      console.error("[DESIGNATIONS_POST]", error)
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return NextResponse.json({ error: "Designation title already exists" }, { status: 409 })
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

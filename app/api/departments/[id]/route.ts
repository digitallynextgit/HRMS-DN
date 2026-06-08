import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

export const GET = withAuth(
  PERMISSIONS.EMPLOYEE_READ,
  async (_req: NextRequest, ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const dept = await db.department.findUnique({
        where: { id: ctx.params.id },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          headId: true,
          careersTone: true,
          careersJobsLabel: true,
        },
      })
      if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json({ data: dept })
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

export const PATCH = withAuth(
  PERMISSIONS.EMPLOYEE_WRITE,
  async (req: NextRequest, ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const body = await req.json()

      const data: Record<string, string | null | boolean> = {}
      if (body.name !== undefined) data.name = String(body.name)
      if (body.code !== undefined) data.code = String(body.code).toUpperCase()
      if (body.description !== undefined) data.description = body.description || null
      if (body.headId !== undefined) data.headId = body.headId || null
      if (body.isActive !== undefined) data.isActive = !!body.isActive
      if (body.careersTone !== undefined) {
        const tone = body.careersTone
        data.careersTone = tone === "red" || tone === "teal" ? tone : null
      }
      if (body.careersJobsLabel !== undefined) {
        const label = typeof body.careersJobsLabel === "string" ? body.careersJobsLabel.trim() : ""
        data.careersJobsLabel = label.length > 0 ? label : null
      }

      const dept = await db.department.update({
        where: { id: ctx.params.id },
        data,
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          headId: true,
          isActive: true,
          careersTone: true,
          careersJobsLabel: true,
        },
      })

      return NextResponse.json({ data: dept })
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Department name or code already exists" },
          { status: 409 },
        )
      }
      console.error("[DEPARTMENTS_PATCH]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

/**
 * DELETE /api/departments/[id]
 *  Default: soft-deactivate (sets isActive=false) — keeps history, hides from dropdowns.
 *  With `?permanent=true`: hard-deletes. Allowed only if no employees reference it.
 */
export const DELETE = withAuth(
  PERMISSIONS.EMPLOYEE_WRITE,
  async (req: NextRequest, ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const { id } = ctx.params
      const permanent = new URL(req.url).searchParams.get("permanent") === "true"

      const dept = await db.department.findUnique({
        where: { id },
        include: { _count: { select: { employees: true, jobPostings: true } } },
      })
      if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 })

      if (permanent) {
        if (dept._count.employees > 0 || dept._count.jobPostings > 0) {
          return NextResponse.json(
            {
              error: `Cannot permanently delete: ${dept._count.employees} employee(s) and ${dept._count.jobPostings} job posting(s) reference this department. Deactivate instead.`,
            },
            { status: 409 },
          )
        }
        await db.department.delete({ where: { id } })
        return NextResponse.json({ message: "Department deleted permanently" })
      }

      await db.department.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({
        message: `Department deactivated. ${dept._count.employees} employee(s) still assigned.`,
      })
    } catch (error) {
      console.error("[DEPARTMENTS_DELETE]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

export const PATCH = withAuth(
  PERMISSIONS.EMPLOYEE_WRITE,
  async (req: NextRequest, ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const body = await req.json()

      const data: Record<string, string | number | boolean> = {}
      if (body.title !== undefined) data.title = String(body.title).trim()
      if (body.level !== undefined) {
        const lvl = Number(body.level)
        if (!Number.isInteger(lvl) || lvl < 1 || lvl > 13) {
          return NextResponse.json(
            { error: "Level must be an integer between 1 and 13" },
            { status: 422 },
          )
        }
        data.level = lvl
      }
      if (body.isActive !== undefined) data.isActive = !!body.isActive

      const designation = await db.designation.update({
        where: { id: ctx.params.id },
        data,
        select: { id: true, title: true, level: true, isActive: true },
      })

      return NextResponse.json({ data: designation })
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return NextResponse.json({ error: "Designation title already exists" }, { status: 409 })
      }
      console.error("[DESIGNATIONS_PATCH]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

/**
 * DELETE /api/designations/[id]
 *  Default: soft-deactivate (isActive=false) — hides from dropdowns, keeps history.
 *  With `?permanent=true`: hard-deletes, allowed only if no employee references it.
 */
export const DELETE = withAuth(
  PERMISSIONS.EMPLOYEE_WRITE,
  async (req: NextRequest, ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const { id } = ctx.params
      const permanent = new URL(req.url).searchParams.get("permanent") === "true"

      const desig = await db.designation.findUnique({
        where: { id },
        include: { _count: { select: { employees: true } } },
      })
      if (!desig) return NextResponse.json({ error: "Designation not found" }, { status: 404 })

      if (permanent) {
        if (desig._count.employees > 0) {
          return NextResponse.json(
            {
              error: `Cannot permanently delete: ${desig._count.employees} employee(s) reference this designation. Deactivate instead.`,
            },
            { status: 409 },
          )
        }
        await db.designation.delete({ where: { id } })
        return NextResponse.json({ message: "Designation deleted permanently" })
      }

      await db.designation.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({
        message: `Designation deactivated. ${desig._count.employees} employee(s) still assigned.`,
      })
    } catch (error) {
      console.error("[DESIGNATIONS_DELETE]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, withSession, canAccessEmployee } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import { updateEmployeeSchema } from "@/lib/schemas/employee"
import type { Session } from "next-auth"

export const GET = withSession(
  async (req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id } = ctx.params

      // Allow access if user has employee:read OR if accessing own profile
      if (!canAccessEmployee(session, id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const employee = await db.employee.findUnique({
        where: { id },
        include: {
          department: { select: { id: true, name: true, code: true } },
          designation: { select: { id: true, title: true, level: true } },
          manager: { select: { id: true, firstName: true, lastName: true, email: true, profilePhoto: true } },
          _count: {
            select: {
              subordinates: true,
              documents: true,
            },
          },
          employeeRoles: {
            include: {
              role: {
                select: { id: true, name: true, displayName: true },
              },
            },
          },
        },
      })

      if (!employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 })
      }

      return NextResponse.json({ data: employee })
    } catch (error) {
      console.error("[EMPLOYEE_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const PATCH = withAuth(
  PERMISSIONS.EMPLOYEE_WRITE,
  async (req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id } = ctx.params
      const body = await req.json()

      const parsed = updateEmployeeSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 422 }
        )
      }

      const data = parsed.data

      // Get before state for audit
      const before = await db.employee.findUnique({ where: { id } })
      if (!before) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 })
      }

      const updateData: Record<string, unknown> = {}

      if (data.firstName !== undefined) updateData.firstName = data.firstName
      if (data.lastName !== undefined) updateData.lastName = data.lastName
      if (data.email !== undefined) updateData.email = data.email
      if (data.personalEmail !== undefined) updateData.personalEmail = data.personalEmail || null
      if (data.phone !== undefined) updateData.phone = data.phone || null
      if (data.personalPhone !== undefined) updateData.personalPhone = data.personalPhone || null
      if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null
      if (data.gender !== undefined) updateData.gender = data.gender || null
      if (data.nationality !== undefined) updateData.nationality = data.nationality || null
      if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup || null
      if (data.departmentId !== undefined) updateData.departmentId = data.departmentId || null
      if (data.designationId !== undefined) updateData.designationId = data.designationId || null
      if (data.managerId !== undefined) updateData.managerId = data.managerId || null
      if (data.employmentType !== undefined) updateData.employmentType = data.employmentType
      if (data.dateOfJoining !== undefined) updateData.dateOfJoining = data.dateOfJoining ? new Date(data.dateOfJoining) : null
      if (data.probationEndDate !== undefined) updateData.probationEndDate = data.probationEndDate ? new Date(data.probationEndDate) : null
      if (data.workLocation !== undefined) updateData.workLocation = data.workLocation || null
      if (data.currentAddress !== undefined) updateData.currentAddress = data.currentAddress ? JSON.parse(JSON.stringify(data.currentAddress)) : null
      if (data.permanentAddress !== undefined) updateData.permanentAddress = data.permanentAddress ? JSON.parse(JSON.stringify(data.permanentAddress)) : null
      if (data.emergencyContact !== undefined) updateData.emergencyContact = data.emergencyContact ? JSON.parse(JSON.stringify(data.emergencyContact)) : null

      const employee = await db.employee.update({
        where: { id },
        data: updateData,
        include: {
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, title: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      // Compute diff for audit
      const changedFields: Record<string, { before: unknown; after: unknown }> = {}
      for (const key of Object.keys(updateData)) {
        const beforeVal = (before as Record<string, unknown>)[key]
        const afterVal = updateData[key]
        if (String(beforeVal) !== String(afterVal)) {
          changedFields[key] = { before: beforeVal, after: afterVal }
        }
      }

      await db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "UPDATE",
          module: "employee",
          entityType: "Employee",
          entityId: id,
          changes: changedFields as object,
          ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
          userAgent: req.headers.get("user-agent") ?? undefined,
        },
      })

      return NextResponse.json({ data: employee })
    } catch (error: unknown) {
      console.error("[EMPLOYEE_PATCH]", error)
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return NextResponse.json({ error: "Email already in use by another employee" }, { status: 409 })
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const DELETE = withAuth(
  PERMISSIONS.EMPLOYEE_DELETE,
  async (req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id } = ctx.params

      const existing = await db.employee.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 })
      }

      // Soft delete
      await db.employee.update({
        where: { id },
        data: {
          status: "TERMINATED",
          isActive: false,
        },
      })

      await db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "DELETE",
          module: "employee",
          entityType: "Employee",
          entityId: id,
          changes: { softDeleted: true, previousStatus: existing.status },
          ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
          userAgent: req.headers.get("user-agent") ?? undefined,
        },
      })

      return NextResponse.json({ message: "Employee terminated successfully" })
    } catch (error) {
      console.error("[EMPLOYEE_DELETE]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

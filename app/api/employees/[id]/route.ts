import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, withSession, canAccessEmployee } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import { updateEmployeeSchema } from "@/lib/schemas/employee"
import { createAuditLog } from "@/lib/audit"
import { encrypt } from "@/lib/crypto"
import type { Session } from "next-auth"

// Never leak the encrypted Gmail App Password on the wire.
function stripSecret<T extends { gmailAppPassword?: string | null }>(emp: T): Omit<T, "gmailAppPassword"> {
  const { gmailAppPassword: _omit, ...safe } = emp
  return safe
}

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
          manager: {
            select: { id: true, firstName: true, lastName: true, email: true, profilePhoto: true },
          },
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

      // Expose only a boolean flag for the secret — never the value.
      return NextResponse.json({
        data: { ...stripSecret(employee), hasGmailAppPassword: !!employee.gmailAppPassword },
      })
    } catch (error) {
      console.error("[EMPLOYEE_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
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
          { status: 422 },
        )
      }

      const data = parsed.data

      // Get before state for audit
      const before = await db.employee.findUnique({ where: { id } })
      if (!before) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 })
      }

      const updateData: Record<string, unknown> = {}

      // Employee code change — check uniqueness up-front so we can give a clean error
      // (avoids relying on Prisma's P2002 to disambiguate email vs employeeNo conflicts).
      if (data.employeeNo !== undefined && data.employeeNo !== before.employeeNo) {
        const clash = await db.employee.findUnique({
          where: { employeeNo: data.employeeNo },
          select: { id: true },
        })
        if (clash && clash.id !== id) {
          return NextResponse.json(
            { error: `Employee code "${data.employeeNo}" is already in use` },
            { status: 409 },
          )
        }
        updateData.employeeNo = data.employeeNo
      }

      if (data.deviceId !== undefined) updateData.deviceId = data.deviceId || null
      // Offboarding: status + dates, and keep isActive in sync.
      if (data.status !== undefined) {
        updateData.status = data.status
        if (data.status === "RESIGNED" || data.status === "TERMINATED") updateData.isActive = false
        if (data.status === "ACTIVE") updateData.isActive = true
      }
      if (data.resignationDate !== undefined)
        updateData.resignationDate = data.resignationDate ? new Date(data.resignationDate) : null
      if (data.lastWorkingDate !== undefined)
        updateData.lastWorkingDate = data.lastWorkingDate ? new Date(data.lastWorkingDate) : null
      if (data.firstName !== undefined) updateData.firstName = data.firstName
      if (data.lastName !== undefined) updateData.lastName = data.lastName
      if (data.email !== undefined) updateData.email = data.email
      if (data.personalEmail !== undefined) updateData.personalEmail = data.personalEmail || null
      if (data.phone !== undefined) updateData.phone = data.phone || null
      if (data.personalPhone !== undefined) updateData.personalPhone = data.personalPhone || null
      if (data.dateOfBirth !== undefined)
        updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null
      if (data.gender !== undefined) updateData.gender = data.gender || null
      if (data.nationality !== undefined) updateData.nationality = data.nationality || null
      if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup || null
      if (data.departmentId !== undefined) updateData.departmentId = data.departmentId || null
      if (data.designationId !== undefined) updateData.designationId = data.designationId || null
      if (data.managerId !== undefined) updateData.managerId = data.managerId || null
      if (data.employmentType !== undefined) updateData.employmentType = data.employmentType
      if (data.dateOfJoining !== undefined)
        updateData.dateOfJoining = data.dateOfJoining ? new Date(data.dateOfJoining) : null
      if (data.probationEndDate !== undefined)
        updateData.probationEndDate = data.probationEndDate ? new Date(data.probationEndDate) : null
      if (data.onProbation !== undefined) updateData.onProbation = data.onProbation
      if (data.probationMonths !== undefined) updateData.probationMonths = data.probationMonths
      if (data.workLocation !== undefined) updateData.workLocation = data.workLocation || null
      if (data.currentAddress !== undefined)
        updateData.currentAddress = data.currentAddress
          ? JSON.parse(JSON.stringify(data.currentAddress))
          : null
      if (data.permanentAddress !== undefined)
        updateData.permanentAddress = data.permanentAddress
          ? JSON.parse(JSON.stringify(data.permanentAddress))
          : null
      if (data.emergencyContact !== undefined)
        updateData.emergencyContact = data.emergencyContact
          ? JSON.parse(JSON.stringify(data.emergencyContact))
          : null
      if (data.gmailAppPassword !== undefined) {
        updateData.gmailAppPassword = data.gmailAppPassword
          ? encrypt(data.gmailAppPassword)
          : null
      }

      const employee = await db.employee.update({
        where: { id },
        data: updateData,
        include: {
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, title: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      // Compute diff for audit (mask the secret — never log plaintext or ciphertext).
      const changedFields: Record<string, { before: unknown; after: unknown }> = {}
      for (const key of Object.keys(updateData)) {
        const beforeVal = (before as Record<string, unknown>)[key]
        const afterVal = updateData[key]
        if (String(beforeVal) !== String(afterVal)) {
          if (key === "gmailAppPassword") {
            changedFields[key] = { before: beforeVal ? "***" : null, after: "***" }
          } else {
            changedFields[key] = { before: beforeVal, after: afterVal }
          }
        }
      }

      await createAuditLog(session, {
        action: "UPDATE",
        module: "employee",
        entityType: "Employee",
        entityId: id,
        changes: changedFields as object,
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      })

      return NextResponse.json({ data: stripSecret(employee) })
    } catch (error: unknown) {
      console.error("[EMPLOYEE_PATCH]", error)
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Email already in use by another employee" },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

/**
 * DELETE /api/employees/[id]
 *  Default behaviour: soft-deactivate (sets isActive=false).
 *  With `?permanent=true`: hard-deletes the row. Only allowed on rows that
 *  are already inactive — protects against accidental loss of an active
 *  employee in one click.
 */
export const DELETE = withAuth(
  PERMISSIONS.EMPLOYEE_DELETE,
  async (req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id } = ctx.params
      const url = new URL(req.url)
      const permanent = url.searchParams.get("permanent") === "true"

      const existing = await db.employee.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 })
      }

      if (id === session.user.id) {
        return NextResponse.json(
          { error: "You can't deactivate your own account" },
          { status: 400 },
        )
      }

      if (permanent) {
        if (existing.isActive) {
          return NextResponse.json(
            { error: "Deactivate the employee before deleting permanently" },
            { status: 400 },
          )
        }

        await db.employee.delete({ where: { id } })

        await createAuditLog(session, {
          action: "HARD_DELETE",
          module: "employee",
          entityType: "Employee",
          entityId: id,
          changes: {
            employeeNo: existing.employeeNo,
            email: existing.email,
            previousStatus: existing.status,
          },
          ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
          userAgent: req.headers.get("user-agent"),
        })

        return NextResponse.json({ message: "Employee deleted permanently" })
      }

      // Soft deactivate
      await db.employee.update({
        where: { id },
        data: { isActive: false },
      })

      await createAuditLog(session, {
        action: "DEACTIVATE",
        module: "employee",
        entityType: "Employee",
        entityId: id,
        changes: { previousIsActive: existing.isActive, previousStatus: existing.status },
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      })

      return NextResponse.json({ message: "Employee deactivated" })
    } catch (error) {
      console.error("[EMPLOYEE_DELETE]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

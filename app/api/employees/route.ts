import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import { createEmployeeSchema, employeeFilterSchema } from "@/lib/schemas/employee"
import { generateEmployeeNo } from "@/lib/utils"
import { addEmailJob } from "@/lib/queue"
import bcrypt from "bcryptjs"
import type { Session } from "next-auth"

export const GET = withAuth(
  PERMISSIONS.EMPLOYEE_READ,
  async (req: NextRequest, _ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const { searchParams } = new URL(req.url)
      const raw = Object.fromEntries(searchParams.entries())
      const parsed = employeeFilterSchema.safeParse(raw)

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        )
      }

      const { search, departmentId, designationId, status, page, limit } = parsed.data
      const skip = (page - 1) * limit

      const where: Record<string, unknown> = {}

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { employeeNo: { contains: search, mode: "insensitive" } },
        ]
      }

      if (departmentId) where.departmentId = departmentId
      if (designationId) where.designationId = designationId
      if (status) where.status = status

      const [employees, total] = await Promise.all([
        db.employee.findMany({
          where,
          include: {
            department: { select: { id: true, name: true } },
            designation: { select: { id: true, title: true } },
            manager: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        db.employee.count({ where }),
      ])

      return NextResponse.json({
        data: employees,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error("[EMPLOYEES_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const POST = withAuth(
  PERMISSIONS.EMPLOYEE_WRITE,
  async (req: NextRequest, _ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const body = await req.json()
      const parsed = createEmployeeSchema.safeParse(body)

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 422 }
        )
      }

      const data = parsed.data

      // Auto-generate employee number
      const totalCount = await db.employee.count()
      const employeeNo = generateEmployeeNo(totalCount + 1)

      // Hash password if provided
      let passwordHash: string | undefined
      if (data.password) {
        passwordHash = await bcrypt.hash(data.password, 12)
      }

      // Prepare address & emergency contact JSON
      const currentAddress = data.currentAddress
        ? JSON.parse(JSON.stringify(data.currentAddress))
        : undefined
      const permanentAddress = data.permanentAddress
        ? JSON.parse(JSON.stringify(data.permanentAddress))
        : undefined
      const emergencyContact = data.emergencyContact
        ? JSON.parse(JSON.stringify(data.emergencyContact))
        : undefined

      // Create employee
      const employee = await db.employee.create({
        data: {
          employeeNo,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          personalEmail: data.personalEmail || null,
          phone: data.phone || null,
          personalPhone: data.personalPhone || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender || null,
          nationality: data.nationality || null,
          bloodGroup: data.bloodGroup || null,
          departmentId: data.departmentId || null,
          designationId: data.designationId || null,
          managerId: data.managerId || null,
          employmentType: data.employmentType,
          dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : null,
          probationEndDate: data.probationEndDate ? new Date(data.probationEndDate) : null,
          workLocation: data.workLocation || null,
          currentAddress,
          permanentAddress,
          emergencyContact,
          passwordHash,
        },
        include: {
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, title: true } },
        },
      })

      // Assign default "employee" role
      const defaultRole = await db.role.findFirst({
        where: { name: "employee" },
        select: { id: true },
      })

      if (defaultRole) {
        await db.employeeRole.create({
          data: {
            employeeId: employee.id,
            roleId: defaultRole.id,
          },
        })
      }

      // Create audit log
      await db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "CREATE",
          module: "employee",
          entityType: "Employee",
          entityId: employee.id,
          changes: { created: { employeeNo, email: data.email } },
          ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
          userAgent: req.headers.get("user-agent") ?? undefined,
        },
      })

      // Queue welcome email if template exists and is active
      const welcomeTemplate = await db.emailTemplate.findFirst({
        where: { slug: "welcome-email", isActive: true },
      })

      if (welcomeTemplate) {
        const html = welcomeTemplate.bodyHtml
          .replace(/\{\{firstName\}\}/g, employee.firstName)
          .replace(/\{\{lastName\}\}/g, employee.lastName)
          .replace(/\{\{email\}\}/g, employee.email)
          .replace(/\{\{employeeNo\}\}/g, employee.employeeNo)

        await addEmailJob({
          to: employee.email,
          subject: welcomeTemplate.subject,
          html,
          text: welcomeTemplate.bodyText || undefined,
        })
      }

      return NextResponse.json({ data: employee }, { status: 201 })
    } catch (error: unknown) {
      console.error("[EMPLOYEES_POST]", error)
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        return NextResponse.json({ error: "An employee with this email already exists" }, { status: 409 })
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

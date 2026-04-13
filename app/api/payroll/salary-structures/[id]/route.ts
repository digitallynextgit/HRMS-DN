import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

export const GET = withAuth(
  PERMISSIONS.PAYROLL_WRITE,
  async (_req: NextRequest, ctx: { params: { id: string } }, _session: Session) => {
    try {
      const { id } = ctx.params

      const structure = await db.salaryStructure.findUnique({
        where: { id },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNo: true,
              department: { select: { id: true, name: true } },
              designation: { select: { id: true, title: true } },
            },
          },
        },
      })

      if (!structure) {
        return NextResponse.json({ error: "Salary structure not found" }, { status: 404 })
      }

      return NextResponse.json({ data: structure })
    } catch (error) {
      console.error("[SALARY_STRUCTURE_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const PATCH = withAuth(
  PERMISSIONS.PAYROLL_WRITE,
  async (req: NextRequest, ctx: { params: { id: string } }, _session: Session) => {
    try {
      const { id } = ctx.params
      const body = await req.json()

      const existing = await db.salaryStructure.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: "Salary structure not found" }, { status: 404 })
      }

      const {
        basicSalary,
        hra,
        conveyance,
        medicalAllowance,
        otherAllowances,
        pfEmployee,
        pfEmployer,
        esi,
        tds,
        effectiveFrom,
      } = body

      const updated = await db.salaryStructure.update({
        where: { id },
        data: {
          ...(basicSalary !== undefined && { basicSalary: Number(basicSalary) }),
          ...(hra !== undefined && { hra: Number(hra) }),
          ...(conveyance !== undefined && { conveyance: Number(conveyance) }),
          ...(medicalAllowance !== undefined && { medicalAllowance: Number(medicalAllowance) }),
          ...(otherAllowances !== undefined && { otherAllowances: Number(otherAllowances) }),
          ...(pfEmployee !== undefined && { pfEmployee: Number(pfEmployee) }),
          ...(pfEmployer !== undefined && { pfEmployer: Number(pfEmployer) }),
          ...(esi !== undefined && { esi: Number(esi) }),
          ...(tds !== undefined && { tds: Number(tds) }),
          ...(effectiveFrom !== undefined && { effectiveFrom: new Date(effectiveFrom) }),
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNo: true,
              department: { select: { id: true, name: true } },
              designation: { select: { id: true, title: true } },
            },
          },
        },
      })

      return NextResponse.json({ data: updated })
    } catch (error) {
      console.error("[SALARY_STRUCTURE_PATCH]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const DELETE = withAuth(
  PERMISSIONS.PAYROLL_WRITE,
  async (_req: NextRequest, ctx: { params: { id: string } }, _session: Session) => {
    try {
      const { id } = ctx.params

      const existing = await db.salaryStructure.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: "Salary structure not found" }, { status: 404 })
      }

      // Check if any payroll records reference this salary structure
      const referencedRecords = await db.payrollRecord.count({
        where: { salaryStructureId: id },
      })

      if (referencedRecords > 0) {
        return NextResponse.json(
          { error: "Cannot delete: payroll records are referencing this salary structure" },
          { status: 409 }
        )
      }

      await db.salaryStructure.delete({ where: { id } })

      return NextResponse.json({ message: "Salary structure deleted successfully" })
    } catch (error) {
      console.error("[SALARY_STRUCTURE_DELETE]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

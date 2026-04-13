import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

const payrollInclude = {
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
  salaryStructure: {
    select: {
      id: true,
      basicSalary: true,
      effectiveFrom: true,
    },
  },
}

export const GET = withAuth(
  PERMISSIONS.PAYROLL_READ,
  async (_req: NextRequest, ctx: { params: { id: string } }, _session: Session) => {
    try {
      const { id } = ctx.params

      const record = await db.payrollRecord.findUnique({
        where: { id },
        include: payrollInclude,
      })

      if (!record) {
        return NextResponse.json({ error: "Payroll record not found" }, { status: 404 })
      }

      return NextResponse.json({ data: record })
    } catch (error) {
      console.error("[PAYROLL_RECORD_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const PATCH = withAuth(
  PERMISSIONS.PAYROLL_PROCESS,
  async (req: NextRequest, ctx: { params: { id: string } }, session: Session) => {
    try {
      const { id } = ctx.params
      const body = await req.json()

      const existing = await db.payrollRecord.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: "Payroll record not found" }, { status: 404 })
      }

      const { status, notes } = body

      // Validate status transitions
      const validTransitions: Record<string, string[]> = {
        DRAFT: ["PROCESSING"],
        PROCESSING: ["APPROVED"],
        APPROVED: ["PAID"],
        PAID: [],
      }

      if (status && !validTransitions[existing.status]?.includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from ${existing.status} to ${status}. Allowed: ${validTransitions[existing.status]?.join(", ") || "none"}`,
          },
          { status: 400 }
        )
      }

      const updateData: Record<string, unknown> = {}
      if (notes !== undefined) updateData.notes = notes

      if (status) {
        updateData.status = status
        if (status === "PROCESSING") {
          updateData.processedAt = new Date()
        }
        if (status === "APPROVED") {
          updateData.approvedById = session.user.id
        }
        if (status === "PAID") {
          updateData.paidAt = new Date()
        }
      }

      const updated = await db.payrollRecord.update({
        where: { id },
        data: updateData,
        include: payrollInclude,
      })

      return NextResponse.json({ data: updated })
    } catch (error) {
      console.error("[PAYROLL_RECORD_PATCH]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const DELETE = withAuth(
  PERMISSIONS.PAYROLL_PROCESS,
  async (_req: NextRequest, ctx: { params: { id: string } }, _session: Session) => {
    try {
      const { id } = ctx.params

      const existing = await db.payrollRecord.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: "Payroll record not found" }, { status: 404 })
      }

      if (existing.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only DRAFT payroll records can be deleted" },
          { status: 409 }
        )
      }

      await db.payrollRecord.delete({ where: { id } })

      return NextResponse.json({ message: "Payroll record deleted successfully" })
    } catch (error) {
      console.error("[PAYROLL_RECORD_DELETE]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

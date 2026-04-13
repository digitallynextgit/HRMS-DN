import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import { createNotification } from "@/lib/notifications"
import type { Session } from "next-auth"

/**
 * Returns the number of business days (Mon–Fri) in a given month/year.
 */
function getBusinessDaysInMonth(year: number, month: number): number {
  // month is 1-based
  const daysInMonth = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay()
    if (day !== 0 && day !== 6) count++
  }
  return count
}

export const GET = withAuth(
  PERMISSIONS.PAYROLL_READ,
  async (req: NextRequest, _ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const { searchParams } = new URL(req.url)
      const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined
      const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined
      const status = searchParams.get("status") ?? undefined
      const employeeId = searchParams.get("employeeId") ?? undefined

      const where: Record<string, unknown> = {}
      if (month) where.month = month
      if (year) where.year = year
      if (status) where.status = status
      if (employeeId) where.employeeId = employeeId

      const records = await db.payrollRecord.findMany({
        where,
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
        orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
      })

      return NextResponse.json({ data: records })
    } catch (error) {
      console.error("[PAYROLL_RECORDS_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const POST = withAuth(
  PERMISSIONS.PAYROLL_PROCESS,
  async (req: NextRequest, _ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const body = await req.json()
      const { month, year, employeeIds } = body

      if (!month || !year) {
        return NextResponse.json({ error: "month and year are required" }, { status: 400 })
      }

      const monthNum = Number(month)
      const yearNum = Number(year)

      if (monthNum < 1 || monthNum > 12) {
        return NextResponse.json({ error: "month must be between 1 and 12" }, { status: 400 })
      }

      // Fetch employees to process
      const employeeWhere: Record<string, unknown> = {
        isActive: true,
        status: "ACTIVE",
        salaryStructure: { isNot: null },
      }

      if (Array.isArray(employeeIds) && employeeIds.length > 0) {
        employeeWhere.id = { in: employeeIds }
      }

      const employees = await db.employee.findMany({
        where: employeeWhere,
        include: {
          salaryStructure: true,
        },
      })

      if (employees.length === 0) {
        return NextResponse.json(
          { error: "No active employees with a salary structure found" },
          { status: 400 }
        )
      }

      const workingDays = getBusinessDaysInMonth(yearNum, monthNum)

      // Month boundaries for attendance and leave queries
      const monthStart = new Date(yearNum, monthNum - 1, 1)
      const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59, 999)

      const created: string[] = []
      const skipped: string[] = []
      const errors: string[] = []

      for (const employee of employees) {
        try {
          // Skip if record already exists
          const existing = await db.payrollRecord.findUnique({
            where: {
              employeeId_month_year: {
                employeeId: employee.id,
                month: monthNum,
                year: yearNum,
              },
            },
          })

          if (existing) {
            skipped.push(employee.id)
            continue
          }

          const ss = employee.salaryStructure!

          // Fetch attendance logs for this employee in this month
          const attendanceLogs = await db.attendanceLog.findMany({
            where: {
              employeeId: employee.id,
              date: { gte: monthStart, lte: monthEnd },
            },
          })

          // Fetch approved leaves for this employee in this month
          const approvedLeaves = await db.leaveRequest.findMany({
            where: {
              employeeId: employee.id,
              status: "APPROVED",
              OR: [
                { startDate: { lte: monthEnd }, endDate: { gte: monthStart } },
              ],
            },
          })

          // Count approved leave days that fall in this month
          let leaveDaysInMonth = 0
          for (const leave of approvedLeaves) {
            const leaveStart = leave.startDate > monthStart ? leave.startDate : monthStart
            const leaveEnd = leave.endDate < monthEnd ? leave.endDate : monthEnd
            // Count business days in this range
            const start = new Date(leaveStart)
            const end = new Date(leaveEnd)
            const curr = new Date(start)
            while (curr <= end) {
              const day = curr.getDay()
              if (day !== 0 && day !== 6) leaveDaysInMonth++
              curr.setDate(curr.getDate() + 1)
            }
          }

          // Present days from attendance logs (PRESENT, LATE, HALF_DAY count)
          let presentDays = 0
          for (const log of attendanceLogs) {
            if (log.status === "PRESENT" || log.status === "LATE") presentDays += 1
            else if (log.status === "HALF_DAY") presentDays += 0.5
            else if (log.status === "ON_LEAVE") presentDays += 1 // approved leave counts
          }

          // LOP = absent days not covered by approved leave
          const absentDays = attendanceLogs.filter((l) => l.status === "ABSENT").length
          const lopDays = Math.max(0, absentDays - Math.max(0, leaveDaysInMonth - (attendanceLogs.filter(l => l.status === "ON_LEAVE").length)))

          // If no attendance data at all, assume full attendance
          const effectivePresentDays = attendanceLogs.length === 0
            ? workingDays
            : Math.min(presentDays + leaveDaysInMonth, workingDays)

          const ratio = workingDays > 0 ? effectivePresentDays / workingDays : 1

          // Scale earnings proportionally
          const basicSalary = Math.round(ss.basicSalary * ratio * 100) / 100
          const hra = Math.round(ss.hra * ratio * 100) / 100
          const conveyance = Math.round(ss.conveyance * ratio * 100) / 100
          const medicalAllowance = Math.round(ss.medicalAllowance * ratio * 100) / 100
          const otherAllowances = Math.round(ss.otherAllowances * ratio * 100) / 100
          const overtime = 0

          const grossSalary = basicSalary + hra + conveyance + medicalAllowance + otherAllowances + overtime

          // Deductions are fixed (not prorated)
          const pfEmployee = ss.pfEmployee
          const pfEmployer = ss.pfEmployer
          const esi = ss.esi
          const tds = ss.tds
          const otherDeductions = 0

          const totalDeductions = pfEmployee + esi + tds + otherDeductions
          const netSalary = Math.max(0, grossSalary - totalDeductions)

          const record = await db.payrollRecord.create({
            data: {
              employeeId: employee.id,
              salaryStructureId: ss.id,
              month: monthNum,
              year: yearNum,
              workingDays,
              presentDays: effectivePresentDays,
              leaveDays: leaveDaysInMonth,
              lopDays,
              basicSalary,
              hra,
              conveyance,
              medicalAllowance,
              otherAllowances,
              overtime,
              grossSalary,
              pfEmployee,
              pfEmployer,
              esi,
              tds,
              otherDeductions,
              totalDeductions,
              netSalary,
              status: "DRAFT",
            },
          })

          created.push(record.id)

          // In-app notification: payslip ready
          const monthName = new Date(yearNum, monthNum - 1).toLocaleString("default", { month: "long" })
          await createNotification({
            employeeId: employee.id,
            title: "Payslip Ready",
            message: `Your payslip for ${monthName} ${yearNum} is ready. Net pay: ₹${netSalary.toLocaleString("en-IN")}.`,
            type: "success",
            link: "/payroll/me",
          })
        } catch (empError) {
          console.error(`[PAYROLL_GENERATE] Error for employee ${employee.id}:`, empError)
          errors.push(employee.id)
        }
      }

      return NextResponse.json(
        {
          message: `Payroll generated: ${created.length} created, ${skipped.length} skipped (already exist), ${errors.length} errors`,
          created: created.length,
          skipped: skipped.length,
          errors: errors.length,
        },
        { status: 201 }
      )
    } catch (error) {
      console.error("[PAYROLL_RECORDS_POST]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

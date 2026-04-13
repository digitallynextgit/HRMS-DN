import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession } from "@/lib/permissions"
import type { Session } from "next-auth"

// CSV format: employee_no,date,check_in,check_out
// e.g. EMP001,2026-04-01,09:00,18:00

function parseTimeOnDate(dateStr: string, timeStr: string): Date | null {
  if (!timeStr) return null
  try {
    const [h, m] = timeStr.split(":").map(Number)
    const d = new Date(dateStr)
    d.setHours(h, m, 0, 0)
    return d
  } catch { return null }
}

export const POST = withSession(async (req: NextRequest, _ctx: unknown, session: Session) => {
  try {
    const body = await req.json()
    const { rows, preview } = body // rows: [{employee_no, date, check_in, check_out}]

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 })
    }

    const results: { row: number; success: boolean; error?: string; employeeNo?: string }[] = []

    if (preview) {
      // Validate only — don't write
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const emp = await db.employee.findFirst({ where: { employeeNo: row.employee_no } })
        if (!emp) {
          results.push({ row: i + 1, success: false, error: `Employee ${row.employee_no} not found` })
        } else if (!row.date) {
          results.push({ row: i + 1, success: false, error: "Date is required" })
        } else {
          results.push({ row: i + 1, success: true, employeeNo: row.employee_no })
        }
      }
      return NextResponse.json({ preview: true, results, total: rows.length, valid: results.filter(r => r.success).length })
    }

    // Actually import
    let imported = 0
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const emp = await db.employee.findFirst({ where: { employeeNo: row.employee_no } })
        if (!emp) { results.push({ row: i + 1, success: false, error: `Employee ${row.employee_no} not found` }); continue }

        const date = new Date(row.date)
        date.setHours(0, 0, 0, 0)
        const checkIn = parseTimeOnDate(row.date, row.check_in)
        const checkOut = parseTimeOnDate(row.date, row.check_out)

        const existing = await db.attendanceLog.findFirst({ where: { employeeId: emp.id, date } })
        if (existing) {
          await db.attendanceLog.update({
            where: { id: existing.id },
            data: { checkIn: checkIn ?? existing.checkIn, checkOut: checkOut ?? existing.checkOut, source: "CSV" } as never,
          })
        } else {
          await db.attendanceLog.create({
            data: {
              employeeId: emp.id,
              date,
              checkIn,
              checkOut,
              source: "CSV",
              status: (checkIn ? "PRESENT" : "ABSENT") as never,
            },
          })
        }
        results.push({ row: i + 1, success: true, employeeNo: row.employee_no })
        imported++
      } catch (e) {
        results.push({ row: i + 1, success: false, error: "Unexpected error" })
      }
    }

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "IMPORT",
        module: "attendance",
        entityType: "AttendanceLog",
        changes: { imported, total: rows.length },
      },
    })

    return NextResponse.json({ imported, total: rows.length, results })
  } catch (error) {
    console.error("[ATTENDANCE_IMPORT]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

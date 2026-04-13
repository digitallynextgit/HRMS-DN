import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { OrgNode } from "@/types"
import type { Session } from "next-auth"

function buildTree(
  employees: Array<{
    id: string
    firstName: string
    lastName: string
    employeeNo: string
    managerId: string | null
    designation: { title: string } | null
    department: { name: string } | null
    profilePhoto: string | null
  }>,
  managerId: string | null
): OrgNode[] {
  return employees
    .filter((e) => e.managerId === managerId)
    .map((e) => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      employeeNo: e.employeeNo,
      designation: e.designation,
      department: e.department,
      profilePhoto: e.profilePhoto,
      children: buildTree(employees, e.id),
    }))
}

export const GET = withAuth(
  PERMISSIONS.EMPLOYEE_READ,
  async (_req: NextRequest, _ctx: { params: Record<string, string> }, _session: Session) => {
    try {
      const employees = await db.employee.findMany({
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNo: true,
          managerId: true,
          profilePhoto: true,
          designation: { select: { title: true } },
          department: { select: { name: true } },
        },
      })

      const tree = buildTree(employees, null)

      return NextResponse.json({ data: tree })
    } catch (error) {
      console.error("[ORG_CHART_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

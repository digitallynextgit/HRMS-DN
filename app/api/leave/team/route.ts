import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import type { Session } from "next-auth"

export const GET = withAuth(
  PERMISSIONS.LEAVE_APPROVE,
  async (req: NextRequest, _ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { searchParams } = new URL(req.url)
      const statusParam = searchParams.get("status")
      const page = Math.max(1, Number(searchParams.get("page") ?? 1))
      const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)))
      const skip = (page - 1) * limit

      // Find direct reports of the current user
      const directReports = await db.employee.findMany({
        where: { managerId: session.user.id, isActive: true },
        select: { id: true },
      })

      const directReportIds = directReports.map((e) => e.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = {
        employeeId: { in: directReportIds },
      }

      if (statusParam) {
        where.status = statusParam
      }

      const [requests, total] = await Promise.all([
        db.leaveRequest.findMany({
          where,
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNo: true,
                profilePhoto: true,
                department: { select: { id: true, name: true } },
              },
            },
            leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
            approver: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        db.leaveRequest.count({ where }),
      ])

      return NextResponse.json({
        data: requests,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error("[LEAVE_TEAM_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

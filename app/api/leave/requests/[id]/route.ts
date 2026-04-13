import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession, hasPermission } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import { sendEmail } from "@/lib/mailer"
import { createNotification } from "@/lib/notifications"
import type { Session } from "next-auth"

export const GET = withSession(
  async (_req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id } = ctx.params

      const request = await db.leaveRequest.findUnique({
        where: { id },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeNo: true, profilePhoto: true },
          },
          leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
          approver: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      if (!request) {
        return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
      }

      // Allow own requests or approvers
      if (
        request.employeeId !== session.user.id &&
        !hasPermission(session, PERMISSIONS.LEAVE_APPROVE)
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      return NextResponse.json({ data: request })
    } catch (error) {
      console.error("[LEAVE_REQUEST_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

export const PATCH = withSession(
  async (req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id } = ctx.params
      const body = await req.json()
      const { action, rejectionReason } = body

      if (!action || !["CANCEL", "APPROVE", "REJECT"].includes(action)) {
        return NextResponse.json(
          { error: "Action must be one of: CANCEL, APPROVE, REJECT" },
          { status: 400 }
        )
      }

      const request = await db.leaveRequest.findUnique({ where: { id } })
      if (!request) {
        return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
      }

      if (request.status !== "PENDING") {
        return NextResponse.json(
          { error: `Cannot ${action.toLowerCase()} a request that is already ${request.status.toLowerCase()}` },
          { status: 409 }
        )
      }

      const canApprove = hasPermission(session, PERMISSIONS.LEAVE_APPROVE)

      // Permission checks per action
      if (action === "CANCEL") {
        if (request.employeeId !== session.user.id) {
          return NextResponse.json(
            { error: "You can only cancel your own leave requests" },
            { status: 403 }
          )
        }
      } else {
        // APPROVE or REJECT
        if (!canApprove) {
          return NextResponse.json({ error: "Forbidden: requires leave:approve permission" }, { status: 403 })
        }
        if (action === "REJECT" && !rejectionReason?.trim()) {
          return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 })
        }
      }

      const year = new Date(request.startDate).getUTCFullYear()
      const balanceKey = {
        employeeId_leaveTypeId_year: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
      }

      const updatedRequest = await db.$transaction(async (tx) => {
        let updatedReq

        if (action === "CANCEL") {
          updatedReq = await tx.leaveRequest.update({
            where: { id },
            data: { status: "CANCELLED" },
            include: {
              employee: {
                select: { id: true, firstName: true, lastName: true, employeeNo: true, profilePhoto: true },
              },
              leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
              approver: { select: { id: true, firstName: true, lastName: true } },
            },
          })
          // Decrement pending from balance
          await tx.leaveBalance.updateMany({
            where: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year,
            },
            data: { pending: { decrement: request.totalDays } },
          })
        } else if (action === "APPROVE") {
          updatedReq = await tx.leaveRequest.update({
            where: { id },
            data: {
              status: "APPROVED",
              approverId: session.user.id,
              approvedAt: new Date(),
            },
            include: {
              employee: {
                select: { id: true, firstName: true, lastName: true, employeeNo: true, profilePhoto: true },
              },
              leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
              approver: { select: { id: true, firstName: true, lastName: true } },
            },
          })
          // Decrement pending, increment used
          await tx.leaveBalance.upsert({
            where: balanceKey,
            update: {
              pending: { decrement: request.totalDays },
              used: { increment: request.totalDays },
            },
            create: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year,
              allocated: 0,
              used: request.totalDays,
              pending: 0,
              carried: 0,
            },
          })
        } else {
          // REJECT
          updatedReq = await tx.leaveRequest.update({
            where: { id },
            data: {
              status: "REJECTED",
              approverId: session.user.id,
              rejectionReason: String(rejectionReason).trim(),
            },
            include: {
              employee: {
                select: { id: true, firstName: true, lastName: true, employeeNo: true, profilePhoto: true },
              },
              leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
              approver: { select: { id: true, firstName: true, lastName: true } },
            },
          })
          // Decrement pending
          await tx.leaveBalance.updateMany({
            where: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year,
            },
            data: { pending: { decrement: request.totalDays } },
          })
        }

        return updatedReq
      })

      // Send email + in-app notification to the employee
      try {
        const emp = await db.employee.findUnique({ where: { id: request.employeeId }, select: { firstName: true, email: true } })
        const leaveType = await db.leaveType.findUnique({ where: { id: request.leaveTypeId }, select: { name: true } })
        if (emp && action !== "CANCEL") {
          const isApproved = action === "APPROVE"
          const startDate = new Date(request.startDate).toDateString()
          // In-app notification
          await createNotification({
            employeeId: request.employeeId,
            title: isApproved ? "Leave Approved" : "Leave Rejected",
            message: isApproved
              ? `Your ${leaveType?.name ?? "leave"} request from ${startDate} has been approved.`
              : `Your ${leaveType?.name ?? "leave"} request from ${startDate} was rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`,
            type: isApproved ? "success" : "error",
            link: "/leave",
          })
          const subject = isApproved
            ? `Your ${leaveType?.name ?? "Leave"} request has been approved`
            : `Your ${leaveType?.name ?? "Leave"} request has been rejected`
          const endDate = new Date(request.endDate).toDateString()
          await sendEmail({
            to: emp.email,
            subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: ${isApproved ? "#16a34a" : "#dc2626"};">Leave Request ${isApproved ? "Approved" : "Rejected"}</h2>
                <p>Hi ${emp.firstName},</p>
                <p>Your <strong>${leaveType?.name ?? "leave"}</strong> request from <strong>${startDate}</strong> to <strong>${endDate}</strong> (${request.totalDays} day${request.totalDays !== 1 ? "s" : ""}) has been <strong>${isApproved ? "approved" : "rejected"}</strong>.</p>
                ${!isApproved && rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ""}
                <p style="color:#666;font-size:14px;">Login to HRMS to view details.</p>
              </div>
            `,
            text: `Hi ${emp.firstName}, your ${leaveType?.name ?? "leave"} request (${startDate} – ${endDate}) has been ${isApproved ? "approved" : "rejected"}.${!isApproved && rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
          })
        }
      } catch (_emailErr) {
        // Non-blocking — don't fail the request if email fails
      }

      return NextResponse.json({ data: updatedRequest })
    } catch (error) {
      console.error("[LEAVE_REQUEST_PATCH]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
)

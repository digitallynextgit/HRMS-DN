import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession, hasPermission } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/constants"
import { createNotification } from "@/lib/notifications"
import { sendEmailAs } from "@/lib/mailer"
import { actorStampId } from "@/lib/audit"
import type { Session } from "next-auth"

export const GET = withSession(
  async (_req: NextRequest, ctx: { params: Record<string, string> }, session: Session) => {
    try {
      const { id } = ctx.params
      const request = await db.wfhRequest.findUnique({
        where: { id },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNo: true,
              profilePhoto: true,
            },
          },
          managerApprover: { select: { id: true, firstName: true, lastName: true } },
          hrApprover: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      if (!request) return NextResponse.json({ error: "WFH request not found" }, { status: 404 })

      if (
        request.employeeId !== session.user.id &&
        !hasPermission(session, PERMISSIONS.WFH_APPROVE)
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      return NextResponse.json({ data: request })
    } catch (error) {
      console.error("[WFH_REQUEST_GET]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
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
          { status: 400 },
        )
      }

      const request = await db.wfhRequest.findUnique({ where: { id } })
      if (!request) return NextResponse.json({ error: "WFH request not found" }, { status: 404 })

      if (request.status !== "PENDING") {
        return NextResponse.json(
          {
            error: `Cannot ${action.toLowerCase()} a request that is already ${request.status.toLowerCase()}`,
          },
          { status: 409 },
        )
      }

      const canApprove = hasPermission(session, PERMISSIONS.WFH_APPROVE)

      // ── CANCEL: only the requester ──
      if (action === "CANCEL") {
        if (request.employeeId !== session.user.id) {
          return NextResponse.json(
            { error: "You can only cancel your own WFH requests" },
            { status: 403 },
          )
        }
        const updated = await db.wfhRequest.update({
          where: { id },
          data: { status: "CANCELLED" },
        })
        return NextResponse.json({ data: updated })
      }

      // ── APPROVE / REJECT: requires wfh:approve permission ──
      if (!canApprove) {
        return NextResponse.json(
          { error: "Forbidden: requires wfh:approve permission" },
          { status: 403 },
        )
      }
      if (action === "REJECT" && !rejectionReason?.trim()) {
        return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 })
      }

      // Single approval — like Leave: one wfh:approve holder approves/rejects and
      // the request reaches its terminal state. `managerApprover*` holds the single
      // approver (the legacy hrApprover* columns are left unused). The approver id
      // is withheld for a super_admin (actorStampId → null); status is what drives
      // the flow, never the id.
      let updated
      if (action === "APPROVE") {
        updated = await db.wfhRequest.update({
          where: { id },
          data: {
            status: "APPROVED",
            managerApproverId: actorStampId(session),
            managerApprovedAt: new Date(),
          },
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, email: true, employeeNo: true },
            },
            managerApprover: { select: { id: true, firstName: true, lastName: true } },
          },
        })
      } else {
        // REJECT
        updated = await db.wfhRequest.update({
          where: { id },
          data: {
            status: "REJECTED",
            rejectionReason: String(rejectionReason).trim(),
            managerApproverId: actorStampId(session),
            managerApprovedAt: new Date(),
          },
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, email: true, employeeNo: true },
            },
          },
        })
      }

      // ── Notify employee on terminal action ──
      if (updated.status === "APPROVED" || updated.status === "REJECTED") {
        try {
          const emp = await db.employee.findUnique({
            where: { id: request.employeeId },
            select: { firstName: true, email: true },
          })
          if (emp) {
            const dateStr = new Date(request.date).toDateString()
            const approved = updated.status === "APPROVED"
            await createNotification({
              employeeId: request.employeeId,
              title: approved ? "WFH Approved" : "WFH Rejected",
              message: approved
                ? `Your Work From Home request for ${dateStr} has been approved.`
                : `Your Work From Home request for ${dateStr} was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
              type: approved ? "success" : "error",
              link: "/wfh",
            })
            await sendEmailAs(session.user.id, {
              to: emp.email,
              subject: approved
                ? "Your WFH request has been approved"
                : "Your WFH request has been rejected",
              html: `
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
                  <h2 style="color:${approved ? "#16a34a" : "#dc2626"};">WFH Request ${approved ? "Approved" : "Rejected"}</h2>
                  <p>Hi ${emp.firstName},</p>
                  <p>Your Work From Home request for <strong>${dateStr}</strong> has been <strong>${approved ? "approved" : "rejected"}</strong>.</p>
                  ${!approved && rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ""}
                  <p style="color:#666;font-size:14px;">Login to HRMS for details.</p>
                </div>
              `,
              text: `Hi ${emp.firstName}, your WFH request for ${dateStr} has been ${approved ? "approved" : "rejected"}.${!approved && rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
            })
          }
        } catch (_emailErr) {
          // Non-blocking
        }
      }

      return NextResponse.json({ data: updated })
    } catch (error) {
      console.error("[WFH_REQUEST_PATCH]", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  },
)

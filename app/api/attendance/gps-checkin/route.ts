import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSession } from "@/lib/permissions"
import type { Session } from "next-auth"

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const POST = withSession(async (req: NextRequest, _ctx: unknown, session: Session) => {
  try {
    const body = await req.json()
    const { latitude, longitude, accuracy, type } = body // type: "IN" | "OUT"

    if (!latitude || !longitude || !type) {
      return NextResponse.json({ error: "latitude, longitude, and type are required" }, { status: 400 })
    }

    // Get attendance policy for geofence
    const policy = await db.attendancePolicy.findFirst({ orderBy: { createdAt: "desc" } })

    if (policy?.officeLatitude && policy?.officeLongitude) {
      const distance = haversineDistance(latitude, longitude, policy.officeLatitude, policy.officeLongitude)
      const radius = policy.geoFenceRadius ?? 200
      if (distance > radius) {
        return NextResponse.json({
          error: `You are ${Math.round(distance)}m away from the office. Must be within ${radius}m.`,
        }, { status: 400 })
      }
    }

    // Log GPS check-in
    await db.gpsCheckIn.create({
      data: {
        employeeId: session.user.id,
        type,
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        timestamp: new Date(),
      },
    })

    // Upsert AttendanceLog for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const existing = await db.attendanceLog.findFirst({
      where: { employeeId: session.user.id, date: today },
    })

    if (type === "IN") {
      if (!existing) {
        await db.attendanceLog.create({
          data: {
            employeeId: session.user.id,
            date: today,
            checkIn: new Date(),
            source: "GPS",
            status: "PRESENT" as never,
          },
        })
      }
    } else if (type === "OUT" && existing) {
      await db.attendanceLog.update({
        where: { id: existing.id },
        data: { checkOut: new Date() },
      })
    }

    return NextResponse.json({ message: type === "IN" ? "Checked in successfully" : "Checked out successfully" })
  } catch (error) {
    console.error("[GPS_CHECKIN]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const GET = withSession(async (_req: NextRequest, _ctx: unknown, session: Session) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayLog = await db.attendanceLog.findFirst({
      where: { employeeId: session.user.id, date: today },
    })

    const policy = await db.attendancePolicy.findFirst({ orderBy: { createdAt: "desc" } })

    return NextResponse.json({
      data: {
        todayLog,
        geofence: policy?.officeLatitude
          ? { lat: policy.officeLatitude, lng: policy.officeLongitude, radius: policy.geoFenceRadius ?? 200 }
          : null,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

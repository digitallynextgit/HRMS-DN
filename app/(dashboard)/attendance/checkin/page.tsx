"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { MapPin, Loader2, CheckCircle2, LogIn, LogOut, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CheckInStatus {
  todayLog: { checkIn: string | null; checkOut: string | null; status: string } | null
  geofence: { lat: number; lng: number; radius: number } | null
}

async function fetchStatus(): Promise<{ data: CheckInStatus }> {
  const res = await fetch("/api/attendance/gps-checkin")
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function submitCheckIn(body: { latitude: number; longitude: number; accuracy?: number; type: "IN" | "OUT" }) {
  const res = await fetch("/api/attendance/gps-checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed")
  return data
}

function formatTime(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function CheckInPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { data, refetch } = useQuery({ queryKey: ["checkin-status"], queryFn: fetchStatus, refetchInterval: 30000 })
  const status = data?.data

  const locateMut = () => {
    setLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setLoading(false)
      },
      (err) => {
        setGeoError(err.message)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  useEffect(() => { locateMut() }, [])

  const checkInMut = useMutation({
    mutationFn: (type: "IN" | "OUT") => submitCheckIn({ latitude: coords!.lat, longitude: coords!.lng, accuracy: coords!.accuracy, type }),
    onSuccess: (_, type) => {
      toast.success(type === "IN" ? "Checked in successfully" : "Checked out successfully")
      refetch()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const isCheckedIn = !!status?.todayLog?.checkIn
  const isCheckedOut = !!status?.todayLog?.checkOut
  const canCheckIn = !isCheckedIn
  const canCheckOut = isCheckedIn && !isCheckedOut

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <PageHeader title="GPS Check-In" description="Record your attendance using your location" />

      {/* Today's status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Today&apos;s Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <LogIn className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Check In</p>
              <p className="text-lg font-bold">{formatTime(status?.todayLog?.checkIn ?? null)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <LogOut className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Check Out</p>
              <p className="text-lg font-bold">{formatTime(status?.todayLog?.checkOut ?? null)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Navigation className="h-4 w-4" /> Your Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {geoError ? (
            <div className="text-sm text-destructive">{geoError}</div>
          ) : coords ? (
            <div className="space-y-1">
              <p className="text-sm">Lat: {coords.lat.toFixed(6)}, Lng: {coords.lng.toFixed(6)}</p>
              {coords.accuracy && <p className="text-xs text-muted-foreground">Accuracy: ±{Math.round(coords.accuracy)}m</p>}
              {status?.geofence && (
                <p className="text-xs text-muted-foreground">
                  Office geofence: {status.geofence.radius}m radius
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Locating…</p>
          )}
          <Button variant="outline" size="sm" onClick={locateMut} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <MapPin className="h-4 w-4 mr-2" /> Refresh Location
          </Button>
        </CardContent>
      </Card>

      {/* Check In / Check Out buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={!canCheckIn || !coords || checkInMut.isPending}
          onClick={() => checkInMut.mutate("IN")}
        >
          {checkInMut.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
          Check In
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
          disabled={!canCheckOut || !coords || checkInMut.isPending}
          onClick={() => checkInMut.mutate("OUT")}
        >
          {checkInMut.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
          Check Out
        </Button>
      </div>

      {isCheckedIn && isCheckedOut && (
        <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium justify-center">
          <CheckCircle2 className="h-4 w-4" />
          Attendance recorded for today
        </div>
      )}
    </div>
  )
}

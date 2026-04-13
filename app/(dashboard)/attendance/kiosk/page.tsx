"use client"

import { useState, useEffect, useCallback } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { RefreshCw, Loader2, CheckCircle2, LogIn, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Simple QR display using a URL (we'll show the token as text + large font for scanning)
// In production, use a QR library like qrcode.react

interface QrData {
  token: string
  expiresAt: string
}

async function generateQr(): Promise<{ data: QrData }> {
  const res = await fetch("/api/attendance/qr/generate", { method: "POST" })
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function scanQr(token: string, type: "IN" | "OUT") {
  const res = await fetch("/api/attendance/qr/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, type }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed")
  return data
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [secs, setSecs] = useState(0)

  useEffect(() => {
    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setSecs(remaining)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  const minutes = Math.floor(secs / 60)
  const seconds = secs % 60
  return (
    <span className={secs < 30 ? "text-red-500" : "text-muted-foreground"}>
      {minutes}:{seconds.toString().padStart(2, "0")}
    </span>
  )
}

export default function KioskPage() {
  const [qr, setQr] = useState<QrData | null>(null)
  const [scanToken, setScanToken] = useState("")
  const [lastAction, setLastAction] = useState<{ name: string; time: string; type: string } | null>(null)

  const genMut = useMutation({
    mutationFn: generateQr,
    onSuccess: (data) => setQr(data.data),
    onError: () => toast.error("Failed to generate QR code"),
  })

  const scanMut = useMutation({
    mutationFn: ({ token, type }: { token: string; type: "IN" | "OUT" }) => scanQr(token, type),
    onSuccess: (data, { type }) => {
      setLastAction({ name: data.employee ?? "Employee", time: new Date().toLocaleTimeString(), type })
      toast.success(data.message)
      setScanToken("")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Auto-refresh QR every 4.5 minutes
  useEffect(() => {
    genMut.mutate()
    const interval = setInterval(() => genMut.mutate(), 4.5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-expire: regenerate when token expires
  useEffect(() => {
    if (!qr) return
    const remaining = new Date(qr.expiresAt).getTime() - Date.now()
    const t = setTimeout(() => genMut.mutate(), remaining)
    return () => clearTimeout(t)
  }, [qr])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="QR Attendance Kiosk" description="Display this screen for employees to check in/out" />
        <Button variant="outline" size="sm" onClick={() => genMut.mutate()} disabled={genMut.isPending} className="gap-2">
          {genMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh QR
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* QR Display */}
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground font-medium">Current QR Token</p>
            {qr ? (
              <>
                {/* Large token display — in production replace with <QRCodeCanvas value={...} /> */}
                <div className="bg-muted rounded-xl p-6 w-full text-center">
                  <p className="font-mono text-2xl font-bold tracking-wider break-all select-all">{qr.token}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Expires in <Countdown expiresAt={qr.expiresAt} />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Employees enter this code at the scan terminal, or use the scan page on their device.
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Generating…
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual scan terminal */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm font-medium">Manual Scan Terminal</p>
            <p className="text-xs text-muted-foreground">Employee enters the token code to check in or out.</p>
            <div className="space-y-1.5">
              <Label>Token Code</Label>
              <Input
                value={scanToken}
                onChange={e => setScanToken(e.target.value)}
                placeholder="Paste or type token..."
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => scanMut.mutate({ token: scanToken, type: "IN" })}
                disabled={!scanToken || scanMut.isPending}
              >
                {scanMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                Check In
              </Button>
              <Button
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                onClick={() => scanMut.mutate({ token: scanToken, type: "OUT" })}
                disabled={!scanToken || scanMut.isPending}
              >
                {scanMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogOut className="h-4 w-4 mr-2" />}
                Check Out
              </Button>
            </div>

            {lastAction && (
              <div className="flex items-center gap-2 text-emerald-600 text-sm border border-emerald-200 bg-emerald-50 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span><strong>{lastAction.name}</strong> checked {lastAction.type.toLowerCase()} at {lastAction.time}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import Link from "next/link"
import { Loader2, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

async function resetPassword(token: string, password: string) {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed")
  return data
}

function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(false)

  const mut = useMutation({
    mutationFn: () => resetPassword(token, password),
    onSuccess: () => {
      setDone(true)
      setTimeout(() => router.push("/login"), 3000)
    },
  })

  if (!token)
    return (
      <div className="text-muted-foreground text-center text-sm">
        Invalid reset link.{" "}
        <Link href="/forgot-password" className="underline">
          Request a new one.
        </Link>
      </div>
    )

  return done ? (
    <div className="space-y-4 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
      <div>
        <p className="font-medium">Password reset!</p>
        <p className="text-muted-foreground mt-1 text-sm">Redirecting to login…</p>
      </div>
    </div>
  ) : (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (password !== confirm) return
        mut.mutate()
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="password">New Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm Password</Label>
        <Input
          id="confirm"
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat password"
          required
        />
        {confirm && password !== confirm && (
          <p className="text-destructive text-xs">Passwords do not match</p>
        )}
      </div>
      {mut.isError && <p className="text-destructive text-sm">{(mut.error as Error).message}</p>}
      <Button
        type="submit"
        className="w-full gap-2"
        disabled={mut.isPending || !password || password !== confirm}
      >
        {mut.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
        Reset Password
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Reset Password</CardTitle>
          <CardDescription>Choose a new password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

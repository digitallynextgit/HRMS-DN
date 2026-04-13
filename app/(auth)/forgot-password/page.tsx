"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import Link from "next/link"
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

async function requestReset(email: string) {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed")
  return data
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  const mut = useMutation({
    mutationFn: requestReset,
    onSuccess: () => setSent(true),
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Forgot Password</CardTitle>
          <CardDescription>Enter your email to receive a reset link</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <div>
                <p className="font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground mt-1">
                  If <strong>{email}</strong> is associated with an account, you&apos;ll receive a reset link shortly.
                </p>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form
              onSubmit={e => { e.preventDefault(); mut.mutate(email) }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
              {mut.isError && (
                <p className="text-sm text-destructive">{(mut.error as Error).message}</p>
              )}
              <Button type="submit" className="w-full gap-2" disabled={mut.isPending || !email}>
                {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send Reset Link
              </Button>
              <div className="text-center">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3 w-3 inline mr-1" />Back to login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { auth } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import type { Metadata } from "next"
import { Building2 } from "lucide-react"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your HRMS account",
}

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 flex items-center justify-center gap-2.5">
        <div className="bg-foreground flex h-8 w-8 items-center justify-center rounded">
          <Building2 className="text-background h-4 w-4" />
        </div>
        <span className="text-lg font-semibold tracking-tight">HRMS</span>
      </div>

      {/* Heading */}
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-1 text-sm">Sign in to your account to continue</p>
      </div>

      {/* Form card */}
      <div className="border-border bg-card rounded-[var(--radius)] border p-6">
        <LoginForm />
      </div>

      <p className="text-muted-foreground mt-6 text-center text-xs">
        Having trouble signing in? Contact your HR administrator.
      </p>
    </div>
  )
}

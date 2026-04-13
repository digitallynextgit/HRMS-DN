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
      <div className="flex items-center justify-center gap-2.5 mb-8">
        <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
          <Building2 className="h-4 w-4 text-background" />
        </div>
        <span className="text-lg font-semibold tracking-tight">HRMS</span>
      </div>

      {/* Heading */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">Sign in to your account to continue</p>
      </div>

      {/* Form card */}
      <div className="border border-border rounded-[var(--radius)] bg-card p-6">
        <LoginForm />
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Having trouble signing in? Contact your HR administrator.
      </p>
    </div>
  )
}

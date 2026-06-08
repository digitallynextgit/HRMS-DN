import { auth } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import type { Metadata } from "next"
import Image from "next/image"
import { Check } from "lucide-react"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your DNMS account",
}

const HIGHLIGHTS = [
  "People, departments & org chart",
  "Projects, tasks & timesheets",
  "Payroll, leave & performance",
]

const MODULES = [
  "People",
  "Attendance",
  "Leave & WFH",
  "Payroll",
  "Projects",
  "Performance",
  "Recruitment",
  "Documents",
]

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* ── Brand panel (desktop only) - content hugs the divider ────────── */}
      <div className="relative hidden overflow-hidden border-r border-white/10 bg-linear-to-br from-neutral-900 via-neutral-950 to-black p-12 text-neutral-300 lg:flex lg:flex-col lg:items-center lg:justify-between xl:p-16">
        {/* decorative grid */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 82%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 82%)",
          }}
        />
        {/* ambient floating glows */}
        <div
          aria-hidden
          className="animate-dnms-float absolute top-0 right-0 h-112 w-md rounded-full bg-blue-500/15 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-dnms-float absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-red-500/10 blur-3xl"
          style={{ animationDelay: "-7s" }}
        />

        {/* logo */}
        <div className="relative z-10 w-full max-w-xl">
          <Image
            src="/logo_dark_bg.webp"
            alt="Digitally Next"
            width={1512}
            height={321}
            className="animate-dnms-walk h-12 w-auto"
          />
        </div>

        {/* value proposition */}
        <div className="relative z-10 w-full max-w-xl space-y-6 py-4">
          <h2
            className="animate-dnms-fade-up text-3xl leading-tight font-semibold tracking-tight text-balance text-white xl:text-4xl"
            style={{ animationDelay: "0.15s" }}
          >
            Run your entire team from one place.
          </h2>
          <p
            className="animate-dnms-fade-up leading-relaxed text-neutral-400"
            style={{ animationDelay: "0.25s" }}
          >
            Digitally Next Management System unifies HR, projects, payroll and performance - so
            everything your people need lives in a single workspace.
          </p>
          <ul className="space-y-2.5 pt-1">
            {HIGHLIGHTS.map((item, i) => (
              <li
                key={item}
                className="animate-dnms-fade-up flex items-center gap-3 text-sm text-neutral-300"
                style={{ animationDelay: `${0.35 + i * 0.1}s` }}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                  <Check className="h-3 w-3 text-white" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* footer */}
        <div className="relative z-10 w-full max-w-xl space-y-5">
          <p className="text-xs text-neutral-500">© 2026 Digitally Next. All rights reserved.</p>
        </div>
      </div>

      {/* ── Sign-in form panel - content hugs the divider ───────────────── */}
      <div className="flex items-center justify-center px-6 py-10 lg:px-12">
        <div className="animate-dnms-fade-up w-full max-w-md">
          {/* logo - mobile only (swaps with theme) */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/logo_white_bg.webp"
              alt="Digitally Next"
              width={1056}
              height={224}
              className="animate-dnms-walk h-9 w-auto dark:hidden"
            />
            <Image
              src="/logo_dark_bg.webp"
              alt="Digitally Next"
              width={1512}
              height={321}
              className="animate-dnms-walk hidden h-9 w-auto dark:block"
            />
          </div>

          {/* heading */}
          <div className="mb-6 space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground text-sm">Sign in to your account to continue</p>
          </div>

          <LoginForm />

          <p className="text-muted-foreground mt-6 text-center text-xs">
            Having trouble signing in? Contact your HR administrator.
          </p>
        </div>
      </div>
    </div>
  )
}

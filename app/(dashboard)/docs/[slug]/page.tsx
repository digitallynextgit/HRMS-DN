"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { RoleBadge } from "@/components/docs/role-badge"
import { GuideContent } from "@/components/docs/guide-content"

// ---------------------------------------------------------------------------
// Guide metadata
// ---------------------------------------------------------------------------

type Role = "employee" | "manager" | "hr" | "admin"

interface GuideInfo {
  slug: string
  title: string
  description: string
  roles: Role[]
}

const GUIDES: Record<string, GuideInfo> = {
  "getting-started": {
    slug: "getting-started",
    title: "Getting Started",
    description: "Login, navigation, and your first steps in HRMS",
    roles: ["employee", "manager", "hr", "admin"],
  },
  employees: {
    slug: "employees",
    title: "Employee Management",
    description: "Add, edit, view employee profiles and org chart",
    roles: ["hr", "admin"],
  },
  attendance: {
    slug: "attendance",
    title: "Attendance",
    description: "Track check-in/out, view your attendance history",
    roles: ["employee", "manager", "hr"],
  },
  leave: {
    slug: "leave",
    title: "Leave Management",
    description: "Apply for leave, check balances, approve team requests",
    roles: ["employee", "manager", "hr"],
  },
  payroll: {
    slug: "payroll",
    title: "Payroll & Payslips",
    description: "View your payslips, understand deductions, process payroll",
    roles: ["employee", "hr", "admin"],
  },
  documents: {
    slug: "documents",
    title: "Documents",
    description: "Upload, download, and manage company and employee files",
    roles: ["employee", "hr"],
  },
  admin: {
    slug: "admin",
    title: "Admin & Settings",
    description: "Roles, permissions, audit log, email templates",
    roles: ["admin"],
  },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GuideDetailPage() {
  const router = useRouter()
  const params = useParams()
  const slug = typeof params?.slug === "string" ? params.slug : ""

  const guide = GUIDES[slug]

  if (!guide) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">Guide not found</h3>
          <p className="text-sm text-muted-foreground">
            The guide you are looking for does not exist. It may have been moved or the link is incorrect.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/docs")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Help Center
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/docs")}
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Help Center
        </Button>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <PageHeader title={guide.title} description={guide.description} />
        {/* Role badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">For:</span>
          {guide.roles.map((role) => (
            <RoleBadge key={role} role={role} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Guide content */}
      <div className="max-w-3xl">
        <GuideContent slug={slug} />
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import {
  ChevronLeft,
  Mail,
  Phone,
  Pencil,
  Building2,
  Briefcase,
  Users,
  FileText,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useEmployee } from "@/hooks/use-employees"
import { usePermissions } from "@/hooks/use-permissions"
import { cn, getInitials, getAvatarColor, formatDate } from "@/lib/utils"
import {
  EMPLOYEE_STATUS_COLORS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  PERMISSIONS,
} from "@/lib/constants"

interface InfoRowProps {
  label: string
  value?: string | null
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-3">
        {children}
      </h3>
      <Separator className="mb-4" />
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}

export default function EmployeeProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const { data, isLoading, error } = useEmployee(id)
  const { can } = usePermissions()

  if (isLoading) return <ProfileSkeleton />

  if (error || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Employee not found.</p>
        <Button variant="outline" asChild>
          <Link href="/employees">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Employees
          </Link>
        </Button>
      </div>
    )
  }

  const emp = data.data
  const fullName = `${emp.firstName} ${emp.lastName}`
  const initials = getInitials(emp.firstName, emp.lastName)
  const avatarBg = getAvatarColor(fullName)
  const statusColor = EMPLOYEE_STATUS_COLORS[emp.status] ?? "bg-gray-100 text-gray-700"
  const statusLabel = EMPLOYEE_STATUS_LABELS[emp.status] ?? emp.status

  const ca = (emp.currentAddress ?? {}) as Record<string, string>
  const pa = (emp.permanentAddress ?? {}) as Record<string, string>
  const ec = (emp.emergencyContact ?? {}) as Record<string, string>

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/employees" className="flex items-center gap-1.5">
          <ChevronLeft className="h-4 w-4" />
          Back to Employees
        </Link>
      </Button>

      {/* Top profile card */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 shrink-0">
              {emp.profilePhoto ? (
                <AvatarFallback className={cn("text-white text-2xl font-bold", avatarBg)}>
                  {initials}
                </AvatarFallback>
              ) : (
                <AvatarFallback className={cn("text-white text-2xl font-bold", avatarBg)}>
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>

            {/* Name block */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
                    {emp.designation?.title && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />
                        {emp.designation.title}
                      </span>
                    )}
                    {emp.department?.name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {emp.department.name}
                      </span>
                    )}
                  </div>
                </div>

                {can(PERMISSIONS.EMPLOYEE_WRITE) && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/employees/${emp.id}/edit`} className="flex items-center gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>
                )}
              </div>

              {/* Badges row */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {emp.employeeNo}
                </Badge>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    statusColor
                  )}
                >
                  {statusLabel}
                </span>
              </div>

              {/* Contact row */}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <a href={`mailto:${emp.email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {emp.email}
                </a>
                {emp.phone && (
                  <a href={`tel:${emp.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {emp.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="mb-4">
          <TabsTrigger value="info" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Info
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Roles
          </TabsTrigger>
        </TabsList>

        {/* ── Info Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="info" className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardContent className="pt-6">
              <SectionHeader>Personal Information</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <InfoRow label="First Name" value={emp.firstName} />
                <InfoRow label="Last Name" value={emp.lastName} />
                <InfoRow label="Work Email" value={emp.email} />
                <InfoRow label="Personal Email" value={emp.personalEmail} />
                <InfoRow label="Work Phone" value={emp.phone} />
                <InfoRow label="Personal Phone" value={emp.personalPhone} />
                <InfoRow label="Date of Birth" value={formatDate(emp.dateOfBirth)} />
                <InfoRow label="Gender" value={emp.gender ?? undefined} />
                <InfoRow label="Nationality" value={emp.nationality} />
                <InfoRow label="Blood Group" value={emp.bloodGroup} />
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardContent className="pt-6">
              <SectionHeader>Employment Details</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <InfoRow label="Employee No" value={emp.employeeNo} />
                <InfoRow label="Department" value={emp.department?.name} />
                <InfoRow label="Designation" value={emp.designation?.title} />
                <InfoRow
                  label="Employment Type"
                  value={EMPLOYMENT_TYPE_LABELS[emp.employmentType] ?? emp.employmentType}
                />
                <InfoRow label="Status" value={statusLabel} />
                <InfoRow label="Work Location" value={emp.workLocation} />
                <InfoRow label="Date of Joining" value={formatDate(emp.dateOfJoining)} />
                <InfoRow label="Probation End" value={formatDate(emp.probationEndDate)} />
                <InfoRow
                  label="Manager"
                  value={
                    emp.manager
                      ? `${emp.manager.firstName} ${emp.manager.lastName}`
                      : undefined
                  }
                />
                <InfoRow
                  label="Subordinates"
                  value={String(emp._count?.subordinates ?? 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          {(ca.line1 || pa.line1) && (
            <Card>
              <CardContent className="pt-6">
                <SectionHeader>Address</SectionHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {ca.line1 && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Address</p>
                      <p className="text-sm font-medium">
                        {[ca.line1, ca.line2, ca.city, ca.state, ca.zip].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                  {pa.line1 && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Permanent Address</p>
                      <p className="text-sm font-medium">
                        {[pa.line1, pa.line2, pa.city, pa.state, pa.zip].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emergency Contact */}
          {ec.name && (
            <Card>
              <CardContent className="pt-6">
                <SectionHeader>Emergency Contact</SectionHeader>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <InfoRow label="Name" value={ec.name} />
                  <InfoRow label="Relation" value={ec.relation} />
                  <InfoRow label="Phone" value={ec.phone} />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Documents Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents
                {emp._count?.documents != null && (
                  <Badge variant="secondary">{emp._count.documents}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Documents will load here. The Documents module (M3) will populate this tab.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Roles Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Assigned Roles
                </CardTitle>
                {can(PERMISSIONS.ROLE_WRITE) && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/roles?employeeId=${emp.id}`}>
                      Manage Roles
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {emp.employeeRoles && emp.employeeRoles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {emp.employeeRoles.map((er) => (
                    <Badge key={er.id} variant="secondary" className="text-sm px-3 py-1">
                      {er.role.displayName}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No roles assigned.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

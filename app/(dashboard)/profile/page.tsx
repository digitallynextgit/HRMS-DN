"use client"

import Link from "next/link"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Mail,
  Phone,
  Pencil,
  Building2,
  Briefcase,
  Users,
  FileText,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/page-header"
import { useSession } from "next-auth/react"
import { useEmployee } from "@/hooks/use-employees"
import { cn, getInitials, getAvatarColor, formatDate } from "@/lib/utils"
import {
  EMPLOYEE_STATUS_COLORS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
} from "@/lib/constants"

async function changePassword(body: { currentPassword: string; newPassword: string }) {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed")
  return data
}

interface InfoRowProps {
  label: string
  value?: string | null
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">{label}</p>
      <p className="text-sm font-medium">{value || "-"}</p>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-foreground/80 mb-3 text-sm font-semibold tracking-wider uppercase">
        {children}
      </h3>
      <Separator className="mb-4" />
    </div>
  )
}

export default function ProfilePage() {
  const { data: session, status: sessionStatus } = useSession()
  const userId = session?.user?.id ?? null

  const { data, isLoading, error } = useEmployee(userId)

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPw, setShowPw] = useState(false)

  const pwMut = useMutation({
    mutationFn: () =>
      changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    onSuccess: () => {
      toast.success("Password changed")
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!data?.data || error) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-24 text-sm">
        Could not load your profile. Please try again later.
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
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="My Profile"
        description="View and manage your personal profile"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/employees/${emp.id}/edit`} className="flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit Profile
            </Link>
          </Button>
        }
      />

      {/* Top card */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            <Avatar className="h-24 w-24 shrink-0">
              {emp.profilePhoto ? (
                <AvatarFallback className={cn("text-2xl font-bold text-white", avatarBg)}>
                  {initials}
                </AvatarFallback>
              ) : (
                <AvatarFallback className={cn("text-2xl font-bold text-white", avatarBg)}>
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold tracking-tight">{fullName}</h2>

              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-sm">
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

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {emp.employeeNo}
                </Badge>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    statusColor,
                  )}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-4 text-sm">
                <a
                  href={`mailto:${emp.email}`}
                  className="hover:text-foreground flex items-center gap-1.5 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {emp.email}
                </a>
                {emp.phone && (
                  <a
                    href={`tel:${emp.phone}`}
                    className="hover:text-foreground flex items-center gap-1.5 transition-colors"
                  >
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
          <TabsTrigger value="security" className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Info tab */}
        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <SectionHeader>Personal Information</SectionHeader>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

          <Card>
            <CardContent className="pt-6">
              <SectionHeader>Employment Details</SectionHeader>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow label="Employee No" value={emp.employeeNo} />
                <InfoRow label="Department" value={emp.department?.name} />
                <InfoRow label="Designation" value={emp.designation?.title} />
                <InfoRow
                  label="Employment Type"
                  value={EMPLOYMENT_TYPE_LABELS[emp.employmentType] ?? emp.employmentType}
                />
                <InfoRow label="Work Location" value={emp.workLocation} />
                <InfoRow label="Date of Joining" value={formatDate(emp.dateOfJoining)} />
                <InfoRow label="Probation End" value={formatDate(emp.probationEndDate)} />
                <InfoRow
                  label="Manager"
                  value={
                    emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : undefined
                  }
                />
              </div>
            </CardContent>
          </Card>

          {(ca.line1 || pa.line1) && (
            <Card>
              <CardContent className="pt-6">
                <SectionHeader>Address</SectionHeader>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {ca.line1 && (
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground text-xs tracking-wide uppercase">
                        Current Address
                      </p>
                      <p className="text-sm font-medium">
                        {[ca.line1, ca.line2, ca.city, ca.state, ca.zip].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                  {pa.line1 && (
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground text-xs tracking-wide uppercase">
                        Permanent Address
                      </p>
                      <p className="text-sm font-medium">
                        {[pa.line1, pa.line2, pa.city, pa.state, pa.zip].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {ec.name && (
            <Card>
              <CardContent className="pt-6">
                <SectionHeader>Emergency Contact</SectionHeader>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <InfoRow label="Name" value={ec.name} />
                  <InfoRow label="Relation" value={ec.relation} />
                  <InfoRow label="Phone" value={ec.phone} />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                My Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Documents will load here once the Documents module is available.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles tab */}
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" />
                My Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {emp.employeeRoles && emp.employeeRoles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {emp.employeeRoles.map((er) => (
                    <Badge key={er.id} variant="secondary" className="px-3 py-1 text-sm">
                      {er.role.displayName}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No roles assigned.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security tab */}
        <TabsContent value="security">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input
                  type={showPw ? "text" : "password"}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Min. 8 characters"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input
                  type={showPw ? "text" : "password"}
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Repeat new password"
                />
                {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                  <p className="text-destructive text-xs">Passwords do not match</p>
                )}
              </div>
              <Button
                onClick={() => pwMut.mutate()}
                disabled={
                  pwMut.isPending ||
                  !pwForm.currentPassword ||
                  !pwForm.newPassword ||
                  pwForm.newPassword !== pwForm.confirmPassword
                }
              >
                {pwMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

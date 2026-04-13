"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Loader2, Briefcase, Users, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS, JOB_STATUS_LABELS, JOB_STATUS_COLORS } from "@/lib/constants"
import { cn, formatDate } from "@/lib/utils"

interface Department { id: string; name: string }
interface JobPosting {
  id: string
  title: string
  status: string
  location: string | null
  type: string
  closingDate: string | null
  createdAt: string
  department: { name: string } | null
  _count: { applicants: number }
}

async function fetchJobs(status?: string): Promise<{ data: JobPosting[] }> {
  const url = status ? `/api/recruitment/jobs?status=${status}` : "/api/recruitment/jobs"
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function fetchDepts(): Promise<{ data: Department[] }> {
  const res = await fetch("/api/departments")
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function createJob(body: Record<string, unknown>) {
  const res = await fetch("/api/recruitment/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]
const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", INTERNSHIP: "Internship", FREELANCE: "Freelance",
}

const emptyForm = { title: "", departmentId: "", location: "", type: "FULL_TIME", salaryMin: "", salaryMax: "", closingDate: "", status: "OPEN", description: "" }

export default function RecruitmentPage() {
  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.RECRUITMENT_WRITE)
  const qc = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<string>("")
  const { data: jobsData, isLoading } = useQuery({ queryKey: ["jobs", statusFilter], queryFn: () => fetchJobs(statusFilter || undefined) })
  const { data: deptsData } = useQuery({ queryKey: ["departments"], queryFn: fetchDepts })
  const jobs = jobsData?.data ?? []
  const depts = deptsData?.data ?? []

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const createMut = useMutation({
    mutationFn: createJob,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); toast.success("Job posting created"); setOpen(false); setForm(emptyForm) },
    onError: () => toast.error("Failed to create job posting"),
  })

  const totalApplicants = jobs.reduce((sum, j) => sum + j._count.applicants, 0)
  const openJobs = jobs.filter(j => j.status === "OPEN").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment"
        description="Manage job postings and applicant pipeline"
        actions={canWrite ? (
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Job
          </Button>
        ) : undefined}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{jobs.length}</p>
              <p className="text-xs text-muted-foreground">Total Postings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openJobs}</p>
              <p className="text-xs text-muted-foreground">Open Positions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalApplicants}</p>
              <p className="text-xs text-muted-foreground">Total Applicants</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {["", "OPEN", "DRAFT", "ON_HOLD", "CLOSED"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {s === "" ? "All" : JOB_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-lg border bg-card text-center">
          <Briefcase className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No job postings yet. Create your first one.</p>
          {canWrite && <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="mt-4">New Job Posting</Button>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map(job => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm leading-snug">{job.title}</CardTitle>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0", JOB_STATUS_COLORS[job.status])}>
                    {JOB_STATUS_LABELS[job.status]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{job.department?.name ?? "No Department"} · {JOB_TYPE_LABELS[job.type]}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Users className="h-3.5 w-3.5" />
                    <span>{job._count.applicants} applicant{job._count.applicants !== 1 ? "s" : ""}</span>
                  </div>
                  {job.location && <span className="text-xs text-muted-foreground">{job.location}</span>}
                </div>
                {job.closingDate && (
                  <p className="text-xs text-muted-foreground">Closes {formatDate(job.closingDate)}</p>
                )}
                <Link href={`/recruitment/jobs/${job.id}`}>
                  <Button variant="outline" size="sm" className="w-full gap-2 h-7 text-xs">
                    <ExternalLink className="h-3.5 w-3.5" /> View Pipeline
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Job Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Job Posting</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior Software Engineer" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.departmentId} onValueChange={v => setForm(f => ({ ...f, departmentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {depts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map(t => <SelectItem key={t} value={t}>{JOB_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Mumbai, Remote" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Salary (optional)</Label>
                <Input type="number" value={form.salaryMin} onChange={e => setForm(f => ({ ...f, salaryMin: e.target.value }))} placeholder="500000" />
              </div>
              <div className="space-y-1.5">
                <Label>Max Salary (optional)</Label>
                <Input type="number" value={form.salaryMax} onChange={e => setForm(f => ({ ...f, salaryMax: e.target.value }))} placeholder="1200000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Closing Date</Label>
                <Input type="date" value={form.closingDate} onChange={e => setForm(f => ({ ...f, closingDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Job description, requirements..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.title}>
              {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

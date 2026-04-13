"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Loader2, ArrowLeft, Mail, Phone, Calendar, FileText } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { APPLICANT_STAGE_LABELS, APPLICANT_STAGE_COLORS } from "@/lib/constants"
import { cn, formatDate } from "@/lib/utils"

interface Interview {
  id: string
  type: string
  scheduledAt: string
  result: string
  feedback: string | null
}

interface Applicant {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  stage: string
  appliedAt: string
  notes: string | null
  resumeUrl: string | null
  interviews: Interview[]
}

interface Job {
  id: string
  title: string
  status: string
  location: string | null
  type: string
  description: string | null
  closingDate: string | null
  department: { name: string } | null
  postedBy: { firstName: string; lastName: string } | null
  applicants: Applicant[]
}

const STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]
const INTERVIEW_TYPES = ["PHONE", "VIDEO", "IN_PERSON", "TECHNICAL", "HR"]
const INTERVIEW_RESULTS = ["PENDING", "PASSED", "FAILED", "NO_SHOW"]
const INTERVIEW_RESULT_LABELS: Record<string, string> = { PENDING: "Pending", PASSED: "Passed", FAILED: "Failed", NO_SHOW: "No Show" }

async function fetchJob(id: string): Promise<{ data: Job }> {
  const res = await fetch(`/api/recruitment/jobs/${id}`)
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function updateApplicant(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/recruitment/applicants/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function createApplicant(body: Record<string, unknown>) {
  const res = await fetch("/api/recruitment/applicants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function scheduleInterview(body: Record<string, unknown>) {
  const res = await fetch("/api/recruitment/interviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

const emptyApplicantForm = { firstName: "", lastName: "", email: "", phone: "", source: "", resumeUrl: "", notes: "" }
const emptyInterviewForm = { type: "PHONE", scheduledAt: "", notes: "" }

export default function JobPipelinePage() {
  const params = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["job", params.id], queryFn: () => fetchJob(params.id) })
  const job = data?.data

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(emptyApplicantForm)

  const [interviewOpen, setInterviewOpen] = useState(false)
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)
  const [iForm, setIForm] = useState(emptyInterviewForm)

  const addMut = useMutation({
    mutationFn: createApplicant,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", params.id] }); toast.success("Applicant added"); setAddOpen(false); setForm(emptyApplicantForm) },
    onError: () => toast.error("Failed to add applicant"),
  })

  const stageMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => updateApplicant(id, { stage }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", params.id] }); toast.success("Stage updated") },
    onError: () => toast.error("Failed to update stage"),
  })

  const interviewMut = useMutation({
    mutationFn: scheduleInterview,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", params.id] }); toast.success("Interview scheduled"); setInterviewOpen(false); setIForm(emptyInterviewForm) },
    onError: () => toast.error("Failed to schedule interview"),
  })

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-6 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-lg" />)}</div>
    </div>
  )

  if (!job) return null

  const grouped = STAGES.reduce((acc, s) => ({ ...acc, [s]: (job.applicants ?? []).filter(a => a.stage === s) }), {} as Record<string, Applicant[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/recruitment">
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <PageHeader
          title={job.title}
          description={`${job.department?.name ?? "No department"} · ${job.applicants?.length ?? 0} applicant${job.applicants?.length !== 1 ? "s" : ""}`}
          actions={
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Applicant
            </Button>
          }
        />
      </div>

      {/* Kanban pipeline */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {STAGES.map(stage => (
            <div key={stage} className="w-56 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", APPLICANT_STAGE_COLORS[stage])}>
                  {APPLICANT_STAGE_LABELS[stage]}
                </span>
                <span className="text-xs text-muted-foreground">{grouped[stage]?.length ?? 0}</span>
              </div>
              <div className="space-y-2">
                {(grouped[stage] ?? []).map(applicant => (
                  <Card key={applicant.id} className="cursor-default hover:shadow-sm transition-shadow">
                    <CardContent className="p-3 space-y-2">
                      <p className="font-medium text-sm">{applicant.firstName} {applicant.lastName}</p>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{applicant.email}</span>
                        </div>
                        {applicant.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{applicant.phone}</span>
                          </div>
                        )}
                        {applicant.resumeUrl && (
                          <div className="flex items-center gap-1.5 text-xs text-blue-600">
                            <FileText className="h-3 w-3" />
                            <a href={applicant.resumeUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">Resume</a>
                          </div>
                        )}
                      </div>
                      {applicant.interviews?.length > 0 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {applicant.interviews.length} interview{applicant.interviews.length !== 1 ? "s" : ""}
                        </div>
                      )}
                      <div className="flex flex-col gap-1 pt-1">
                        <Select value={applicant.stage} onValueChange={v => stageMut.mutate({ id: applicant.id, stage: v })}>
                          <SelectTrigger className="h-6 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES.map(s => <SelectItem key={s} value={s} className="text-xs">{APPLICANT_STAGE_LABELS[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => { setSelectedApplicant(applicant); setIForm(emptyInterviewForm); setInterviewOpen(true) }}
                        >
                          Schedule Interview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Applicant Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Applicant</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone (optional)</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Source (optional)</Label>
                <Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="LinkedIn, Referral..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Resume URL (optional)</Label>
              <Input value={form.resumeUrl} onChange={e => setForm(f => ({ ...f, resumeUrl: e.target.value }))} placeholder="https://drive.google.com/..." />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMut.mutate({ ...form, jobId: job.id })} disabled={addMut.isPending || !form.firstName || !form.email}>
              {addMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Add Applicant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      {selectedApplicant && (
        <Dialog open={interviewOpen} onOpenChange={setInterviewOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Interview — {selectedApplicant.firstName} {selectedApplicant.lastName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={iForm.type} onValueChange={v => setIForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTERVIEW_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date & Time</Label>
                  <Input type="datetime-local" value={iForm.scheduledAt} onChange={e => setIForm(f => ({ ...f, scheduledAt: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  value={iForm.notes}
                  onChange={e => setIForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInterviewOpen(false)}>Cancel</Button>
              <Button onClick={() => interviewMut.mutate({ ...iForm, applicantId: selectedApplicant.id })} disabled={interviewMut.isPending || !iForm.scheduledAt}>
                {interviewMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

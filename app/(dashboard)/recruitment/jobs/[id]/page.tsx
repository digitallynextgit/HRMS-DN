"use client"

import { useState, useRef } from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Loader2, ArrowLeft, Mail, Phone, Calendar, FileText, GripVertical, User } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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
  source: string | null
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

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  APPLIED:   { label: "Applied",   color: "text-blue-700 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",   dot: "bg-blue-500" },
  SCREENING: { label: "Screening", color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800", dot: "bg-yellow-500" },
  INTERVIEW: { label: "Interview", color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800", dot: "bg-purple-500" },
  OFFER:     { label: "Offer",     color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800", dot: "bg-orange-500" },
  HIRED:     { label: "Hired",     color: "text-green-700 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800",  dot: "bg-green-500" },
  REJECTED:  { label: "Rejected",  color: "text-red-700 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800",     dot: "bg-red-500" },
}

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

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function ApplicantCard({
  applicant,
  onDragStart,
  onScheduleInterview,
}: {
  applicant: Applicant
  onDragStart: (e: React.DragEvent, id: string) => void
  onScheduleInterview: (applicant: Applicant) => void
}) {
  const latestInterview = applicant.interviews?.[applicant.interviews.length - 1]

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, applicant.id)}
      className="bg-card border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-150 group select-none"
    >
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
          {getInitials(applicant.firstName, applicant.lastName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="font-medium text-sm leading-tight truncate">
              {applicant.firstName} {applicant.lastName}
            </p>
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/70 flex-shrink-0 transition-colors" />
          </div>

          {applicant.source && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{applicant.source}</p>
          )}
        </div>
      </div>

      <div className="mt-2.5 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mail className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{applicant.email}</span>
        </div>
        {applicant.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 flex-shrink-0" />
            <span>{applicant.phone}</span>
          </div>
        )}
        {applicant.resumeUrl && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
            <FileText className="h-3 w-3 flex-shrink-0" />
            <a
              href={applicant.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              View Resume
            </a>
          </div>
        )}
      </div>

      {latestInterview && (
        <div className="mt-2 pt-2 border-t flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span>
            {latestInterview.type.charAt(0) + latestInterview.type.slice(1).toLowerCase()} ·{" "}
            <span className={cn(
              latestInterview.result === "PASSED" && "text-green-600 dark:text-green-400",
              latestInterview.result === "FAILED" && "text-red-600 dark:text-red-400",
              latestInterview.result === "PENDING" && "text-yellow-600 dark:text-yellow-400",
            )}>
              {latestInterview.result.charAt(0) + latestInterview.result.slice(1).toLowerCase()}
            </span>
          </span>
        </div>
      )}

      <button
        onClick={() => onScheduleInterview(applicant)}
        className="mt-2.5 w-full text-xs text-center py-1.5 rounded-md border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        + Schedule Interview
      </button>
    </div>
  )
}

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
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const dragApplicantId = useRef<string | null>(null)

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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragApplicantId.current = id
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverStage(stage)
  }

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault()
    setDragOverStage(null)
    const id = dragApplicantId.current
    if (!id) return
    const applicant = job?.applicants.find(a => a.id === id)
    if (!applicant || applicant.stage === targetStage) return
    stageMut.mutate({ id, stage: targetStage })
    dragApplicantId.current = null
  }

  const handleDragEnd = () => {
    setDragOverStage(null)
    dragApplicantId.current = null
  }

  if (isLoading) return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-10 w-64" />
      <div className="flex gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-96 w-64 rounded-xl" />)}</div>
    </div>
  )

  if (!job) return null

  const grouped = STAGES.reduce((acc, s) => ({
    ...acc,
    [s]: (job.applicants ?? []).filter(a => a.stage === s),
  }), {} as Record<string, Applicant[]>)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <Link href="/recruitment">
            <Button variant="ghost" size="sm" className="gap-1.5 h-8">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{job.title}</h1>
            <p className="text-sm text-muted-foreground">
              {job.department?.name ?? "No department"} · {job.location ?? "Remote"} ·{" "}
              <span className="font-medium">{job.applicants?.length ?? 0} applicant{job.applicants?.length !== 1 ? "s" : ""}</span>
            </p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Applicant
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-6 h-full min-w-max">
          {STAGES.map(stage => {
            const cfg = STAGE_CONFIG[stage]
            const cards = grouped[stage] ?? []
            const isOver = dragOverStage === stage

            return (
              <div
                key={stage}
                className="flex flex-col w-72 shrink-0"
                onDragOver={(e) => handleDragOver(e, stage)}
                onDrop={(e) => handleDrop(e, stage)}
                onDragLeave={() => setDragOverStage(null)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dot)} />
                    <span className={cn("text-sm font-semibold", cfg.color)}>{cfg.label}</span>
                  </div>
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium">
                    {cards.length}
                  </Badge>
                </div>

                {/* Drop zone */}
                <div
                  className={cn(
                    "flex-1 rounded-xl border-2 border-dashed p-2 transition-all duration-150 min-h-[200px]",
                    isOver
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-transparent bg-muted/40"
                  )}
                >
                  <div className="space-y-2">
                    {cards.map(applicant => (
                      <ApplicantCard
                        key={applicant.id}
                        applicant={applicant}
                        onDragStart={handleDragStart}
                        onScheduleInterview={(a) => { setSelectedApplicant(a); setIForm(emptyInterviewForm); setInterviewOpen(true) }}
                      />
                    ))}
                  </div>

                  {cards.length === 0 && (
                    <div className={cn(
                      "h-24 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed",
                      isOver ? "border-primary/50 bg-primary/5" : "border-muted-foreground/20"
                    )}>
                      <User className="h-4 w-4 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground/50">Drop here</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
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
            <Button
              onClick={() => addMut.mutate({ ...form, jobId: job.id })}
              disabled={addMut.isPending || !form.firstName || !form.email}
            >
              {addMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Applicant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      {selectedApplicant && (
        <Dialog open={interviewOpen} onOpenChange={setInterviewOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Schedule Interview — {selectedApplicant.firstName} {selectedApplicant.lastName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={iForm.type} onValueChange={v => setIForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTERVIEW_TYPES.map(t => (
                        <SelectItem key={t} value={t}>
                          {t.charAt(0) + t.slice(1).toLowerCase().replace("_", " ")}
                        </SelectItem>
                      ))}
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
              <Button
                onClick={() => interviewMut.mutate({ ...iForm, applicantId: selectedApplicant.id })}
                disabled={interviewMut.isPending || !iForm.scheduledAt}
              >
                {interviewMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

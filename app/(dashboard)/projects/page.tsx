"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, FolderKanban, Calendar, Users, MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, TASK_PRIORITY_LABELS } from "@/lib/constants"
import { formatDate, cn } from "@/lib/utils"
import Link from "next/link"

interface Project {
  id: string
  name: string
  code: string
  description: string | null
  status: string
  priority: string
  startDate: string | null
  endDate: string | null
  budget: number | null
  owner: { id: string; firstName: string; lastName: string }
  members: { employee: { id: string; firstName: string; lastName: string; profilePhoto: string | null } }[]
  _count: { tasks: number }
}

async function fetchProjects(): Promise<{ data: Project[] }> {
  const res = await fetch("/api/projects?limit=100")
  if (!res.ok) throw new Error("Failed to fetch projects")
  return res.json()
}

async function createProject(body: Record<string, unknown>) {
  const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error("Failed to create project")
  return res.json()
}

async function updateProject(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error("Failed to update project")
  return res.json()
}

export default function ProjectsPage() {
  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.PROJECT_WRITE)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ["projects"], queryFn: fetchProjects })
  const projects = data?.data ?? []

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", code: "", description: "", status: "PLANNING", priority: "MEDIUM", startDate: "", endDate: "" })

  const createMut = useMutation({
    mutationFn: createProject,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Project created"); setOpen(false); setForm({ name: "", code: "", description: "", status: "PLANNING", priority: "MEDIUM", startDate: "", endDate: "" }) },
    onError: () => toast.error("Failed to create project"),
  })

  const archiveMut = useMutation({
    mutationFn: ({ id }: { id: string }) => updateProject(id, { isArchived: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Project archived") },
    onError: () => toast.error("Failed to archive project"),
  })

  const statusGroups: Record<string, Project[]> = {
    PLANNING: projects.filter(p => p.status === "PLANNING"),
    ACTIVE: projects.filter(p => p.status === "ACTIVE"),
    ON_HOLD: projects.filter(p => p.status === "ON_HOLD"),
    COMPLETED: projects.filter(p => p.status === "COMPLETED"),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage projects, tasks, and team assignments"
        actions={canWrite ? (
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        ) : undefined}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-lg border bg-card text-center">
          <FolderKanban className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No projects yet.</p>
          {canWrite && <Button className="mt-4 gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Create First Project</Button>}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(statusGroups).map(([status, group]) => group.length === 0 ? null : (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", PROJECT_STATUS_COLORS[status])}>
                  {PROJECT_STATUS_LABELS[status]}
                </span>
                <span className="text-xs text-muted-foreground">{group.length} project{group.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.map(project => (
                  <div key={project.id} className="rounded-lg border bg-card p-4 flex flex-col gap-3 hover:border-foreground/20 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link href={`/projects/${project.id}`} className="font-medium text-sm hover:underline line-clamp-1">{project.name}</Link>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{project.code}</p>
                      </div>
                      {canWrite && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/projects/${project.id}`}>View Details</Link></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => archiveMut.mutate({ id: project.id })} className="text-destructive">Archive</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {project.description && <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><FolderKanban className="h-3 w-3" />{project._count.tasks} tasks</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{project.members.length} members</span>
                      {project.endDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(project.endDate)}</span>}
                    </div>

                    <div className="flex items-center gap-1">
                      {project.members.slice(0, 5).map(m => (
                        <div key={m.employee.id} title={`${m.employee.firstName} ${m.employee.lastName}`}
                          className="h-6 w-6 rounded-full bg-muted border border-background flex items-center justify-center text-[10px] font-medium">
                          {m.employee.firstName[0]}{m.employee.lastName[0]}
                        </div>
                      ))}
                      {project.members.length > 5 && <span className="text-xs text-muted-foreground ml-1">+{project.members.length - 5}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Project Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Website Redesign" />
              </div>
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="WEB-01" maxLength={10} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate({ ...form, startDate: form.startDate || null, endDate: form.endDate || null })} disabled={createMut.isPending || !form.name || !form.code}>
              {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { toast } from "sonner"
import { Plus, FolderKanban, Calendar, Users, MoreHorizontal, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS } from "@/lib/constants"
import { formatDate, cn, getInitials } from "@/lib/utils"
import { ProjectFormDialog } from "@/components/projects/project-form-dialog"
import { ViewToggle, useViewMode } from "@/components/shared/view-toggle"

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
  owner: { id: string; firstName: string; lastName: string; profilePhoto: string | null }
  members: { employee: { id: string; firstName: string; lastName: string; profilePhoto: string | null } }[]
  _count: { tasks: number; teams?: number; resources?: number }
}

const KANBAN_COLUMNS: { id: string; color: string }[] = [
  { id: "PLANNING",  color: "bg-slate-50 dark:bg-slate-900/40" },
  { id: "ACTIVE",    color: "bg-blue-50 dark:bg-blue-950/30" },
  { id: "ON_HOLD",   color: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "COMPLETED", color: "bg-emerald-50 dark:bg-emerald-950/30" },
]

async function fetchProjects(): Promise<{ data: Project[] }> {
  const res = await fetch("/api/projects?limit=100")
  if (!res.ok) throw new Error("Failed to fetch projects")
  return res.json()
}

async function archiveProject(id: string) {
  const res = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isArchived: true }),
  })
  if (!res.ok) throw new Error("Failed to archive project")
  return res.json()
}

async function updateProjectStatus(id: string, status: string) {
  const res = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error("Failed to update status")
  return res.json()
}

export default function ProjectsPage() {
  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.PROJECT_WRITE)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ["projects"], queryFn: fetchProjects })
  const projects = data?.data ?? []

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [viewMode, setViewMode] = useViewMode("projects:list")

  const archiveMut = useMutation({
    mutationFn: archiveProject,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Project archived") },
    onError: () => toast.error("Failed to archive project"),
  })

  const statusGroups: Record<string, Project[]> = {
    PLANNING:  projects.filter((p) => p.status === "PLANNING"),
    ACTIVE:    projects.filter((p) => p.status === "ACTIVE"),
    ON_HOLD:   projects.filter((p) => p.status === "ON_HOLD"),
    COMPLETED: projects.filter((p) => p.status === "COMPLETED"),
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const { draggableId, destination, source } = result
    if (destination.droppableId === source.droppableId) return
    if (!canWrite) return

    const newStatus = destination.droppableId

    // Optimistic update
    qc.setQueryData(["projects"], (old: { data: Project[] } | undefined) => {
      if (!old) return old
      return { ...old, data: old.data.map((p) => p.id === draggableId ? { ...p, status: newStatus } : p) }
    })

    updateProjectStatus(draggableId, newStatus)
      .then(() => qc.invalidateQueries({ queryKey: ["projects"] }))
      .catch(() => {
        qc.invalidateQueries({ queryKey: ["projects"] })
        toast.error("Failed to move project")
      })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage projects, teams, tasks, and resources."
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle value={viewMode} onChange={setViewMode} showKanban />
            {canWrite && (
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> New Project
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        viewMode === "kanban" ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {KANBAN_COLUMNS.map((c) => (
              <div key={c.id} className="space-y-2">
                <Skeleton className="h-5 w-24 rounded" />
                <Skeleton className="h-36 rounded-xl" />
                <Skeleton className="h-36 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-lg" />)}
          </div>
        )
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-lg border bg-card text-center">
          <FolderKanban className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No projects yet.</p>
          {canWrite && (
            <Button className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />Create First Project
            </Button>
          )}
        </div>
      ) : viewMode === "kanban" ? (
        /* ── Kanban board ── */
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
            {KANBAN_COLUMNS.map((col) => {
              const group = statusGroups[col.id] ?? []
              return (
                <div key={col.id} className="flex flex-col min-w-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      PROJECT_STATUS_COLORS[col.id],
                    )}>
                      {PROJECT_STATUS_LABELS[col.id]}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{group.length}</Badge>
                  </div>

                  <Droppable droppableId={col.id} isDropDisabled={!canWrite}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 min-h-32 rounded-xl p-2 space-y-2 transition-colors",
                          col.color,
                          snapshot.isDraggingOver && "ring-2 ring-primary/40",
                        )}
                      >
                        {group.map((project, index) => (
                          <Draggable
                            key={project.id}
                            draggableId={project.id}
                            index={index}
                            isDragDisabled={!canWrite}
                          >
                            {(drag, snap) => (
                              <div
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                className={cn(
                                  "bg-background rounded-lg border p-3 shadow-sm select-none",
                                  snap.isDragging && "shadow-lg ring-2 ring-primary/50 rotate-1",
                                )}
                              >
                                {/* drag handle + menu row */}
                                <div className="flex items-start justify-between gap-1 mb-2">
                                  <div
                                    {...drag.dragHandleProps}
                                    className="mt-0.5 cursor-grab active:cursor-grabbing"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                                  </div>
                                  <div className="flex-1 min-w-0 -ml-1">
                                    <Link
                                      href={`/projects/${project.id}`}
                                      className="text-sm font-medium leading-snug hover:underline line-clamp-2 block"
                                    >
                                      {project.name}
                                    </Link>
                                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{project.code}</p>
                                  </div>
                                  {canWrite && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-1">
                                          <MoreHorizontal className="h-3.5 w-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                          <Link href={`/projects/${project.id}`}>View Details</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setEditing(project)}>Edit</DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => { if (confirm(`Archive "${project.name}"?`)) archiveMut.mutate(project.id) }}
                                        >
                                          Archive
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>

                                {project.description && (
                                  <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{project.description}</p>
                                )}

                                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                  <Badge
                                    variant="outline"
                                    className={cn("text-[10px] py-0", TASK_PRIORITY_COLORS[project.priority])}
                                  >
                                    {TASK_PRIORITY_LABELS[project.priority]}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <FolderKanban className="h-3 w-3" />{project._count.tasks}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <Users className="h-3 w-3" />{project.members.length}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <Avatar className="h-5 w-5">
                                      {project.owner.profilePhoto && <AvatarImage src={project.owner.profilePhoto} />}
                                      <AvatarFallback className="text-[8px]">
                                        {getInitials(project.owner.firstName, project.owner.lastName)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-[10px] text-muted-foreground">{project.owner.firstName}</span>
                                  </div>
                                  {project.startDate && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                      <Calendar className="h-3 w-3" />{formatDate(project.startDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {group.length === 0 && !snapshot.isDraggingOver && (
                          <p className="text-[11px] text-muted-foreground/50 text-center py-6">No projects</p>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      ) : (
        /* ── Card / Table views ── */
        <div className="space-y-6">
          {Object.entries(statusGroups).map(([status, group]) => group.length === 0 ? null : (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  PROJECT_STATUS_COLORS[status],
                )}>
                  {PROJECT_STATUS_LABELS[status]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {group.length} project{group.length !== 1 ? "s" : ""}
                </span>
              </div>

              {viewMode === "table" ? (
                <div className="rounded-lg border bg-card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="px-4 py-2.5 font-medium">Code</th>
                        <th className="px-4 py-2.5 font-medium">Name</th>
                        <th className="px-4 py-2.5 font-medium">Account Manager</th>
                        <th className="px-4 py-2.5 font-medium text-center">Tasks</th>
                        <th className="px-4 py-2.5 font-medium text-center">Members</th>
                        {canWrite && <th className="px-4 py-2.5 font-medium text-right">Budget</th>}
                        <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.map((project) => (
                        <tr key={project.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs">{project.code}</td>
                          <td className="px-4 py-2.5">
                            <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                              {project.name}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                {project.owner.profilePhoto && <AvatarImage src={project.owner.profilePhoto} />}
                                <AvatarFallback className="text-[9px]">
                                  {getInitials(project.owner.firstName, project.owner.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs">{project.owner.firstName} {project.owner.lastName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground">{project._count.tasks}</td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground">{project.members.length}</td>
                          {canWrite && (
                            <td className="px-4 py-2.5 text-right text-xs">
                              {project.budget != null ? `₹${project.budget.toLocaleString("en-IN")}` : <span className="text-muted-foreground">—</span>}
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-right">
                            {canWrite ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/projects/${project.id}`}>View Details</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setEditing(project)}>Edit</DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => { if (confirm(`Archive "${project.name}"?`)) archiveMut.mutate(project.id) }}
                                  >
                                    Archive
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                                <Link href={`/projects/${project.id}`}>Open</Link>
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.map((project) => (
                    <div
                      key={project.id}
                      className="rounded-lg border bg-card p-4 flex flex-col gap-3 hover:border-foreground/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-medium text-sm hover:underline line-clamp-1"
                          >
                            {project.name}
                          </Link>
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
                              <DropdownMenuItem asChild>
                                <Link href={`/projects/${project.id}`}>View Details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditing(project)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => { if (confirm(`Archive "${project.name}"?`)) archiveMut.mutate(project.id) }}
                              >
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                      )}

                      <div className="flex items-center gap-2 text-xs">
                        <Avatar className="h-5 w-5">
                          {project.owner.profilePhoto && <AvatarImage src={project.owner.profilePhoto} />}
                          <AvatarFallback className="text-[9px]">
                            {getInitials(project.owner.firstName, project.owner.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground">Account Manager:</span>
                        <span className="font-medium">{project.owner.firstName} {project.owner.lastName}</span>
                      </div>

                      <div className="text-muted-foreground flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <FolderKanban className="h-3 w-3" />{project._count.tasks} tasks
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />{project.members.length} members
                        </span>
                        {project.endDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />{formatDate(project.endDate)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {project.members.slice(0, 5).map((m) => (
                          <Avatar key={m.employee.id} className="h-6 w-6 border-2 border-background -ml-1 first:ml-0">
                            {m.employee.profilePhoto && <AvatarImage src={m.employee.profilePhoto} />}
                            <AvatarFallback className="text-[9px]">
                              {getInitials(m.employee.firstName, m.employee.lastName)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {project.members.length > 5 && (
                          <span className="text-muted-foreground ml-1 text-xs">+{project.members.length - 5}</span>
                        )}
                      </div>

                      {canWrite && project.budget !== null && (
                        <div className="text-[11px] text-muted-foreground">
                          Budget: <span className="text-foreground font-medium">₹{project.budget.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ProjectFormDialog open={createOpen} onClose={() => setCreateOpen(false)} mode="create" />
      {editing && (
        <ProjectFormDialog
          open={!!editing}
          onClose={() => setEditing(null)}
          mode="edit"
          projectId={editing.id}
          initial={{
            name:             editing.name,
            code:             editing.code,
            description:      editing.description ?? "",
            status:           editing.status,
            priority:         editing.priority,
            startDate:        editing.startDate ? editing.startDate.split("T")[0] : "",
            budget:           editing.budget != null ? String(editing.budget) : "",
            accountManagerId: editing.owner.id,
          }}
        />
      )}
    </div>
  )
}

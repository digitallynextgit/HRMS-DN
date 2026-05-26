"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, FolderKanban, Calendar, Users, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "@/lib/constants"
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] })
      toast.success("Project archived")
    },
    onError: () => toast.error("Failed to archive project"),
  })

  const statusGroups: Record<string, Project[]> = {
    PLANNING: projects.filter((p) => p.status === "PLANNING"),
    ACTIVE: projects.filter((p) => p.status === "ACTIVE"),
    ON_HOLD: projects.filter((p) => p.status === "ON_HOLD"),
    COMPLETED: projects.filter((p) => p.status === "COMPLETED"),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage projects, teams, tasks, and resources."
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle value={viewMode} onChange={setViewMode} />
            {canWrite && (
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> New Project
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-lg" />)}
        </div>
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
      ) : (
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
                                    onClick={() => {
                                      if (confirm(`Archive "${project.name}"?`)) archiveMut.mutate(project.id)
                                    }}
                                    className="text-destructive"
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
                            <DropdownMenuItem onClick={() => setEditing(project)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm(`Archive "${project.name}"?`)) archiveMut.mutate(project.id)
                              }}
                              className="text-destructive"
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

                    {/* Account Manager */}
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
                        <FolderKanban className="h-3 w-3" />
                        {project._count.tasks} tasks
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {project.members.length} members
                      </span>
                      {project.endDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(project.endDate)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {project.members.slice(0, 5).map((m) => (
                        <Avatar
                          key={m.employee.id}
                          className="h-6 w-6 border-2 border-background -ml-1 first:ml-0"
                          title={`${m.employee.firstName} ${m.employee.lastName}`}
                        >
                          {m.employee.profilePhoto && <AvatarImage src={m.employee.profilePhoto} />}
                          <AvatarFallback className="text-[9px]">
                            {getInitials(m.employee.firstName, m.employee.lastName)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {project.members.length > 5 && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          +{project.members.length - 5}
                        </span>
                      )}
                    </div>

                    {/* Budget — admin only */}
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

      {/* Create dialog */}
      <ProjectFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
      />

      {/* Edit dialog */}
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

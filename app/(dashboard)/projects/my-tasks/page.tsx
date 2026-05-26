"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Link from "next/link"
import { CheckSquare, AlertTriangle, Clock, Inbox } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS, TASK_STATUS_COLORS } from "@/lib/constants"
import { formatDate, cn } from "@/lib/utils"
import { ViewToggle, useViewMode } from "@/components/shared/view-toggle"

interface MyTask {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  loggedHours: number
  estimatedHours: number | null
  approvalStatus: "APPROVED" | "PENDING_APPROVAL" | "REJECTED"
  rejectionReason: string | null
  project: { id: string; name: string; code: string }
  team?: { id: string; name: string } | null
}

async function fetchMyTasks(): Promise<{ data: MyTask[] }> {
  const res = await fetch("/api/tasks?mine=true")
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function updateTask(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

export default function MyTasksPage() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [viewMode, setViewMode] = useViewMode("my-tasks")
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ["my-tasks"], queryFn: fetchMyTasks })

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateTask(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tasks"] })
      toast.success("Task updated")
    },
    onError: () => toast.error("Failed to update"),
  })

  const tasks = useMemo(() => {
    return (data?.data ?? []).filter(
      (t) => statusFilter === "all" || t.status === statusFilter,
    )
  }, [data, statusFilter])

  // Group by project → team
  const grouped = useMemo(() => {
    const groups: Record<string, { project: MyTask["project"]; tasks: MyTask[] }> = {}
    tasks.forEach((t) => {
      const key = t.project.id
      if (!groups[key]) groups[key] = { project: t.project, tasks: [] }
      groups[key].tasks.push(t)
    })
    return Object.values(groups)
  }, [tasks])

  const pendingApproval = tasks.filter((t) => t.approvalStatus === "PENDING_APPROVAL")
  const overdueCount = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE",
  ).length

  return (
    <div className="space-y-6">
      <PageHeader title="My Tasks" description="Tasks assigned to you across all projects." />

      {/* Summary strip */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
            <Stat label="Total" value={tasks.length} />
            <Stat label="Done" value={tasks.filter((t) => t.status === "DONE").length} tone="emerald" />
            <Stat label="Pending approval" value={pendingApproval.length} tone={pendingApproval.length > 0 ? "amber" : "default"} />
            <Stat label="Overdue" value={overdueCount} tone={overdueCount > 0 ? "red" : "default"} />
          </div>
        </CardContent>
      </Card>

      {/* Pending approval callout */}
      {pendingApproval.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              <p className="text-sm font-medium">Awaiting manager approval ({pendingApproval.length})</p>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {pendingApproval.map((t) => (
                <li key={t.id}>· <span className="text-foreground">{t.title}</span> — {t.project.name}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Filter + view toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Groups or table */}
      {isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : grouped.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No tasks match the filter.</p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-medium w-32">Status</th>
                    <th className="px-4 py-2.5 font-medium">Task</th>
                    <th className="px-4 py-2.5 font-medium">Project</th>
                    <th className="px-4 py-2.5 font-medium">Team</th>
                    <th className="px-4 py-2.5 font-medium">Priority</th>
                    <th className="px-4 py-2.5 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.map((task) => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE"
                    const isPending = task.approvalStatus === "PENDING_APPROVAL"
                    const isRejected = task.approvalStatus === "REJECTED"
                    return (
                      <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <Select
                            value={task.status}
                            disabled={isPending || isRejected}
                            onValueChange={(v) => updateMut.mutate({ id: task.id, status: v })}
                          >
                            <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TODO">To Do</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="IN_REVIEW">In Review</SelectItem>
                              <SelectItem value="DONE">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{task.title}</p>
                            {isPending && <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"><Clock className="h-3 w-3 mr-0.5 inline" />Pending</Badge>}
                            {isRejected && <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700">Rejected</Badge>}
                            {isOverdue && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700"><AlertTriangle className="h-3 w-3 mr-0.5 inline" />Overdue</Badge>}
                          </div>
                          {task.rejectionReason && <p className="text-[11px] text-red-700 mt-0.5">Reason: {task.rejectionReason}</p>}
                        </td>
                        <td className="px-4 py-2.5">
                          <Link href={`/projects/${task.project.id}`} className="text-xs hover:underline">{task.project.name}</Link>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{task.team?.name ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className={cn("text-[10px]", TASK_PRIORITY_COLORS[task.priority])}>{TASK_PRIORITY_LABELS[task.priority]}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {task.dueDate ? formatDate(task.dueDate) : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        grouped.map(({ project, tasks }) => (
          <Card key={project.id}>
            <CardContent className="p-4">
              <Link href={`/projects/${project.id}`} className="text-sm font-semibold hover:underline inline-block mb-3">
                {project.name} <Badge variant="outline" className="ml-2 font-mono text-[10px]">{project.code}</Badge>
              </Link>
              <div className="space-y-2">
                {tasks.map((task) => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE"
                  const isPending = task.approvalStatus === "PENDING_APPROVAL"
                  const isRejected = task.approvalStatus === "REJECTED"

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded border",
                        isOverdue && "border-red-200 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20",
                        isPending && "border-amber-200 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20",
                        isRejected && "border-red-200 bg-red-50/40",
                        !isOverdue && !isPending && !isRejected && "border-border",
                      )}
                    >
                      <Select
                        value={task.status}
                        disabled={isPending || isRejected}
                        onValueChange={(v) => updateMut.mutate({ id: task.id, status: v })}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TODO">To Do</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="IN_REVIEW">In Review</SelectItem>
                          <SelectItem value="DONE">Done</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          {isPending && <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200"><Clock className="h-3 w-3 mr-0.5 inline" />Pending</Badge>}
                          {isRejected && <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-200">Rejected</Badge>}
                          {isOverdue && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200"><AlertTriangle className="h-3 w-3 mr-0.5 inline" />Overdue</Badge>}
                        </div>
                        {task.rejectionReason && (
                          <p className="text-[11px] text-red-700 mt-0.5">Reason: {task.rejectionReason}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                          {task.team && <span>{task.team.name}</span>}
                          {task.team && (task.dueDate || task.priority) && <span>·</span>}
                          <Badge variant="outline" className={cn("text-[10px]", TASK_PRIORITY_COLORS[task.priority])}>{TASK_PRIORITY_LABELS[task.priority]}</Badge>
                          {task.dueDate && <span>Due {formatDate(task.dueDate)}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "emerald" | "amber" | "red" }) {
  const color =
    tone === "emerald" && value > 0 ? "text-emerald-600 dark:text-emerald-400"
    : tone === "amber" && value > 0 ? "text-amber-600 dark:text-amber-400"
    : tone === "red" && value > 0 ? "text-red-600 dark:text-red-400"
    : "text-foreground"
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", color)}>{value}</p>
    </div>
  )
}

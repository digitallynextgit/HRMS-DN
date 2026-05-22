"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Loader2, ChevronLeft, Calendar, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from "@/lib/constants"
import { formatDate, cn } from "@/lib/utils"
import Link from "next/link"

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  estimatedHours: number | null
  loggedHours: number
  tags: string[]
  assignee: { id: string; firstName: string; lastName: string; profilePhoto: string | null } | null
}

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
  members: { role: string; employee: { id: string; firstName: string; lastName: string } }[]
  tasks: Task[]
  _count: { tasks: number }
}

async function fetchProject(id: string): Promise<{ data: Project }> {
  const res = await fetch(`/api/projects/${id}`)
  if (!res.ok) throw new Error("Failed to fetch project")
  return res.json()
}

async function createTask(projectId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/projects/${projectId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? "Failed to create task")
  }
  return res.json()
}

async function updateTask(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("Failed to update task")
  return res.json()
}

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id),
  })
  const project = data?.data

  const [taskOpen, setTaskOpen] = useState(false)
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
    estimatedHours: "",
  })

  const createTaskMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => createTask(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", id] })
      toast.success("Task created")
      setTaskOpen(false)
      setTaskForm({
        title: "",
        description: "",
        priority: "MEDIUM",
        dueDate: "",
        estimatedHours: "",
      })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create task"),
  })

  const updateTaskMut = useMutation({
    mutationFn: ({ taskId, ...body }: { taskId: string } & Record<string, unknown>) =>
      updateTask(taskId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", id] })
      toast.success("Task updated")
    },
    onError: () => toast.error("Failed to update task"),
  })

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {TASK_STATUSES.map((s) => (
            <Skeleton key={s} className="h-64 rounded" />
          ))}
        </div>
      </div>
    )

  if (!project) return <div className="text-muted-foreground text-sm">Project not found.</div>

  const tasksByStatus: Record<string, Task[]> = {}
  TASK_STATUSES.forEach((s) => {
    tasksByStatus[s] = project.tasks.filter((t) => t.status === s)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href="/projects">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <span className="text-muted-foreground font-mono text-xs">{project.code}</span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                PROJECT_STATUS_COLORS[project.status],
              )}
            >
              {PROJECT_STATUS_LABELS[project.status]}
            </span>
          </div>
          {project.description && (
            <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
              {project.description}
            </p>
          )}
        </div>
        <Button onClick={() => setTaskOpen(true)} className="gap-2" size="sm">
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </div>

      {/* Stats */}
      <div className="text-muted-foreground flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {project.members.length} members
        </span>
        {project.startDate && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Started {formatDate(project.startDate)}
          </span>
        )}
        {project.endDate && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Due {formatDate(project.endDate)}
          </span>
        )}
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TASK_STATUSES.map((status) => (
          <div key={status} className="bg-card rounded border">
            <div className="flex items-center justify-between border-b px-3 py-2.5">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  TASK_STATUS_COLORS[status],
                )}
              >
                {TASK_STATUS_LABELS[status]}
              </span>
              <span className="text-muted-foreground text-xs">{tasksByStatus[status].length}</span>
            </div>
            <div className="min-h-[200px] space-y-2 p-2">
              {tasksByStatus[status].map((task) => (
                <div key={task.id} className="bg-background group space-y-2 rounded border p-2.5">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm leading-tight font-medium">{task.title}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px]",
                        TASK_PRIORITY_COLORS[task.priority],
                      )}
                    >
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                  {task.assignee && (
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <div className="bg-muted flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-medium">
                        {task.assignee.firstName[0]}
                        {task.assignee.lastName[0]}
                      </div>
                      {task.assignee.firstName} {task.assignee.lastName}
                    </div>
                  )}
                  {task.dueDate && (
                    <p className="text-muted-foreground text-[11px]">{formatDate(task.dueDate)}</p>
                  )}
                  <Select
                    value={task.status}
                    onValueChange={(v) => updateTaskMut.mutate({ taskId: task.id, status: v })}
                  >
                    <SelectTrigger className="h-6 px-2 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {TASK_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(v) => setTaskForm((f) => ({ ...f, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Estimated Hours</Label>
              <Input
                type="number"
                value={taskForm.estimatedHours}
                onChange={(e) => setTaskForm((f) => ({ ...f, estimatedHours: e.target.value }))}
                placeholder="8"
                min={0}
                step={0.5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createTaskMut.mutate({
                  ...taskForm,
                  dueDate: taskForm.dueDate || null,
                  estimatedHours: taskForm.estimatedHours || null,
                })
              }
              disabled={createTaskMut.isPending || !taskForm.title}
            >
              {createTaskMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

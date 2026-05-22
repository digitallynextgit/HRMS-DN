"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckSquare } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from "@/lib/constants"
import { formatDate, cn } from "@/lib/utils"
import Link from "next/link"

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  loggedHours: number
  estimatedHours: number | null
  project: { id: string; name: string; code: string }
}

async function fetchMyTasks(): Promise<{ data: Task[] }> {
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
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ["my-tasks"], queryFn: fetchMyTasks })
  const tasks = (data?.data ?? []).filter(
    (t) => statusFilter === "all" || t.status === statusFilter,
  )

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateTask(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tasks"] })
      toast.success("Task updated")
    },
    onError: () => toast.error("Failed to update task"),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="My Tasks" description="Tasks assigned to you across all projects" />

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-card flex flex-col items-center justify-center rounded border py-20 text-center">
          <CheckSquare className="text-muted-foreground/40 mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">No tasks assigned to you.</p>
        </div>
      ) : (
        <div className="bg-card rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">Task</th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">Project</th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">Priority</th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">Due</th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${task.project.id}`}
                      className="line-clamp-1 font-medium hover:underline"
                    >
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${task.project.id}`}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      <span className="font-mono">{task.project.code}</span> - {task.project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        TASK_PRIORITY_COLORS[task.priority],
                      )}
                    >
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </span>
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">
                    {task.dueDate ? formatDate(task.dueDate) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={task.status}
                      onValueChange={(v) => updateMut.mutate({ id: task.id, status: v })}
                    >
                      <SelectTrigger className="h-7 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-xs">
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { useQueryClient } from "@tanstack/react-query"
import { useProjectAllTasks, useUpdateTask, type ProjectTask } from "@/hooks/use-projects"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TaskDetailSheet } from "./task-detail-sheet"
import { cn, formatDate, getInitials } from "@/lib/utils"
import { TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS } from "@/lib/constants"
import { AlertTriangle, Clock, Milestone, GripVertical } from "lucide-react"

const COLUMNS: { id: string; label: string; color: string }[] = [
  { id: "TODO",        label: "To Do",      color: "bg-slate-100 dark:bg-slate-800" },
  { id: "IN_PROGRESS", label: "In Progress", color: "bg-blue-50 dark:bg-blue-950/30" },
  { id: "IN_REVIEW",   label: "In Review",   color: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "DONE",        label: "Done",        color: "bg-emerald-50 dark:bg-emerald-950/30" },
]

interface Props {
  projectId: string
  currentUserId: string
  isAdmin: boolean
  teamFilter: string  // "all" or teamId
}

export function KanbanView({ projectId, currentUserId, isAdmin, teamFilter }: Props) {
  const qc = useQueryClient()
  const { data, isLoading } = useProjectAllTasks(projectId)
  const update = useUpdateTask()
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const allTasks = (data?.data ?? []).filter((t) => {
    if (t.approvalStatus === "REJECTED") return false
    if (teamFilter !== "all" && t.teamId !== teamFilter) return false
    return true
  })

  function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const { draggableId, destination, source } = result
    if (destination.droppableId === source.droppableId) return

    const newStatus = destination.droppableId

    // Optimistic update — move the card immediately in the cache
    qc.setQueryData(["project-all-tasks", projectId], (old: { data: ProjectTask[] } | undefined) => {
      if (!old) return old
      return {
        ...old,
        data: old.data.map((t) =>
          t.id === draggableId ? { ...t, status: newStatus as ProjectTask["status"] } : t
        ),
      }
    })

    update.mutate(
      { taskId: draggableId, body: { status: newStatus }, silent: true },
      {
        onError: () => {
          // Revert on failure
          qc.invalidateQueries({ queryKey: ["project-all-tasks", projectId] })
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {COLUMNS.map((c) => (
          <div key={c.id} className="space-y-2">
            <Skeleton className="h-6 w-24 rounded" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  const byStatus: Record<string, ProjectTask[]> = {}
  for (const col of COLUMNS) byStatus[col.id] = []
  for (const t of allTasks) {
    if (byStatus[t.status]) byStatus[t.status].push(t)
  }

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
          {COLUMNS.map((col) => (
            <div key={col.id} className="min-w-0 flex flex-col">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {col.label}
                </span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {byStatus[col.id].length}
                </Badge>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 min-h-24 rounded-xl p-2 space-y-2 transition-colors",
                      col.color,
                      snapshot.isDraggingOver && "ring-2 ring-primary/40",
                    )}
                  >
                    {byStatus[col.id].map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(drag, snap) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            className={cn(
                              "bg-background rounded-lg border p-3 shadow-sm cursor-pointer select-none",
                              snap.isDragging && "shadow-lg ring-2 ring-primary/50 rotate-1",
                              task.approvalStatus === "PENDING_APPROVAL" && "border-amber-300",
                            )}
                            onClick={() => { setSelectedTask(task); setSheetOpen(true) }}
                          >
                            {/* Drag handle */}
                            <div
                              {...drag.dragHandleProps}
                              className="flex items-start justify-between gap-1 mb-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0" />
                              {task.isMilestone && (
                                <Milestone className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              )}
                            </div>

                            <p className="text-sm font-medium leading-snug line-clamp-2 -mt-4 pl-5">
                              {task.title}
                            </p>

                            <div className="flex flex-wrap gap-1 mt-2">
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] py-0", TASK_PRIORITY_COLORS[task.priority])}
                              >
                                {TASK_PRIORITY_LABELS[task.priority]}
                              </Badge>
                              {task.approvalStatus === "PENDING_APPROVAL" && (
                                <Badge variant="outline" className="text-[10px] py-0 text-amber-700 border-amber-300">
                                  <Clock className="h-2.5 w-2.5 mr-0.5" />Pending
                                </Badge>
                              )}
                              {task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && (
                                <Badge variant="outline" className="text-[10px] py-0 text-red-700 border-red-300">
                                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />Overdue
                                </Badge>
                              )}
                            </div>

                            {task.estimatedHours != null && (
                              <p className="text-[10px] text-muted-foreground mt-1.5">
                                {formatHours(task.estimatedHours)}
                              </p>
                            )}

                            <div className="flex items-center justify-between mt-2">
                              {task.dueDate && (
                                <span className="text-[10px] text-muted-foreground">{formatDate(task.dueDate)}</span>
                              )}
                              <div className="ml-auto">
                                {task.assignee && (
                                  <Avatar className="h-5 w-5">
                                    {task.assignee.profilePhoto && <AvatarImage src={task.assignee.profilePhoto} />}
                                    <AvatarFallback className="text-[8px]">
                                      {getInitials(task.assignee.firstName, task.assignee.lastName)}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {byStatus[col.id].length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-[11px] text-muted-foreground/60 text-center py-4">Empty</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <TaskDetailSheet
        task={selectedTask}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        currentUserId={currentUserId}
        isManager={isAdmin}
      />
    </>
  )
}

export function formatHours(h: number): string {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

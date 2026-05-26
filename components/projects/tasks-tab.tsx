"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  useProjectTeams,
  useTeamTasks,
  useCreateTask,
  useApproveTask,
  useRejectTask,
  useUpdateTask,
  useDeleteTask,
  type ProjectTask,
  type ProjectTeam,
} from "@/hooks/use-projects"
import { Plus, Check, X, AlertTriangle, Trash2, Inbox, Clock } from "lucide-react"
import { cn, formatDate, getInitials } from "@/lib/utils"
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from "@/lib/constants"

interface Props {
  projectId: string
  currentUserId: string
  isAdmin?: boolean
}

export function TasksTab({ projectId, currentUserId, isAdmin = false }: Props) {
  const { data: teamsData, isLoading: teamsLoading } = useProjectTeams(projectId)
  const teams = teamsData?.data ?? []
  const [activeTeamId, setActiveTeamId] = useState<string | "all">("all")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [showPendingOnly, setShowPendingOnly] = useState(false)

  // We need tasks from ALL teams when "all" is selected. Query each team separately.
  if (teamsLoading) return <Skeleton className="h-64 rounded-lg" />
  if (teams.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Add a team to this project first to start creating tasks.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Team</Label>
          <Select value={activeTeamId} onValueChange={(v) => setActiveTeamId(v)}>
            <SelectTrigger className="w-44 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={showPendingOnly} onChange={(e) => setShowPendingOnly(e.target.checked)} />
          Pending approval only
        </label>
      </div>

      {activeTeamId === "all"
        ? teams.map((team) => (
            <TeamTasksSection
              key={team.id}
              team={team}
              projectId={projectId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              statusFilter={statusFilter}
              showPendingOnly={showPendingOnly}
            />
          ))
        : (() => {
            const team = teams.find((t) => t.id === activeTeamId)
            if (!team) return null
            return (
              <TeamTasksSection
                team={team}
                projectId={projectId}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                statusFilter={statusFilter}
                showPendingOnly={showPendingOnly}
              />
            )
          })()}
    </div>
  )
}

function TeamTasksSection({ team, projectId, currentUserId, isAdmin, statusFilter, showPendingOnly }: {
  team: ProjectTeam
  projectId: string
  currentUserId: string
  isAdmin: boolean
  statusFilter: string
  showPendingOnly: boolean
}) {
  const { data, isLoading } = useTeamTasks(projectId, team.id)
  const tasks = data?.data ?? []
  const isManager = team.managerId === currentUserId || isAdmin
  const isMember = team.members.some((m) => m.employeeId === currentUserId) || isAdmin
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (showPendingOnly && t.approvalStatus !== "PENDING_APPROVAL") return false
      if (!showPendingOnly && t.approvalStatus === "REJECTED") return false
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false
      return true
    })
  }, [tasks, showPendingOnly, statusFilter])

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm">{team.name}</h4>
            <p className="text-xs text-muted-foreground">{filtered.length} task{filtered.length !== 1 ? "s" : ""}</p>
          </div>
          {isMember && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />New Task
            </Button>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-32 rounded" />
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">No tasks match the filters.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isManager={isManager}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}

        <CreateTaskDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          team={team}
          projectId={projectId}
          isManager={isManager}
          currentUserId={currentUserId}
        />
      </CardContent>
    </Card>
  )
}

function TaskRow({ task, isManager, currentUserId }: { task: ProjectTask; isManager: boolean; currentUserId: string }) {
  const approve = useApproveTask()
  const reject = useRejectTask()
  const update = useUpdateTask()
  const del = useDeleteTask()
  const [rejectOpen, setRejectOpen] = useState(false)

  const isAssignee = task.assigneeId === currentUserId
  const isPending = task.approvalStatus === "PENDING_APPROVAL"
  const isRejected = task.approvalStatus === "REJECTED"
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE"

  return (
    <div className={cn(
      "flex items-center gap-3 p-2.5 rounded border",
      isPending && "border-amber-300 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20",
      isRejected && "border-red-300 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20",
      !isPending && !isRejected && "border-border",
    )}>
      <Select
        value={task.status}
        disabled={!isManager && !isAssignee}
        onValueChange={(v) => update.mutate({ taskId: task.id, body: { status: v } })}
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
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{task.title}</p>
          {isPending && (
            <Badge variant="outline" className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
              <Clock className="h-3 w-3 mr-1 inline" />Pending approval
            </Badge>
          )}
          {isRejected && (
            <Badge variant="outline" className="text-[10px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
              Rejected
            </Badge>
          )}
          {isOverdue && (
            <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
              <AlertTriangle className="h-3 w-3 mr-0.5 inline" />Overdue
            </Badge>
          )}
        </div>
        {task.rejectionReason && (
          <p className="text-[11px] text-red-700 dark:text-red-400 mt-0.5">Reason: {task.rejectionReason}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
          <Badge variant="outline" className={cn("text-[10px]", TASK_PRIORITY_COLORS[task.priority])}>{TASK_PRIORITY_LABELS[task.priority]}</Badge>
          {task.dueDate && <span>Due {formatDate(task.dueDate)}</span>}
          {task.assignee && (
            <span className="flex items-center gap-1">
              <Avatar className="h-4 w-4"><AvatarFallback className="text-[8px]">{getInitials(task.assignee.firstName, task.assignee.lastName)}</AvatarFallback></Avatar>
              {task.assignee.firstName}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isPending && isManager && (
          <>
            <Button variant="ghost" size="sm" className="h-7 text-emerald-700 dark:text-emerald-400" onClick={() => approve.mutate(task.id)}>
              <Check className="h-3.5 w-3.5 mr-0.5" />Approve
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => setRejectOpen(true)}>
              <X className="h-3.5 w-3.5 mr-0.5" />Reject
            </Button>
          </>
        )}
        {isManager && !isPending && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => {
            if (confirm(`Delete task "${task.title}"?`)) del.mutate(task.id)
          }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <RejectDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={(reason) => {
          reject.mutate({ taskId: task.id, reason }, { onSuccess: () => setRejectOpen(false) })
        }}
      />
    </div>
  )
}

function RejectDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("")
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reject Task</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Reason</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Explain why this task is being rejected..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => onConfirm(reason)} disabled={!reason.trim()}>Reject</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateTaskDialog({ open, onClose, team, projectId, isManager, currentUserId }: {
  open: boolean
  onClose: () => void
  team: ProjectTeam
  projectId: string
  isManager: boolean
  currentUserId: string
}) {
  // Default assignee: self if I'm a member, else the team manager, else first member
  const callerIsTeamMember = team.members.some((m) => m.employeeId === currentUserId)
  const defaultAssignee = callerIsTeamMember
    ? currentUserId
    : team.managerId ?? team.members[0]?.employeeId ?? ""

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("MEDIUM")
  const [assigneeId, setAssigneeId] = useState(defaultAssignee)
  const [dueDate, setDueDate] = useState("")
  const create = useCreateTask(projectId, team.id)

  function handleCreate() {
    if (!title.trim()) return
    create.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assigneeId: isManager ? assigneeId : currentUserId,
        dueDate: dueDate || undefined,
      },
      {
        onSuccess: () => {
          setTitle(""); setDescription(""); setDueDate(""); setAssigneeId(defaultAssignee); onClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Task — {team.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!isManager && (
            <div className="text-xs rounded border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 text-amber-800 dark:text-amber-300 p-2">
              This will be a <strong>self-task</strong>. It needs the team manager's approval before becoming active.
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            {isManager ? (
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {team.members.map((m) => (
                    <SelectItem key={m.employeeId} value={m.employeeId}>
                      {m.employee.firstName} {m.employee.lastName}
                      {m.employeeId === currentUserId && " (me)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-xs text-muted-foreground">Self-assigned (only the manager can assign to others)</div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!title.trim() || create.isPending}>Create Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

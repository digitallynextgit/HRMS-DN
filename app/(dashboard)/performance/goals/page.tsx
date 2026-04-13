"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Loader2, Target, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { GOAL_STATUS_LABELS, GOAL_STATUS_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface Goal {
  id: string
  title: string
  description: string | null
  progress: number
  status: string
  targetDate: string | null
  year: number
  createdAt: string
}

const GOAL_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]

async function fetchGoals(year: number): Promise<{ data: Goal[] }> {
  const res = await fetch(`/api/performance/goals?year=${year}`)
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function createGoal(body: Record<string, unknown>) {
  const res = await fetch("/api/performance/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function updateGoal(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/performance/goals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function deleteGoal(id: string) {
  const res = await fetch(`/api/performance/goals/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="relative w-full bg-muted rounded-full h-1.5 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", value >= 100 ? "bg-emerald-500" : value >= 50 ? "bg-blue-500" : "bg-amber-500")}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

const emptyForm = { title: "", description: "", progress: "0", status: "NOT_STARTED", targetDate: "" }

export default function GoalsPage() {
  const qc = useQueryClient()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  const { data, isLoading } = useQuery({ queryKey: ["goals", year], queryFn: () => fetchGoals(year) })
  const goals = data?.data ?? []

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [form, setForm] = useState(emptyForm)

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true) }
  const openEdit = (g: Goal) => {
    setEditing(g)
    setForm({ title: g.title, description: g.description ?? "", progress: String(g.progress), status: g.status, targetDate: g.targetDate ? g.targetDate.split("T")[0] : "" })
    setOpen(true)
  }

  const createMut = useMutation({
    mutationFn: createGoal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals", year] }); toast.success("Goal created"); setOpen(false) },
    onError: () => toast.error("Failed to create goal"),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => updateGoal(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals", year] }); toast.success("Goal updated"); setOpen(false) },
    onError: () => toast.error("Failed to update goal"),
  })

  const deleteMut = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals", year] }); toast.success("Goal deleted") },
    onError: () => toast.error("Failed to delete goal"),
  })

  const handleSave = () => {
    const payload = { ...form, year }
    if (editing) {
      updateMut.mutate({ id: editing.id, ...payload })
    } else {
      createMut.mutate(payload)
    }
  }

  const isPending = createMut.isPending || updateMut.isPending

  const grouped = {
    IN_PROGRESS: goals.filter(g => g.status === "IN_PROGRESS"),
    NOT_STARTED: goals.filter(g => g.status === "NOT_STARTED"),
    COMPLETED: goals.filter(g => g.status === "COMPLETED"),
    CANCELLED: goals.filter(g => g.status === "CANCELLED"),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Goals"
        description="Track your personal and professional objectives"
        actions={
          <div className="flex items-center gap-2">
            <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
              <SelectTrigger className="w-24 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreate} className="gap-2 h-8 text-sm">
              <Plus className="h-4 w-4" /> Add Goal
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-lg border bg-card text-center">
          <Target className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No goals for {year}. Add your first goal.</p>
          <Button onClick={openCreate} variant="outline" size="sm" className="mt-4">Add Goal</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {(["IN_PROGRESS", "NOT_STARTED", "COMPLETED", "CANCELLED"] as const).map(status => {
            const items = grouped[status]
            if (items.length === 0) return null
            return (
              <div key={status}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{GOAL_STATUS_LABELS[status]} ({items.length})</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(goal => (
                    <Card key={goal.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-snug">{goal.title}</p>
                            {goal.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{goal.description}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => openEdit(goal)} className="text-muted-foreground hover:text-foreground p-1">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => deleteMut.mutate(goal.id)} className="text-muted-foreground hover:text-destructive p-1">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{goal.progress}%</span>
                          </div>
                          <ProgressBar value={goal.progress} />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", GOAL_STATUS_COLORS[goal.status])}>
                            {GOAL_STATUS_LABELS[goal.status]}
                          </span>
                          {goal.targetDate && (
                            <span className="text-xs text-muted-foreground">
                              Due {new Date(goal.targetDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Goal" : "New Goal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Complete AWS certification" />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What does success look like?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOAL_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{GOAL_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Progress (%)</Label>
                <Input type="number" min={0} max={100} value={form.progress} onChange={e => setForm(f => ({ ...f, progress: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Target Date (optional)</Label>
              <Input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending || !form.title}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Save Changes" : "Create Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

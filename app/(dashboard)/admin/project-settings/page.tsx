"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, GripVertical, Settings } from "lucide-react"

interface Phase {
  id: string
  name: string
  description: string | null
  displayOrder: number
  isActive: boolean
}

async function fetchPhases(): Promise<{ data: Phase[] }> {
  const res = await fetch("/api/project-phases")
  if (!res.ok) throw new Error("Failed to load phases")
  return res.json()
}

async function api(path: string, init: RequestInit) {
  const res = await fetch(path, init)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }))
    throw new Error(err.error || "Request failed")
  }
  return res.json()
}

export default function ProjectSettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["project-phases"], queryFn: fetchPhases })
  const phases = data?.data ?? []

  const [openCreate, setOpenCreate] = useState(false)
  const [editing, setEditing] = useState<Phase | null>(null)

  const create = useMutation({
    mutationFn: (body: { name: string; description?: string; displayOrder?: number }) =>
      api("/api/project-phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-phases"] })
      toast.success("Phase added")
      setOpenCreate(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Phase> }) =>
      api(`/api/project-phases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-phases"] })
      toast.success("Phase updated")
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/project-phases/${id}`, { method: "DELETE" }),
    onSuccess: (resp) => {
      qc.invalidateQueries({ queryKey: ["project-phases"] })
      const n = (resp as { displacedFromProjects?: number })?.displacedFromProjects ?? 0
      toast.success(n > 0 ? `Phase deleted (${n} project${n === 1 ? "" : "s"} cleared)` : "Phase deleted")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Settings"
        description="Configure project-wide settings such as lifecycle phases."
      />

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Project Phases</h2>
            <Badge variant="outline" className="text-[10px]">{phases.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setOpenCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />Add Phase
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          These phases appear in the dropdown on each project detail page. Examples: Initiation, Planning, Executing, Monitoring &amp; Controlling, Closure.
        </p>

        {isLoading ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : phases.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No phases yet. Add one to get started.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {phases.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{p.name}</p>
                        <Badge variant="outline" className="text-[10px]">Order {p.displayOrder}</Badge>
                        {!p.isActive && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                      </div>
                      {p.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete phase "${p.name}"? Projects using it will have their phase cleared.`)) del.mutate(p.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <PhaseFormDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onSubmit={(values) => create.mutate(values)}
        pending={create.isPending}
        mode="create"
      />
      {editing && (
        <PhaseFormDialog
          open={!!editing}
          onClose={() => setEditing(null)}
          onSubmit={(values) => update.mutate({ id: editing.id, body: values })}
          pending={update.isPending}
          mode="edit"
          initial={editing}
        />
      )}
    </div>
  )
}

function PhaseFormDialog({
  open, onClose, onSubmit, pending, mode, initial,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (v: { name: string; description?: string; displayOrder?: number; isActive?: boolean }) => void
  pending: boolean
  mode: "create" | "edit"
  initial?: Phase
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [displayOrder, setDisplayOrder] = useState(initial?.displayOrder ?? 0)
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Phase" : "Edit Phase"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Initiation" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Display Order</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
            </div>
            {mode === "edit" && (
              <div className="space-y-1.5">
                <Label>Active</Label>
                <select
                  className="w-full h-9 rounded border bg-background px-2 text-sm"
                  value={isActive ? "1" : "0"}
                  onChange={(e) => setIsActive(e.target.value === "1")}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button
            disabled={pending || !name.trim()}
            onClick={() => onSubmit({
              name: name.trim(),
              description: description.trim() || undefined,
              displayOrder,
              ...(mode === "edit" && { isActive }),
            })}
          >
            {mode === "create" ? "Add" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

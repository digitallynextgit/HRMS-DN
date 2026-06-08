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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Settings, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface SubPhase {
  id: string
  name: string
  description: string | null
  displayOrder: number
  isActive: boolean
  parentId: string
}

interface Phase {
  id: string
  name: string
  description: string | null
  displayOrder: number
  isActive: boolean
  parentId: null
  children: SubPhase[]
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

type EditTarget = Phase | SubPhase

export default function ProjectSettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["project-phases"], queryFn: fetchPhases })
  const phases = data?.data ?? []
  const totalCount = phases.reduce((n, p) => n + 1 + p.children.length, 0)

  const [createFor, setCreateFor] = useState<null | undefined | string>(null)
  const [editing, setEditing] = useState<EditTarget | null>(null)

  const create = useMutation({
    mutationFn: (body: {
      name: string
      description?: string
      displayOrder?: number
      parentId?: string
    }) =>
      api("/api/project-phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-phases"] })
      toast.success("Phase added")
      setCreateFor(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<EditTarget> }) =>
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
    onSuccess: (resp: { deletedSubPhases?: number; displacedFromProjects?: number }) => {
      qc.invalidateQueries({ queryKey: ["project-phases"] })
      const parts: string[] = ["Phase deleted"]
      if ((resp.deletedSubPhases ?? 0) > 0)
        parts.push(
          `${resp.deletedSubPhases} sub-phase${resp.deletedSubPhases === 1 ? "" : "s"} removed`,
        )
      if ((resp.displacedFromProjects ?? 0) > 0)
        parts.push(
          `${resp.displacedFromProjects} project${resp.displacedFromProjects === 1 ? "" : "s"} updated`,
        )
      toast.success(parts.join(" · "))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function confirmDelete(phase: Phase | SubPhase) {
    const childCount = !phase.parentId ? (phase as Phase).children.length : 0
    let msg = `Delete "${phase.name}"?`
    if (childCount > 0)
      msg += ` This will also delete its ${childCount} sub-phase${childCount === 1 ? "" : "s"}.`
    msg += " Any projects using this phase will be updated."
    if (confirm(msg)) del.mutate(phase.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Settings"
        description="Configure project-wide settings such as lifecycle phases."
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="text-muted-foreground h-4 w-4" />
            <h2 className="text-sm font-semibold">Project Phases</h2>
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {totalCount}
            </Badge>
          </div>
          <Button size="sm" onClick={() => setCreateFor(undefined)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Phase
          </Button>
        </div>
        <p className="text-muted-foreground mb-4 text-xs">
          Two-level structure: top-level phases (e.g. Execution) can contain sub-phases (e.g. Sprint
          1, QA). Projects select one phase as their current status.
        </p>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : phases.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              No phases yet. Add one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {phases.map((p, idx) => (
              <Card
                key={p.id}
                className={cn("overflow-hidden transition-colors", !p.isActive && "opacity-60")}
              >
                {/* ── Parent phase row ── */}
                <div className="flex items-start gap-3 px-4 py-3">
                  <div className="bg-primary/10 text-primary mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{p.name}</span>
                      {!p.isActive && (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground h-4 px-1.5 text-[10px]"
                        >
                          Inactive
                        </Badge>
                      )}
                      {p.children.length > 0 && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                          {p.children.length} sub-phase{p.children.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground h-7 gap-1 px-2 text-xs"
                      onClick={() => setCreateFor(p.id)}
                    >
                      <Plus className="h-3 w-3" />
                      Sub-phase
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground h-7 w-7"
                      onClick={() => setEditing(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive h-7 w-7"
                      onClick={() => confirmDelete(p)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* ── Sub-phases ── */}
                {p.children.length > 0 && (
                  <div className="border-border/60 mx-4 mb-3 overflow-hidden rounded-lg border">
                    {p.children.map((child, ci) => (
                      <div
                        key={child.id}
                        className={cn(
                          "bg-muted/30 flex items-center gap-3 px-3 py-2.5",
                          ci !== p.children.length - 1 && "border-border/40 border-b",
                          !child.isActive && "opacity-60",
                        )}
                      >
                        <ChevronRight className="text-muted-foreground/50 h-3.5 w-3.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm">{child.name}</span>
                            {!child.isActive && (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground h-4 px-1.5 text-[10px]"
                              >
                                Inactive
                              </Badge>
                            )}
                          </div>
                          {child.description && (
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {child.description}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground h-6 w-6"
                            onClick={() => setEditing(child)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive h-6 w-6"
                            onClick={() => confirmDelete(child)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <PhaseFormDialog
        open={createFor !== null}
        onClose={() => setCreateFor(null)}
        onSubmit={(values) => create.mutate({ ...values, parentId: createFor ?? undefined })}
        pending={create.isPending}
        mode="create"
        isSubPhase={typeof createFor === "string"}
        parentName={
          typeof createFor === "string" ? phases.find((p) => p.id === createFor)?.name : undefined
        }
      />

      {/* Edit dialog */}
      {editing && (
        <PhaseFormDialog
          open={!!editing}
          onClose={() => setEditing(null)}
          onSubmit={(values) => update.mutate({ id: editing.id, body: values })}
          pending={update.isPending}
          mode="edit"
          isSubPhase={editing.parentId !== null}
          initial={editing}
        />
      )}
    </div>
  )
}

function PhaseFormDialog({
  open,
  onClose,
  onSubmit,
  pending,
  mode,
  isSubPhase,
  parentName,
  initial,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (v: {
    name: string
    description?: string
    displayOrder?: number
    isActive?: boolean
  }) => void
  pending: boolean
  mode: "create" | "edit"
  isSubPhase: boolean
  parentName?: string
  initial?: Phase | SubPhase
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [displayOrder, setDisplayOrder] = useState(initial?.displayOrder ?? 0)
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)

  const title =
    mode === "create"
      ? isSubPhase
        ? `Add Sub-phase${parentName ? ` to "${parentName}"` : ""}`
        : "Add Phase"
      : isSubPhase
        ? "Edit Sub-phase"
        : "Edit Phase"

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                isSubPhase ? "e.g. Sprint 1, Requirements Gathering" : "e.g. Execution, Planning"
              }
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
              />
            </div>
            {mode === "edit" && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  className="bg-background h-9 w-full rounded-md border px-2 text-sm"
                  value={isActive ? "1" : "0"}
                  onChange={(e) => setIsActive(e.target.value === "1")}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            disabled={pending || !name.trim()}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                description: description.trim() || undefined,
                displayOrder,
                ...(mode === "edit" && { isActive }),
              })
            }
          >
            {pending ? "Saving…" : mode === "create" ? "Add" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/constants"

interface Designation {
  id: string
  title: string
  level: number
}

async function fetchDesignations(): Promise<{ data: Designation[] }> {
  const res = await fetch("/api/designations")
  if (!res.ok) throw new Error("Failed to fetch designations")
  return res.json()
}

async function createDesignation(body: {
  title: string
  level: number
}): Promise<{ data: Designation }> {
  const res = await fetch("/api/designations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create designation" }))
    throw new Error(err.error || "Failed to create designation")
  }
  return res.json()
}

export default function DesignationsPage() {
  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.EMPLOYEE_WRITE)
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [level, setLevel] = useState<string>("1")

  const { data, isLoading } = useQuery({
    queryKey: ["designations"],
    queryFn: fetchDesignations,
  })

  const createMut = useMutation({
    mutationFn: createDesignation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designations"] })
      toast.success("Designation created")
      setDialogOpen(false)
      setTitle("")
      setLevel("1")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const designations = data?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Designations"
        description={`${designations.length} designation${designations.length !== 1 ? "s" : ""} total`}
        actions={
          canWrite ? (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Designation
            </Button>
          ) : undefined
        }
      />

      <div className="bg-card rounded border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded" />
            ))}
          </div>
        ) : designations.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            No designations yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">Title</th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {designations.map((d) => (
                <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{d.title}</td>
                  <td className="text-muted-foreground px-4 py-3">L{d.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Designation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="desig-title">Title</Label>
              <Input
                id="desig-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Software Engineer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desig-level">Level (1–13)</Label>
              <Input
                id="desig-level"
                type="number"
                min={1}
                max={13}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || createMut.isPending}
              onClick={() =>
                createMut.mutate({
                  title: title.trim(),
                  level: Number(level) || 1,
                })
              }
            >
              {createMut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

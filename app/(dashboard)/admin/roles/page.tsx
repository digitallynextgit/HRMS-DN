"use client"

/**
 * /admin/roles – Role Management page.
 *
 * Displays all roles in a data table.  Users with the ROLE_WRITE permission
 * can create, edit, and delete roles.  System roles are protected from
 * deletion and name-slug changes.
 */

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, ShieldCheck, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { RoleForm } from "@/components/admin/role-form"
import { PERMISSIONS } from "@/lib/constants"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RoleRow {
  id: string
  name: string
  displayName: string
  description: string | null
  isSystem: boolean
  createdAt: string
  _count: {
    rolePermissions: number
    employeeRoles: number
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function RolesPage() {
  const { data: session } = useSession()
  const canWrite =
    session?.user?.roles?.includes("super_admin") ||
    session?.user?.permissions?.includes(PERMISSIONS.ROLE_WRITE)

  const [roles, setRoles] = useState<RoleRow[]>([])
  const [loading, setLoading] = useState(true)

  // Sheet (create/edit) state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // -----------------------------------------------------------------------
  // Fetch roles
  // -----------------------------------------------------------------------
  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/roles")
      if (!res.ok) throw new Error("Failed to fetch roles")
      const json = await res.json()
      setRoles(json.data)
    } catch {
      toast.error("Could not load roles")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  function openCreate() {
    setEditingRole(null)
    setSheetOpen(true)
  }

  function openEdit(role: RoleRow) {
    setEditingRole(role)
    setSheetOpen(true)
  }

  function handleFormSuccess() {
    setSheetOpen(false)
    fetchRoles()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/roles/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? "Delete failed")
      }
      toast.success(`Role "${deleteTarget.displayName}" deleted`)
      setDeleteTarget(null)
      fetchRoles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeleting(false)
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Role Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage permission roles assigned to employees
          </p>
        </div>

        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        )}
      </div>

      {/* Roles table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading roles…
          </div>
        ) : roles.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No roles found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Permissions</TableHead>
                <TableHead className="text-center">Employees</TableHead>
                <TableHead className="text-center">Type</TableHead>
                {canWrite && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  {/* Name */}
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">
                        {role.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {role.name}
                      </p>
                    </div>
                  </TableCell>

                  {/* Description */}
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {role.description ?? (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </TableCell>

                  {/* Permissions count */}
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 min-w-[2rem]">
                      {role._count.rolePermissions}
                    </span>
                  </TableCell>

                  {/* Employees count */}
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium px-2.5 py-0.5 min-w-[2rem]">
                      {role._count.employeeRoles}
                    </span>
                  </TableCell>

                  {/* System badge */}
                  <TableCell className="text-center">
                    {role.isSystem ? (
                      <Badge variant="secondary" className="gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        System
                      </Badge>
                    ) : (
                      <Badge variant="outline">Custom</Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(role)}
                          className="h-8 w-8 p-0"
                          aria-label={`Edit ${role.displayName}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {!role.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(role)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            aria-label={`Delete ${role.displayName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingRole ? `Edit Role: ${editingRole.displayName}` : "Create Role"}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6">
            <RoleForm
              role={editingRole ?? undefined}
              onSuccess={handleFormSuccess}
              onCancel={() => setSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role{" "}
              <strong>{deleteTarget?.displayName}</strong>? This action cannot be
              undone. Employees assigned this role will lose its permissions
              immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

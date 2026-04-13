"use client"

import { useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { LeaveTypeForm } from "@/components/leave/leave-type-form"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { useLeaveTypes, useDeleteLeaveType, useUpdateLeaveType } from "@/hooks/use-leave"
import type { LeaveType } from "@/hooks/use-leave"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/constants"
import { Plus, MoreHorizontal, Pencil, ToggleLeft, ToggleRight, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function LeaveTypesPage() {
  const { can } = usePermissions()
  const canManage = can(PERMISSIONS.LEAVE_APPROVE)

  const { data, isLoading } = useLeaveTypes()
  const deleteLeaveType = useDeleteLeaveType()
  const updateLeaveType = useUpdateLeaveType()

  const [formOpen, setFormOpen] = useState(false)
  const [editingType, setEditingType] = useState<LeaveType | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // useLeaveTypes only returns active types; we need all for admin
  // We'll show based on what the API returns
  const leaveTypes = data?.data ?? []

  function openCreate() {
    setEditingType(null)
    setFormOpen(true)
  }

  function openEdit(type: LeaveType) {
    setEditingType(type)
    setFormOpen(true)
  }

  async function handleToggleActive(type: LeaveType) {
    await updateLeaveType.mutateAsync({
      id: type.id,
      body: { isActive: !type.isActive },
    })
  }

  async function handleDelete() {
    if (!deleteId) return
    await deleteLeaveType.mutateAsync(deleteId)
    setDeleteId(null)
  }

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-sm">
          You do not have permission to manage leave types.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Types"
        description="Manage leave types available to employees."
        actions={
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Leave Type
          </Button>
        }
      />

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : leaveTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-lg border bg-muted/30">
          <p className="text-muted-foreground text-sm">No leave types configured yet.</p>
          <Button onClick={openCreate} className="mt-4">
            Create First Leave Type
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Max Days / Year</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Carry Forward</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Approval</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leaveTypes.map((type) => (
                <tr key={type.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{type.name}</p>
                    {type.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {type.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                      {type.code}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        "border-0 text-xs",
                        type.isPaid
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {type.isPaid ? "Paid" : "Unpaid"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {type.maxDaysPerYear === 0 ? "Unlimited" : `${type.maxDaysPerYear} days`}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {type.carryForward ? (
                      <span>
                        Yes
                        {type.maxCarryDays > 0 && (
                          <span className="text-xs ml-1">(max {type.maxCarryDays}d)</span>
                        )}
                      </span>
                    ) : (
                      "No"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {type.requiresApproval ? "Required" : "Auto-approved"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        "border-0 text-xs",
                        type.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {type.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => openEdit(type)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => handleToggleActive(type)}
                        >
                          {type.isActive ? (
                            <>
                              <ToggleLeft className="h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleRight className="h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(type.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LeaveTypeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        leaveType={editingType}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Leave Type</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the leave type and hide it from employees. Existing leave
              requests and balances will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

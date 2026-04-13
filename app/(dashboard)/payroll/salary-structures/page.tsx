"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import { PageHeader } from "@/components/shared/page-header"
import { SalaryStructureForm } from "@/components/payroll/salary-structure-form"
import { useSalaryStructures, useDeleteSalaryStructure, type SalaryStructure } from "@/hooks/use-payroll"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/constants"

function fmt(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function SalaryStructuresPage() {
  const { can } = usePermissions()
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<SalaryStructure | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useSalaryStructures()
  const deleteMutation = useDeleteSalaryStructure()

  const structures = data?.data ?? []

  function handleAdd() {
    setEditData(null)
    setFormOpen(true)
  }

  function handleEdit(structure: SalaryStructure) {
    setEditData(structure)
    setFormOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return
    await deleteMutation.mutateAsync(deleteId)
    setDeleteId(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary Structures"
        description="Configure employee salary components and deductions"
        actions={
          can(PERMISSIONS.PAYROLL_WRITE) ? (
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Structure
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : structures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm">No salary structures configured yet.</p>
          {can(PERMISSIONS.PAYROLL_WRITE) && (
            <Button className="mt-4 gap-2" onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              Add First Structure
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Basic</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">HRA</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Gross</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">PF</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">TDS</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Effective From</th>
                {can(PERMISSIONS.PAYROLL_WRITE) && (
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {structures.map((structure: SalaryStructure) => {
                const gross =
                  structure.basicSalary +
                  structure.hra +
                  structure.conveyance +
                  structure.medicalAllowance +
                  structure.otherAllowances
                const net = gross - structure.pfEmployee - structure.esi - structure.tds

                return (
                  <tr key={structure.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">
                          {structure.employee.firstName} {structure.employee.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{structure.employee.employeeNo}</p>
                        {structure.employee.department && (
                          <p className="text-xs text-muted-foreground">{structure.employee.department.name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{fmt(structure.basicSalary)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{fmt(structure.hra)}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(gross)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{fmt(structure.pfEmployee)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{fmt(structure.tds)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">{fmt(net)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(structure.effectiveFrom)}
                    </td>
                    {can(PERMISSIONS.PAYROLL_WRITE) && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(structure)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(structure.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form dialog */}
      <SalaryStructureForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={editData}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Salary Structure</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this salary structure? This action cannot be undone.
              Salary structures linked to existing payroll records cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

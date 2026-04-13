"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useCreateSalaryStructure, useUpdateSalaryStructure, type SalaryStructure } from "@/hooks/use-payroll"
import { useEmployees } from "@/hooks/use-employees"

interface SalaryStructureFormValues {
  employeeId: string
  basicSalary: string
  hra: string
  conveyance: string
  medicalAllowance: string
  otherAllowances: string
  pfEmployee: string
  pfEmployer: string
  esi: string
  tds: string
  effectiveFrom: string
}

interface SalaryStructureFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: SalaryStructure | null
}

function n(val: string): number {
  const parsed = parseFloat(val)
  return isNaN(parsed) ? 0 : parsed
}

function fmt(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function SalaryStructureForm({ open, onOpenChange, editData }: SalaryStructureFormProps) {
  const isEdit = !!editData

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<SalaryStructureFormValues>({
    defaultValues: {
      employeeId: "",
      basicSalary: "",
      hra: "",
      conveyance: "",
      medicalAllowance: "",
      otherAllowances: "",
      pfEmployee: "",
      pfEmployer: "",
      esi: "",
      tds: "",
      effectiveFrom: new Date().toISOString().split("T")[0],
    },
  })

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("")

  const createMutation = useCreateSalaryStructure()
  const updateMutation = useUpdateSalaryStructure()

  const { data: employeesData } = useEmployees({ limit: 200, status: "ACTIVE" })
  const employees = employeesData?.data ?? []

  // Populate form when editing
  useEffect(() => {
    if (editData) {
      reset({
        employeeId: editData.employeeId,
        basicSalary: String(editData.basicSalary),
        hra: String(editData.hra),
        conveyance: String(editData.conveyance),
        medicalAllowance: String(editData.medicalAllowance),
        otherAllowances: String(editData.otherAllowances),
        pfEmployee: String(editData.pfEmployee),
        pfEmployer: String(editData.pfEmployer),
        esi: String(editData.esi),
        tds: String(editData.tds),
        effectiveFrom: new Date(editData.effectiveFrom).toISOString().split("T")[0],
      })
      setSelectedEmployeeId(editData.employeeId)
    } else {
      reset({
        employeeId: "",
        basicSalary: "",
        hra: "",
        conveyance: "",
        medicalAllowance: "",
        otherAllowances: "",
        pfEmployee: "",
        pfEmployer: "",
        esi: "",
        tds: "",
        effectiveFrom: new Date().toISOString().split("T")[0],
      })
      setSelectedEmployeeId("")
    }
  }, [editData, reset, open])

  // Live preview calculations
  const values = watch()
  const grossEarnings =
    n(values.basicSalary) +
    n(values.hra) +
    n(values.conveyance) +
    n(values.medicalAllowance) +
    n(values.otherAllowances)
  const totalDeductions = n(values.pfEmployee) + n(values.esi) + n(values.tds)
  const netSalary = grossEarnings - totalDeductions

  async function onSubmit(data: SalaryStructureFormValues) {
    const payload = {
      employeeId: selectedEmployeeId,
      basicSalary: n(data.basicSalary),
      hra: n(data.hra),
      conveyance: n(data.conveyance),
      medicalAllowance: n(data.medicalAllowance),
      otherAllowances: n(data.otherAllowances),
      pfEmployee: n(data.pfEmployee),
      pfEmployer: n(data.pfEmployer),
      esi: n(data.esi),
      tds: n(data.tds),
      effectiveFrom: data.effectiveFrom,
    }

    if (isEdit && editData) {
      await updateMutation.mutateAsync({ id: editData.id, body: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }

    onOpenChange(false)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Salary Structure" : "Add Salary Structure"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Employee select */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="employeeId">Employee *</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={(v) => {
                  setSelectedEmployeeId(v)
                  setValue("employeeId", v)
                }}
                disabled={isEdit}
              >
                <SelectTrigger id="employeeId">
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} — {emp.employeeNo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employeeId && (
                <p className="text-xs text-destructive">Employee is required</p>
              )}
            </div>
          )}

          {isEdit && (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">
                {editData?.employee.firstName} {editData?.employee.lastName}
              </span>
              <span className="text-muted-foreground ml-2">({editData?.employee.employeeNo})</span>
            </div>
          )}

          {/* Earnings */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Earnings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="basicSalary">Basic Salary *</Label>
                <Input
                  id="basicSalary"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...register("basicSalary", { required: true })}
                />
                {errors.basicSalary && (
                  <p className="text-xs text-destructive">Basic salary is required</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hra">HRA</Label>
                <Input
                  id="hra"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...register("hra")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="conveyance">Conveyance Allowance</Label>
                <Input
                  id="conveyance"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...register("conveyance")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="medicalAllowance">Medical Allowance</Label>
                <Input
                  id="medicalAllowance"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...register("medicalAllowance")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="otherAllowances">Other Allowances</Label>
                <Input
                  id="otherAllowances"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...register("otherAllowances")}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Deductions */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Deductions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pfEmployee">PF (Employee)</Label>
                <Input
                  id="pfEmployee"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...register("pfEmployee")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pfEmployer">PF (Employer)</Label>
                <Input
                  id="pfEmployer"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...register("pfEmployer")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="esi">ESI</Label>
                <Input
                  id="esi"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...register("esi")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tds">TDS</Label>
                <Input
                  id="tds"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...register("tds")}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Effective From */}
          <div className="space-y-1.5">
            <Label htmlFor="effectiveFrom">Effective From *</Label>
            <Input
              id="effectiveFrom"
              type="date"
              {...register("effectiveFrom", { required: true })}
            />
            {errors.effectiveFrom && (
              <p className="text-xs text-destructive">Effective from date is required</p>
            )}
          </div>

          {/* Live Preview */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Salary Preview</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Gross Earnings</p>
                <p className="font-semibold text-foreground">{fmt(grossEarnings)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Deductions</p>
                <p className="font-semibold text-destructive">{fmt(totalDeductions)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Net Salary</p>
                <p className="font-bold text-emerald-600 text-base">{fmt(netSalary)}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || (!isEdit && !selectedEmployeeId)}>
              {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

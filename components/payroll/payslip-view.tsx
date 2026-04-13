"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import { cn } from "@/lib/utils"
import { MONTHS, PAYROLL_STATUS_LABELS, PAYROLL_STATUS_COLORS } from "@/lib/constants"
import type { PayrollRecord } from "@/hooks/use-payroll"

interface PayslipViewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: PayrollRecord | null
}

function fmt(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function PayslipView({ open, onOpenChange, record }: PayslipViewProps) {
  if (!record) return null

  const monthName = MONTHS[record.month - 1]
  const statusLabel = PAYROLL_STATUS_LABELS[record.status] ?? record.status
  const statusColor = PAYROLL_STATUS_COLORS[record.status] ?? "bg-gray-100 text-gray-700"

  const earnings = [
    { label: "Basic Salary", amount: record.basicSalary },
    { label: "House Rent Allowance (HRA)", amount: record.hra },
    { label: "Conveyance Allowance", amount: record.conveyance },
    { label: "Medical Allowance", amount: record.medicalAllowance },
    { label: "Other Allowances", amount: record.otherAllowances },
    ...(record.overtime > 0 ? [{ label: "Overtime", amount: record.overtime }] : []),
  ].filter((e) => e.amount > 0)

  const deductions = [
    { label: "Provident Fund (Employee)", amount: record.pfEmployee },
    { label: "Provident Fund (Employer)", amount: record.pfEmployer },
    { label: "ESI", amount: record.esi },
    { label: "TDS", amount: record.tds },
    ...(record.otherDeductions > 0 ? [{ label: "Other Deductions", amount: record.otherDeductions }] : []),
  ].filter((d) => d.amount > 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Payslip</SheetTitle>
        </SheetHeader>

        {/* Printable area */}
        <div id="payslip-print-area" className="space-y-6">
          {/* Company header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-xl font-bold text-foreground">HRMS</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Payslip for {monthName} {record.year}
            </p>
          </div>

          {/* Status + print */}
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                statusColor
              )}
            >
              {statusLabel}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>

          {/* Employee details */}
          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Employee Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">
                  {record.employee.firstName} {record.employee.lastName}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Employee No</p>
                <p className="font-medium">{record.employee.employeeNo}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Department</p>
                <p className="font-medium">{record.employee.department?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Designation</p>
                <p className="font-medium">{record.employee.designation?.title ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pay Period</p>
                <p className="font-medium">
                  {monthName} {record.year}
                </p>
              </div>
            </div>
          </div>

          {/* Attendance summary */}
          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Attendance Summary</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{record.workingDays}</p>
                <p className="text-muted-foreground mt-1">Working Days</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{record.presentDays}</p>
                <p className="text-muted-foreground mt-1">Present Days</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{record.lopDays}</p>
                <p className="text-muted-foreground mt-1">LOP Days</p>
              </div>
            </div>
          </div>

          {/* Earnings table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5">
              <h3 className="text-sm font-semibold text-foreground">Earnings</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {earnings.map((e) => (
                  <tr key={e.label}>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.label}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{fmt(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/20">
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-foreground">Gross Earnings</td>
                  <td className="px-4 py-2.5 text-right font-bold text-foreground">
                    {fmt(record.grossSalary)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Deductions table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5">
              <h3 className="text-sm font-semibold text-foreground">Deductions</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {deductions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-3 text-muted-foreground italic" colSpan={2}>
                      No deductions
                    </td>
                  </tr>
                ) : (
                  deductions.map((d) => (
                    <tr key={d.label}>
                      <td className="px-4 py-2.5 text-muted-foreground">{d.label}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-600">
                        {fmt(d.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="border-t bg-muted/20">
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-foreground">Total Deductions</td>
                  <td className="px-4 py-2.5 text-right font-bold text-red-600">
                    {fmt(record.totalDeductions)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Net salary highlight */}
          <div className="rounded-lg border-2 border-emerald-500 bg-emerald-50 px-4 py-4 flex items-center justify-between">
            <p className="text-base font-bold text-foreground">Net Salary</p>
            <p className="text-2xl font-extrabold text-emerald-600">{fmt(record.netSalary)}</p>
          </div>

          {record.notes && (
            <div className="rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium">Notes: </span>
              {record.notes}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Play,
  Trash2,
  Eye,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { GeneratePayrollDialog } from "@/components/payroll/generate-payroll-dialog"
import { PayrollFilters } from "@/components/payroll/payroll-filters"
import {
  usePayrollRecords,
  usePayrollSummary,
  useUpdatePayrollStatus,
  useDeletePayrollRecord,
  type PayrollRecord,
} from "@/hooks/use-payroll"
import { usePermissions } from "@/hooks/use-permissions"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"
import { MONTHS, PAYROLL_STATUS_COLORS, PAYROLL_STATUS_LABELS, PERMISSIONS } from "@/lib/constants"

function fmt(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function PayrollPage() {
  const router = useRouter()
  const { can } = usePermissions()

  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [status, setStatus] = useState("")
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [generateOpen, setGenerateOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [bulkStatusPending, setBulkStatusPending] = useState(false)

  const debouncedSearch = useDebounce(employeeSearch, 350)

  const recordFilters = {
    month: month ? Number(month) : undefined,
    year: year ? Number(year) : undefined,
    status: status || undefined,
  }

  const { data: recordsData, isLoading: recordsLoading } = usePayrollRecords(recordFilters)
  const { data: summaryData, isLoading: summaryLoading } = usePayrollSummary(
    month ? Number(month) : undefined,
    year ? Number(year) : undefined
  )

  const updateStatus = useUpdatePayrollStatus()
  const deleteRecord = useDeletePayrollRecord()

  const allRecords = recordsData?.data ?? []

  // Client-side filter by employee name search
  const records = useMemo(() => {
    if (!debouncedSearch) return allRecords
    const q = debouncedSearch.toLowerCase()
    return allRecords.filter((r) => {
      const name = `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase()
      const no = r.employee.employeeNo.toLowerCase()
      return name.includes(q) || no.includes(q)
    })
  }, [allRecords, debouncedSearch])

  const summary = summaryData?.data

  function handleClearFilters() {
    setMonth("")
    setYear("")
    setStatus("")
    setEmployeeSearch("")
    setSelectedIds(new Set())
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(records.map((r) => r.id)))
    }
  }

  async function handleBulkStatus(newStatus: string) {
    setBulkStatusPending(true)
    try {
      const ids = Array.from(selectedIds)
      for (const id of ids) {
        await updateStatus.mutateAsync({ id, status: newStatus })
      }
      setSelectedIds(new Set())
    } finally {
      setBulkStatusPending(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return
    await deleteRecord.mutateAsync(deleteId)
    setDeleteId(null)
  }

  const statusBreakdown = summary?.statusBreakdown ?? { DRAFT: 0, PROCESSING: 0, APPROVED: 0, PAID: 0 }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description={`${MONTHS[Number(month) - 1] ?? "All months"} ${year}`}
        actions={
          can(PERMISSIONS.PAYROLL_PROCESS) ? (
            <Button onClick={() => setGenerateOpen(true)} className="gap-2">
              <Play className="h-4 w-4" />
              Generate Payroll
            </Button>
          ) : undefined
        }
      />

      {/* Month/Year selector */}
      <div className="flex flex-wrap items-center gap-3">
        <PayrollFilters
          month={month}
          onMonthChange={setMonth}
          year={year}
          onYearChange={setYear}
          status={status}
          onStatusChange={setStatus}
          employeeSearch={employeeSearch}
          onEmployeeSearchChange={setEmployeeSearch}
          onClear={handleClearFilters}
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Employees</p>
                    <p className="text-3xl font-bold mt-1">{summary?.employeeCount ?? 0}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Gross</p>
                    <p className="text-2xl font-bold mt-1">{fmt(summary?.totalGross ?? 0)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Deductions</p>
                    <p className="text-2xl font-bold mt-1">{fmt(summary?.totalDeductions ?? 0)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Net</p>
                    <p className="text-2xl font-bold mt-1">{fmt(summary?.totalNet ?? 0)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Status breakdown badges */}
      {!summaryLoading && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusBreakdown).map(([s, count]) => {
            const color = PAYROLL_STATUS_COLORS[s] ?? "bg-gray-100 text-gray-700"
            const label = PAYROLL_STATUS_LABELS[s] ?? s
            return (
              <span
                key={s}
                className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium gap-1.5", color)}
              >
                <span className="font-bold">{count}</span>
                {label}
              </span>
            )
          })}
        </div>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && can(PERMISSIONS.PAYROLL_PROCESS) && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={bulkStatusPending} className="gap-1.5">
                Update Status
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleBulkStatus("PROCESSING")}>
                Mark as Processing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatus("APPROVED")}>
                Mark as Approved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatus("PAID")}>
                Mark as Paid
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Records table */}
      {recordsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm">No payroll records found.</p>
          {can(PERMISSIONS.PAYROLL_PROCESS) && (
            <Button className="mt-4 gap-2" onClick={() => setGenerateOpen(true)}>
              <Play className="h-4 w-4" />
              Generate Payroll
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {can(PERMISSIONS.PAYROLL_PROCESS) && (
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      checked={selectedIds.size === records.length && records.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Gross</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Deductions</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((record: PayrollRecord) => {
                const statusColor = PAYROLL_STATUS_COLORS[record.status] ?? "bg-gray-100 text-gray-700"
                const statusLabel = PAYROLL_STATUS_LABELS[record.status] ?? record.status

                return (
                  <tr
                    key={record.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => router.push(`/payroll/records/${record.id}`)}
                  >
                    {can(PERMISSIONS.PAYROLL_PROCESS) && (
                      <td
                        className="px-4 py-3"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelect(record.id)
                        }}
                      >
                        <Checkbox
                          checked={selectedIds.has(record.id)}
                          onCheckedChange={() => toggleSelect(record.id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {record.employee.firstName} {record.employee.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{record.employee.employeeNo}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {record.employee.department?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(record.grossSalary)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(record.totalDeductions)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {fmt(record.netSalary)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          statusColor
                        )}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => router.push(`/payroll/records/${record.id}`)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {can(PERMISSIONS.PAYROLL_PROCESS) && record.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(record.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate dialog */}
      <GeneratePayrollDialog open={generateOpen} onOpenChange={setGenerateOpen} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payroll Record</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this DRAFT payroll record. This action cannot be undone.
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

"use client"

import { useState, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutGrid,
  List,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { EmployeeCard } from "@/components/employees/employee-card"
import { EmployeeFilters } from "@/components/employees/employee-filters"
import { useEmployees, useDeleteEmployee } from "@/hooks/use-employees"
import { usePermissions } from "@/hooks/use-permissions"
import { useDebounce } from "@/hooks/use-debounce"
import { cn, getInitials, getAvatarColor, formatDate } from "@/lib/utils"
import { EMPLOYEE_STATUS_COLORS, EMPLOYEE_STATUS_LABELS, PERMISSIONS } from "@/lib/constants"

type ViewMode = "card" | "table"

export default function EmployeesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { can } = usePermissions()

  // ── View mode ────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("card")

  // ── Delete dialog state ───────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deleteEmployee = useDeleteEmployee()

  // ── URL-synced filters ────────────────────────────────────────────────────
  const [search, setSearchRaw] = useState(searchParams.get("search") ?? "")
  const [departmentId, setDepartmentId] = useState(searchParams.get("departmentId") ?? "")
  const [status, setStatus] = useState(searchParams.get("status") ?? "")
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "1"))

  const debouncedSearch = useDebounce(search, 350)

  // Sync URL helper
  const pushFilters = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams()
      const merged = {
        search: debouncedSearch,
        departmentId,
        status,
        page: String(page),
        ...overrides,
      }
      Object.entries(merged).forEach(([k, v]) => {
        if (v && v !== "1") params.set(k, v)
        else if (v === "1" && k === "page") {
          // skip page=1
        } else if (v) params.set(k, v)
      })
      router.replace(`${pathname}?${params.toString()}`)
    },
    [debouncedSearch, departmentId, status, page, router, pathname]
  )

  function handleSearchChange(v: string) {
    setSearchRaw(v)
    setPage(1)
  }

  function handleDepartmentChange(v: string) {
    setDepartmentId(v)
    setPage(1)
    pushFilters({ departmentId: v, page: "1" })
  }

  function handleStatusChange(v: string) {
    setStatus(v)
    setPage(1)
    pushFilters({ status: v, page: "1" })
  }

  function handleClearFilters() {
    setSearchRaw("")
    setDepartmentId("")
    setStatus("")
    setPage(1)
    router.replace(pathname)
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useEmployees({
    search: debouncedSearch,
    departmentId: departmentId || undefined,
    status: status || undefined,
    page,
    limit: 20,
  })

  const employees = data?.data ?? []
  const pagination = data?.pagination

  // ── Delete handler ────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteId) return
    await deleteEmployee.mutateAsync(deleteId)
    setDeleteId(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description={
          pagination
            ? `${pagination.total} employee${pagination.total !== 1 ? "s" : ""} total`
            : "Employee directory"
        }
        actions={
          can(PERMISSIONS.EMPLOYEE_WRITE) ? (
            <Button asChild>
              <Link href="/employees/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Employee
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <EmployeeFilters
            search={search}
            onSearchChange={handleSearchChange}
            departmentId={departmentId}
            onDepartmentChange={handleDepartmentChange}
            status={status}
            onStatusChange={handleStatusChange}
            onClear={handleClearFilters}
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-md border bg-background">
          <button
            onClick={() => setViewMode("card")}
            className={cn(
              "flex items-center justify-center h-9 w-9 rounded-l-md transition-colors",
              viewMode === "card"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center justify-center h-9 w-9 rounded-r-md transition-colors",
              viewMode === "table"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Table view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        viewMode === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        )
      )}

      {/* Empty state */}
      {!isLoading && employees.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm">No employees found.</p>
          {can(PERMISSIONS.EMPLOYEE_WRITE) && (
            <Button asChild className="mt-4">
              <Link href="/employees/new">Add First Employee</Link>
            </Button>
          )}
        </div>
      )}

      {/* Card View */}
      {!isLoading && employees.length > 0 && viewMode === "card" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {employees.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              canEdit={can(PERMISSIONS.EMPLOYEE_WRITE)}
              canDelete={can(PERMISSIONS.EMPLOYEE_DELETE)}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {!isLoading && employees.length > 0 && viewMode === "table" && (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Designation</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.map((emp) => {
                const fullName = `${emp.firstName} ${emp.lastName}`
                const initials = getInitials(emp.firstName, emp.lastName)
                const avatarBg = getAvatarColor(fullName)
                const statusColor = EMPLOYEE_STATUS_COLORS[emp.status] ?? "bg-gray-100 text-gray-700"
                const statusLabel = EMPLOYEE_STATUS_LABELS[emp.status] ?? emp.status

                return (
                  <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                    {/* Employee column */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          {emp.profilePhoto ? (
                            <AvatarImage src={emp.profilePhoto} alt={fullName} />
                          ) : null}
                          <AvatarFallback className={cn("text-white text-xs font-semibold", avatarBg)}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{fullName}</p>
                          <p className="text-xs text-muted-foreground">{emp.employeeNo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {emp.department?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {emp.designation?.title ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", statusColor)}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(emp.dateOfJoining)}
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
                          <DropdownMenuItem asChild>
                            <Link href={`/employees/${emp.id}`} className="flex items-center gap-2 cursor-pointer">
                              <Eye className="h-4 w-4" />
                              View Profile
                            </Link>
                          </DropdownMenuItem>
                          {can(PERMISSIONS.EMPLOYEE_WRITE) && (
                            <DropdownMenuItem asChild>
                              <Link href={`/employees/${emp.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {can(PERMISSIONS.EMPLOYEE_DELETE) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
                                onClick={() => setDeleteId(emp.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Terminate
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the employee as terminated and deactivate their account. This action can be
              reversed by editing the employee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

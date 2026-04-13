"use client"

import Link from "next/link"
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn, getInitials } from "@/lib/utils"
import { EMPLOYEE_STATUS_LABELS } from "@/lib/constants"

export interface EmployeeCardProps {
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeNo: string
    email: string
    phone?: string | null
    designation?: { title: string } | null
    department?: { name: string } | null
    status: string
    profilePhoto?: string | null
  }
  onDelete?: (id: string) => void
  canEdit?: boolean
  canDelete?: boolean
}

export function EmployeeCard({ employee, onDelete, canEdit, canDelete }: EmployeeCardProps) {
  const fullName = `${employee.firstName} ${employee.lastName}`
  const initials = getInitials(employee.firstName, employee.lastName)
  const statusLabel = EMPLOYEE_STATUS_LABELS[employee.status] ?? employee.status

  return (
    <Card className="group relative overflow-hidden border border-border bg-card rounded-[var(--radius)]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0">
              {employee.profilePhoto ? (
                <AvatarImage src={employee.profilePhoto} alt={fullName} />
              ) : null}
              <AvatarFallback className="text-xs font-medium bg-accent text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="font-medium text-sm leading-tight truncate text-foreground">{fullName}</p>
              {employee.designation?.title && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {employee.designation.title}
                </p>
              )}
            </div>
          </div>

          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/employees/${employee.id}`} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Eye className="h-3.5 w-3.5" />
                    View Profile
                  </Link>
                </DropdownMenuItem>
                {canEdit && (
                  <DropdownMenuItem asChild>
                    <Link href={`/employees/${employee.id}/edit`} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer text-sm"
                      onClick={() => onDelete?.(employee.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Terminate
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {employee.department?.name && (
          <div className="mt-3">
            <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded font-medium bg-accent text-foreground">
              {employee.department.name}
            </span>
          </div>
        )}

        <p className="mt-2 text-xs text-muted-foreground truncate">{employee.email}</p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded font-medium border border-border text-muted-foreground">
            {statusLabel}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" asChild>
            <Link href={`/employees/${employee.id}`}>
              View
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

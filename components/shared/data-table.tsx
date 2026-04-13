"use client"

import * as React from "react"
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SearchInput } from "@/components/shared/search-input"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading-skeleton"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  pageCount?: number
  page?: number
  onPageChange?: (page: number) => void
  pageSize?: number
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  emptyTitle?: string
  emptyDescription?: string
  toolbar?: React.ReactNode
  className?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  pageCount = 1,
  page = 1,
  onPageChange,
  pageSize = 10,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  emptyTitle = "No results found",
  emptyDescription = "Try adjusting your search or filters.",
  toolbar,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount,
  })

  const hasSearch = Boolean(onSearchChange)
  const hasPagination = Boolean(onPageChange) && pageCount > 1
  const colCount = columns.length

  return (
    <div className={cn("rounded-[var(--radius)] border border-border bg-card", className)}>
      {(hasSearch || toolbar) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex flex-1 items-center gap-3">
            {hasSearch && (
              <SearchInput
                value={searchValue}
                onChange={onSearchChange!}
                placeholder={searchPlaceholder}
                className="max-w-xs"
              />
            )}
          </div>
          {toolbar && (
            <div className="flex items-center gap-2">{toolbar}</div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="p-0">
          <TableSkeleton rows={pageSize > 10 ? 10 : pageSize} cols={colCount} />
        </div>
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDirection = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 transition-colors hover:text-foreground focus:outline-none"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sortDirection === "desc" ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="text-sm border-b border-border hover:bg-accent/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="h-auto p-0">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    className="py-12"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {onPageChange && pageCount > 0 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Page {page} of {pageCount}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:ml-1 text-xs">Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pageCount || isLoading}
            >
              <span className="sr-only sm:not-sr-only sm:mr-1 text-xs">Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

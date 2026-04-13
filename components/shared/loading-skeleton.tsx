import * as React from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-0">
      <div className="flex items-center gap-4 border-b border-border px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-3 bg-muted animate-pulse", i === 0 ? "w-32" : i === cols - 1 ? "w-16 ml-auto" : "flex-1")}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className={cn(
                "h-3 bg-muted animate-pulse",
                colIdx === 0 ? "w-32" : colIdx === cols - 1 ? "w-16 ml-auto" : "flex-1"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius)] border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-1/2 bg-muted animate-pulse" />
              <Skeleton className="h-7 w-1/3 bg-muted animate-pulse" />
              <Skeleton className="h-3 w-3/4 bg-muted animate-pulse" />
            </div>
            <Skeleton className="h-4 w-4 bg-muted animate-pulse shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-24 bg-muted animate-pulse" />
          <Skeleton className="h-9 w-full bg-muted animate-pulse" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton className="h-9 w-20 bg-muted animate-pulse" />
        <Skeleton className="h-9 w-20 bg-muted animate-pulse" />
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between py-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40 bg-muted animate-pulse" />
          <Skeleton className="h-4 w-64 bg-muted animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 bg-muted animate-pulse" />
          <Skeleton className="h-9 w-28 bg-muted animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-1/2 bg-muted animate-pulse" />
                <Skeleton className="h-6 w-1/3 bg-muted animate-pulse" />
                <Skeleton className="h-3 w-2/3 bg-muted animate-pulse" />
              </div>
              <Skeleton className="h-4 w-4 bg-muted animate-pulse shrink-0" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-[var(--radius)] border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-32 bg-muted animate-pulse" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-52 bg-muted animate-pulse" />
            <Skeleton className="h-9 w-24 bg-muted animate-pulse" />
          </div>
        </div>
        <div className="p-0">
          <TableSkeleton rows={6} cols={5} />
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <Skeleton className="h-3 w-28 bg-muted animate-pulse" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20 bg-muted animate-pulse" />
            <Skeleton className="h-9 w-16 bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { Loader2 } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { OrgChartTree } from "@/components/employees/org-chart-tree"
import { useOrgChart } from "@/hooks/use-employees"

export default function OrgChartPage() {
  const { data, isLoading, error } = useOrgChart()

  const nodes = data?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Org Chart"
        description="Visual overview of the company hierarchy"
      />

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !isLoading && (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          Failed to load org chart. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-xl border bg-muted/20 min-h-[400px]">
          <OrgChartTree nodes={nodes} />
        </div>
      )}
    </div>
  )
}

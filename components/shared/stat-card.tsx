import * as React from "react"
import { TrendingUp, TrendingDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ElementType
  iconColor?: string
  iconBg?: string
  trend?: { value: number; label: string }
  className?: string
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  const isPositive = trend ? trend.value >= 0 : true

  return (
    <Card className={cn("border border-border bg-card rounded-[var(--radius)]", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-xs font-medium text-foreground">
                  {isPositive ? "+" : ""}
                  {trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  )
}

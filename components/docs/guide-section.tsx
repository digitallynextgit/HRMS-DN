import * as React from "react"
import { cn } from "@/lib/utils"

interface GuideSectionProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function GuideSection({ title, children, className }: GuideSectionProps) {
  return (
    <section className={cn("pb-8 border-b border-border last:border-0 last:pb-0", className)}>
      <h2 className="text-lg font-semibold text-foreground mb-4">{title}</h2>
      <div className="space-y-3 text-sm text-foreground leading-relaxed">
        {children}
      </div>
    </section>
  )
}

import * as React from "react"

interface StepListProps {
  steps: string[]
}

export function StepList({ steps }: StepListProps) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={index} className="flex items-start gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background mt-0.5">
            {index + 1}
          </span>
          <span className="text-sm text-foreground leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
  )
}

import * as React from "react"

interface InfoTableRow {
  term: string
  description: string
}

interface InfoTableProps {
  rows: InfoTableRow[]
}

export function InfoTable({ rows }: InfoTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className="border-b border-border last:border-0 odd:bg-muted/40 even:bg-card"
            >
              <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap w-40 align-top">
                {row.term}
              </td>
              <td className="px-4 py-3 text-muted-foreground leading-relaxed">
                {row.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

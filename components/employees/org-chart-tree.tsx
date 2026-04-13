"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn, getInitials, getAvatarColor } from "@/lib/utils"
import type { OrgNode } from "@/types"

export interface OrgChartTreeProps {
  nodes: OrgNode[]
}

// ─── Single node card ─────────────────────────────────────────────────────────

function OrgNodeCard({ node }: { node: OrgNode }) {
  const fullName = `${node.firstName} ${node.lastName}`
  const initials = getInitials(node.firstName, node.lastName)
  const avatarBg = getAvatarColor(fullName)

  return (
    <Link
      href={`/employees/${node.id}`}
      className="flex flex-col items-center gap-1.5 group"
    >
      <div className="bg-card border border-border rounded-lg px-3 py-2.5 shadow-sm w-36 text-center transition-all group-hover:shadow-md group-hover:border-primary/40">
        <div className="flex justify-center mb-1.5">
          <Avatar className="h-8 w-8">
            {node.profilePhoto ? (
              <AvatarImage src={node.profilePhoto} alt={fullName} />
            ) : null}
            <AvatarFallback className={cn("text-white text-xs font-semibold", avatarBg)}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        <p className="text-xs font-semibold text-foreground leading-tight truncate">
          {fullName}
        </p>
        {node.designation?.title && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {node.designation.title}
          </p>
        )}
        {node.department?.name && (
          <p className="text-[10px] text-muted-foreground/70 truncate">
            {node.department.name}
          </p>
        )}
      </div>
    </Link>
  )
}

// ─── Recursive tree node ───────────────────────────────────────────────────────

function TreeNode({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children.length > 0

  return (
    <div className="flex flex-col items-center">
      {/* Node card + toggle */}
      <div className="relative flex flex-col items-center">
        <OrgNodeCard node={node} />

        {hasChildren && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="mt-1 flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {node.children.length} {node.children.length === 1 ? "report" : "reports"}
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="flex flex-col items-center">
          {/* Vertical line from parent down */}
          <div className="w-px h-6 bg-border" />

          {node.children.length === 1 ? (
            /* Single child: straight line */
            <TreeNode node={node.children[0]} depth={depth + 1} />
          ) : (
            /* Multiple children: horizontal rail */
            <div className="flex flex-col items-center">
              {/* Horizontal line */}
              <div
                className="h-px bg-border"
                style={{ width: `${Math.max(node.children.length * 160, 160)}px` }}
              />
              <div className="flex items-start gap-4">
                {node.children.map((child) => (
                  <div key={child.id} className="flex flex-col items-center">
                    {/* Vertical drop per child */}
                    <div className="w-px h-6 bg-border" />
                    <TreeNode node={child} depth={depth + 1} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Forest (multiple root nodes) ─────────────────────────────────────────────

export function OrgChartTree({ nodes }: OrgChartTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        No employees found in the org chart.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex flex-col items-center gap-12 p-8 min-w-max">
        {nodes.map((root) => (
          <TreeNode key={root.id} node={root} depth={0} />
        ))}
      </div>
    </div>
  )
}

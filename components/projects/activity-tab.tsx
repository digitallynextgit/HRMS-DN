"use client"

import { useProjectActivity, type ProjectActivity } from "@/hooks/use-projects"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getInitials, formatDate } from "@/lib/utils"
import {
  CheckCircle2, GitCommit, MessageSquare, UserPlus, UserMinus, Milestone,
  Users, FileText, ArrowRight,
} from "lucide-react"

interface Props {
  projectId: string
}

function getActivityIcon(type: string) {
  switch (type) {
    case "TASK_CREATED": return <GitCommit className="h-3.5 w-3.5" />
    case "TASK_STATUS_CHANGED": return <ArrowRight className="h-3.5 w-3.5" />
    case "TASK_APPROVED": return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
    case "TASK_REJECTED": return <CheckCircle2 className="h-3.5 w-3.5 text-red-500" />
    case "COMMENT_ADDED": return <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
    case "TEAM_MEMBER_ADDED": return <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
    case "TEAM_MEMBER_REMOVED": return <UserMinus className="h-3.5 w-3.5 text-red-500" />
    case "MILESTONE_TOGGLED": return <Milestone className="h-3.5 w-3.5 text-purple-600" />
    case "TEAM_CREATED": return <Users className="h-3.5 w-3.5" />
    case "MESSAGE_POSTED": return <FileText className="h-3.5 w-3.5 text-amber-600" />
    default: return <GitCommit className="h-3.5 w-3.5" />
  }
}

function getActivityText(activity: ProjectActivity): string {
  const meta = activity.meta ?? {}
  switch (activity.type) {
    case "TASK_CREATED":
      return `created task "${meta.taskTitle ?? ""}"`
    case "TASK_STATUS_CHANGED":
      return `changed "${meta.taskTitle ?? ""}" from ${humanStatus(meta.from as string)} to ${humanStatus(meta.to as string)}`
    case "TASK_APPROVED":
      return `approved task "${meta.taskTitle ?? ""}"`
    case "TASK_REJECTED":
      return `rejected task "${meta.taskTitle ?? ""}"`
    case "COMMENT_ADDED":
      return `commented on "${meta.taskTitle ?? ""}"`
    case "TEAM_MEMBER_ADDED":
      return `added a member to ${meta.teamName ?? "a team"}`
    case "TEAM_MEMBER_REMOVED":
      return `removed a member from ${meta.teamName ?? "a team"}`
    case "MILESTONE_TOGGLED":
      return (meta.isMilestone ? "marked" : "unmarked") + ` "${meta.taskTitle ?? ""}" as milestone`
    case "TEAM_CREATED":
      return `created team "${meta.teamName ?? ""}"`
    case "MESSAGE_POSTED":
      return `posted a message: "${meta.title ?? ""}"`
    default:
      return activity.type.toLowerCase().replace(/_/g, " ")
  }
}

function humanStatus(s: string): string {
  const map: Record<string, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    IN_REVIEW: "In Review",
    DONE: "Done",
  }
  return map[s] ?? s
}

export function ActivityTab({ projectId }: Props) {
  const { data, isLoading } = useProjectActivity(projectId)
  const activities = data?.data ?? []

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No activity yet. Actions like creating tasks, posting comments, and changing statuses will appear here.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[18px] top-4 bottom-4 w-px bg-border" />

      <div className="space-y-1">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 pl-1 py-2">
            {/* Icon bubble */}
            <div className="relative z-10 flex items-center justify-center w-9 h-9 rounded-full bg-background border border-border shrink-0">
              {getActivityIcon(activity.type)}
            </div>

            <div className="flex-1 min-w-0 pt-1.5">
              <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5">
                <span className="text-xs font-medium">
                  {activity.actor.firstName} {activity.actor.lastName}
                </span>
                <span className="text-xs text-muted-foreground">{getActivityText(activity)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(activity.createdAt)}</p>
            </div>

            <Avatar className="h-6 w-6 shrink-0 mt-1">
              {activity.actor.profilePhoto && <AvatarImage src={activity.actor.profilePhoto} />}
              <AvatarFallback className="text-[8px]">
                {getInitials(activity.actor.firstName, activity.actor.lastName)}
              </AvatarFallback>
            </Avatar>
          </div>
        ))}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import {
  useProjectPasswords,
  useRevealPassword,
  useCreatePassword,
  useUpdatePassword,
  useDeletePassword,
  type PasswordEntry,
} from "@/hooks/use-projects"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDate, getInitials } from "@/lib/utils"
import { Plus, Eye, EyeOff, Copy, Pencil, Trash2, ExternalLink, KeyRound, Check } from "lucide-react"
import { toast } from "sonner"

interface Props {
  projectId: string
  currentUserId: string
  canManage: boolean
}

export function PasswordsTab({ projectId, currentUserId, canManage }: Props) {
  const { data, isLoading } = useProjectPasswords(projectId)
  const entries = data?.data ?? []
  const [createOpen, setCreateOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Project Credentials</p>
          {entries.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{entries.length}</Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />Add Entry
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Passwords are AES-256 encrypted at rest. Only team members can view entries for this project.
      </p>

      {entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No credentials saved yet. Store API keys, logins, and secrets here securely.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <PasswordRow
              key={entry.id}
              entry={entry}
              projectId={projectId}
              currentUserId={currentUserId}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      <PasswordFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        mode="create"
      />
    </div>
  )
}

function PasswordRow({
  entry, projectId, currentUserId, canManage,
}: {
  entry: PasswordEntry
  projectId: string
  currentUserId: string
  canManage: boolean
}) {
  const reveal = useRevealPassword(projectId)
  const del = useDeletePassword(projectId)
  const [revealedPw, setRevealedPw] = useState<string | null>(null)
  const [showing, setShowing] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const isOwner = entry.createdBy.id === currentUserId

  async function handleReveal() {
    if (revealedPw) {
      setShowing((s) => !s)
      return
    }
    reveal.mutate(entry.id, {
      onSuccess: (res) => {
        setRevealedPw(res.data.password)
        setShowing(true)
      },
    })
  }

  async function handleCopy() {
    let pw = revealedPw
    if (!pw) {
      const res = await new Promise<string | null>((resolve) => {
        reveal.mutate(entry.id, {
          onSuccess: (r) => { setRevealedPw(r.data.password); resolve(r.data.password) },
          onError: () => resolve(null),
        })
      })
      if (!pw) pw = res
    }
    if (pw) {
      navigator.clipboard.writeText(pw).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.success("Copied to clipboard")
      })
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0 mt-0.5">
            <KeyRound className="h-4 w-4 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{entry.label}</span>
              {entry.url && (
                <a
                  href={entry.url.startsWith("http") ? entry.url : `https://${entry.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />{entry.url}
                </a>
              )}
            </div>

            {entry.username && (
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium">Username:</span> {entry.username}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2">
              <code className="text-xs bg-muted rounded px-2 py-0.5 font-mono min-w-24 inline-block">
                {showing && revealedPw ? revealedPw : "••••••••••"}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={handleReveal}
                disabled={reveal.isPending}
                title={showing ? "Hide" : "Reveal"}
              >
                {showing ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
                title="Copy password"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {entry.notes && (
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{entry.notes}</p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {(isOwner || canManage) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {(isOwner || canManage) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => { if (confirm(`Delete "${entry.label}"?`)) del.mutate(entry.id) }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t">
          <Avatar className="h-4 w-4">
            {entry.createdBy.profilePhoto && <AvatarImage src={entry.createdBy.profilePhoto} />}
            <AvatarFallback className="text-[7px]">
              {getInitials(entry.createdBy.firstName, entry.createdBy.lastName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] text-muted-foreground">
            Added by {entry.createdBy.firstName} · {formatDate(entry.createdAt)}
          </span>
        </div>
      </CardContent>

      <PasswordFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        projectId={projectId}
        mode="edit"
        entry={entry}
      />
    </Card>
  )
}

function PasswordFormDialog({
  open, onClose, projectId, mode, entry,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  mode: "create" | "edit"
  entry?: PasswordEntry
}) {
  const [label, setLabel] = useState(entry?.label ?? "")
  const [username, setUsername] = useState(entry?.username ?? "")
  const [password, setPassword] = useState("")
  const [url, setUrl] = useState(entry?.url ?? "")
  const [notes, setNotes] = useState(entry?.notes ?? "")
  const [showPw, setShowPw] = useState(false)
  const create = useCreatePassword(projectId)
  const update = useUpdatePassword(projectId)
  const pending = create.isPending || update.isPending

  function handleSubmit() {
    if (!label.trim()) return
    if (mode === "create") {
      if (!password.trim()) return
      create.mutate(
        { label: label.trim(), password: password.trim(), username: username.trim() || undefined, url: url.trim() || undefined, notes: notes.trim() || undefined },
        { onSuccess: () => { resetForm(); onClose() } },
      )
    } else if (entry) {
      const body: Record<string, string> = {}
      if (label.trim() !== entry.label) body.label = label.trim()
      if (username.trim() !== (entry.username ?? "")) body.username = username.trim()
      if (password.trim()) body.password = password.trim()
      if (url.trim() !== (entry.url ?? "")) body.url = url.trim()
      if (notes.trim() !== (entry.notes ?? "")) body.notes = notes.trim()
      update.mutate({ entryId: entry.id, body }, { onSuccess: () => onClose() })
    }
  }

  function resetForm() {
    setLabel(""); setUsername(""); setPassword(""); setUrl(""); setNotes("")
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Credential" : "Edit Credential"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Label *</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Production DB, AWS Root, Figma Team"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Username / Email</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>{mode === "edit" ? "New Password (leave blank to keep)" : "Password *"}</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "edit" ? "Leave blank to keep" : "Enter password"}
                  className="pr-9"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw((s) => !s)}
                >
                  {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!label.trim() || (mode === "create" && !password.trim()) || pending}
          >
            {pending ? "Saving…" : mode === "create" ? "Save" : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import * as React from "react"
import {
  FileText,
  Download,
  Trash2,
  FileImage,
  File,
  AlertCircle,
} from "lucide-react"

// lucide-react doesn't export FilePdf — use FileText for PDF files
const FilePdf = FileText

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { formatDate, formatFileSize, cn, truncate } from "@/lib/utils"
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/constants"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentCardDocument {
  id: string
  title: string
  fileName: string
  fileSize: number
  mimeType: string
  category: string
  createdAt: Date | string
  expiresAt?: Date | string | null
}

interface DocumentCardProps {
  document: DocumentCardDocument
  onDelete?: (id: string) => void
  canDelete?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface FileIconMeta {
  Icon: React.ElementType
  colorClass: string
}

function getFileIcon(mimeType: string): FileIconMeta {
  if (mimeType === "application/pdf") {
    return { Icon: FileText, colorClass: "text-red-500" }
  }
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return { Icon: FileText, colorClass: "text-blue-500" }
  }
  if (
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return { Icon: FileText, colorClass: "text-green-600" }
  }
  if (mimeType.startsWith("image/")) {
    return { Icon: FileImage, colorClass: "text-emerald-500" }
  }
  return { Icon: File, colorClass: "text-gray-400" }
}

function isExpiringSoon(expiresAt: Date | string): boolean {
  const expDate = new Date(expiresAt)
  const diffMs = expDate.getTime() - Date.now()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= 30 && diffDays > 0
}

function isExpired(expiresAt: Date | string): boolean {
  return new Date(expiresAt).getTime() < Date.now()
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentCard({ document, onDelete, canDelete }: DocumentCardProps) {
  const { Icon, colorClass } = getFileIcon(document.mimeType)
  const categoryLabel =
    DOCUMENT_CATEGORY_LABELS[document.category] ?? document.category

  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [downloadLoading, setDownloadLoading] = React.useState(false)

  const handleDownload = async () => {
    setDownloadLoading(true)
    try {
      const res = await fetch(`/api/documents/${document.id}`)
      if (!res.ok) throw new Error("Failed to get download link")
      const json = await res.json()
      const url: string = json.data?.url
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer")
      }
    } catch {
      // Silent — toast handled higher up if needed
    } finally {
      setDownloadLoading(false)
    }
  }

  const handleDeleteConfirm = () => {
    onDelete?.(document.id)
    setConfirmOpen(false)
  }

  const expirySoon =
    document.expiresAt ? isExpiringSoon(document.expiresAt) : false
  const expired = document.expiresAt ? isExpired(document.expiresAt) : false

  return (
    <>
      <div className="flex items-start gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30">
        {/* File icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className={cn("h-5 w-5", colorClass)} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground" title={document.title}>
              {truncate(document.title, 40)}
            </span>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {categoryLabel}
            </Badge>
          </div>

          <p className="mt-0.5 text-xs text-muted-foreground" title={document.fileName}>
            {document.fileName}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{formatFileSize(document.fileSize)}</span>
            <span>·</span>
            <span>Uploaded {formatDate(document.createdAt)}</span>

            {document.expiresAt && (
              <>
                <span>·</span>
                <span
                  className={cn(
                    "flex items-center gap-1",
                    expired
                      ? "font-medium text-destructive"
                      : expirySoon
                      ? "font-medium text-amber-600"
                      : "text-muted-foreground"
                  )}
                >
                  {(expired || expirySoon) && (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {expired
                    ? `Expired ${formatDate(document.expiresAt)}`
                    : `Expires ${formatDate(document.expiresAt)}`}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleDownload}
            disabled={downloadLoading}
            title="Download"
            aria-label={`Download ${document.title}`}
          >
            <Download className="h-4 w-4" />
          </Button>

          {canDelete && onDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
              title="Delete"
              aria-label={`Delete ${document.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete document?"
        description={`"${document.title}" will be permanently deleted and cannot be recovered.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}

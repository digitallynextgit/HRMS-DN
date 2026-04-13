"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentRecord {
  id: string
  title: string
  description: string | null
  category: string
  fileName: string
  fileSize: number
  mimeType: string
  objectKey: string
  version: number
  employeeId: string | null
  uploadedById: string
  isCompanyDoc: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  uploaderName?: string
}

export interface DocumentUrlData {
  url: string
  document: DocumentRecord
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const documentKeys = {
  all: ["documents"] as const,
  employee: (employeeId: string) => ["documents", "employee", employeeId] as const,
  company: (category?: string) => ["documents", "company", category ?? "all"] as const,
  url: (id: string) => ["documents", "url", id] as const,
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetch all documents belonging to a specific employee.
 */
export function useEmployeeDocuments(employeeId: string) {
  return useQuery<DocumentRecord[]>({
    queryKey: documentKeys.employee(employeeId),
    queryFn: async () => {
      const res = await fetch(`/api/employees/${employeeId}/documents`)
      if (!res.ok) throw new Error("Failed to load documents")
      const json = await res.json()
      return json.data as DocumentRecord[]
    },
    enabled: Boolean(employeeId),
  })
}

/**
 * Fetch company-wide documents, optionally filtered by category.
 */
export function useCompanyDocuments(category?: string) {
  const params = category ? `?category=${encodeURIComponent(category)}` : ""
  return useQuery<DocumentRecord[]>({
    queryKey: documentKeys.company(category),
    queryFn: async () => {
      const res = await fetch(`/api/documents/company${params}`)
      if (!res.ok) throw new Error("Failed to load company documents")
      const json = await res.json()
      return json.data as DocumentRecord[]
    },
  })
}

/**
 * Upload a document via multipart FormData.
 */
export function useUploadDocument() {
  const qc = useQueryClient()

  return useMutation<DocumentRecord, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? "Upload failed")
      }
      const json = await res.json()
      return json.data as DocumentRecord
    },
    onSuccess: (doc) => {
      toast.success("Document uploaded successfully")
      // Invalidate both employee and company caches
      if (doc.employeeId) {
        qc.invalidateQueries({ queryKey: documentKeys.employee(doc.employeeId) })
      }
      qc.invalidateQueries({ queryKey: ["documents", "company"] })
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to upload document")
    },
  })
}

/**
 * Delete a document by id.
 */
export function useDeleteDocument() {
  const qc = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? "Delete failed")
      }
    },
    onSuccess: () => {
      toast.success("Document deleted")
      qc.invalidateQueries({ queryKey: documentKeys.all })
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to delete document")
    },
  })
}

/**
 * Fetch a pre-signed download URL for a document.
 * Disabled by default; enable by passing a valid id.
 */
export function useDocumentUrl(id: string | null) {
  return useQuery<DocumentUrlData>({
    queryKey: documentKeys.url(id ?? ""),
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}`)
      if (!res.ok) throw new Error("Failed to get download URL")
      const json = await res.json()
      return json.data as DocumentUrlData
    },
    enabled: Boolean(id),
    staleTime: 10 * 60 * 1000, // 10 min — URL valid for 15 min
    gcTime: 12 * 60 * 1000,
  })
}

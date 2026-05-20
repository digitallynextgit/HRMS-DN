"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WfhEligibility {
  tier: 1 | 2 | 3
  label: string
  eligibleFromDate: string | null
  monthlyQuota: number
  usedThisMonth: number
  canApplyEmergencyOnly: boolean
  joiningDate: string | null
  probationEnd: string | null
}

export interface WfhEmployeeSnippet {
  id: string
  firstName: string
  lastName: string
  employeeNo: string
  profilePhoto: string | null
}

export interface WfhRequest {
  id: string
  employeeId: string
  date: string
  reason: string | null
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
  isEmergency: boolean
  managerApproverId: string | null
  managerApprovedAt: string | null
  hrApproverId: string | null
  hrApprovedAt: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  employee: WfhEmployeeSnippet
  managerApprover: { id: string; firstName: string; lastName: string } | null
  hrApprover: { id: string; firstName: string; lastName: string } | null
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: { total: number; page: number; limit: number; totalPages: number }
}

interface WfhFilters {
  status?: string
  employeeId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchEligibility(): Promise<WfhEligibility> {
  const res = await fetch("/api/wfh/eligibility")
  if (!res.ok) throw new Error("Failed to load WFH eligibility")
  return res.json()
}

async function fetchWfhRequests(filters: WfhFilters): Promise<PaginatedResponse<WfhRequest>> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v))
  })
  const res = await fetch(`/api/wfh/requests?${params.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch WFH requests" }))
    throw new Error(err.error || "Failed to fetch WFH requests")
  }
  return res.json()
}

async function applyWfh(body: { date: string; reason?: string; isEmergency?: boolean }): Promise<{ data: WfhRequest; tier: number }> {
  const res = await fetch("/api/wfh/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to apply for WFH" }))
    throw new Error(err.error || "Failed to apply for WFH")
  }
  return res.json()
}

async function patchWfh({
  id,
  action,
  rejectionReason,
  approverRole,
}: {
  id: string
  action: "CANCEL" | "APPROVE" | "REJECT"
  rejectionReason?: string
  approverRole?: "MANAGER" | "HR"
}): Promise<{ data: WfhRequest }> {
  const res = await fetch(`/api/wfh/requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, rejectionReason, approverRole }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update WFH request" }))
    throw new Error(err.error || "Failed to update WFH request")
  }
  return res.json()
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useWfhEligibility() {
  return useQuery({ queryKey: ["wfh-eligibility"], queryFn: fetchEligibility, staleTime: 60_000 })
}

export function useMyWfhRequests(filters: Omit<WfhFilters, "employeeId"> = {}) {
  return useQuery({
    queryKey: ["my-wfh-requests", filters],
    queryFn: () => fetchWfhRequests(filters),
    staleTime: 30_000,
  })
}

export function useWfhRequests(filters: WfhFilters = {}) {
  return useQuery({
    queryKey: ["wfh-requests", filters],
    queryFn: () => fetchWfhRequests(filters),
    staleTime: 30_000,
  })
}

export function useApplyWfh() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: applyWfh,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-wfh-requests"] })
      qc.invalidateQueries({ queryKey: ["wfh-requests"] })
      qc.invalidateQueries({ queryKey: ["wfh-eligibility"] })
      toast.success("WFH request submitted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCancelWfh() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => patchWfh({ id, action: "CANCEL" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-wfh-requests"] })
      qc.invalidateQueries({ queryKey: ["wfh-requests"] })
      qc.invalidateQueries({ queryKey: ["wfh-eligibility"] })
      toast.success("WFH request cancelled")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useApproveWfh() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approverRole }: { id: string; approverRole?: "MANAGER" | "HR" }) =>
      patchWfh({ id, action: "APPROVE", approverRole }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wfh-requests"] })
      toast.success("WFH request approved")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRejectWfh() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rejectionReason, approverRole }: { id: string; rejectionReason: string; approverRole?: "MANAGER" | "HR" }) =>
      patchWfh({ id, action: "REJECT", rejectionReason, approverRole }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wfh-requests"] })
      toast.success("WFH request rejected")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

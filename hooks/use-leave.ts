"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeaveType {
  id: string
  name: string
  code: string
  description: string | null
  isPaid: boolean
  maxDaysPerYear: number
  carryForward: boolean
  maxCarryDays: number
  requiresApproval: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LeaveBalance {
  id: string
  employeeId: string
  leaveTypeId: string
  year: number
  allocated: number
  used: number
  pending: number
  carried: number
  leaveType: LeaveType
}

export interface LeaveRequestEmployee {
  id: string
  firstName: string
  lastName: string
  employeeNo: string
  profilePhoto: string | null
  department?: { id: string; name: string } | null
}

export interface LeaveRequest {
  id: string
  employeeId: string
  leaveTypeId: string
  startDate: string
  endDate: string
  totalDays: number
  reason: string | null
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
  approverId: string | null
  approvedAt: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  employee: LeaveRequestEmployee
  leaveType: { id: string; name: string; code: string; isPaid: boolean }
  approver: { id: string; firstName: string; lastName: string } | null
}

export interface LeaveRequestFilters {
  status?: string
  employeeId?: string
  leaveTypeId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// ─── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchLeaveTypes(): Promise<{ data: LeaveType[] }> {
  const res = await fetch("/api/leave/types")
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch leave types" }))
    throw new Error(err.error || "Failed to fetch leave types")
  }
  return res.json()
}

async function createLeaveType(body: Partial<LeaveType>): Promise<{ data: LeaveType }> {
  const res = await fetch("/api/leave/types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create leave type" }))
    throw new Error(err.error || "Failed to create leave type")
  }
  return res.json()
}

async function updateLeaveType({
  id,
  body,
}: {
  id: string
  body: Partial<LeaveType>
}): Promise<{ data: LeaveType }> {
  const res = await fetch(`/api/leave/types/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update leave type" }))
    throw new Error(err.error || "Failed to update leave type")
  }
  return res.json()
}

async function deleteLeaveType(id: string): Promise<{ message: string }> {
  const res = await fetch(`/api/leave/types/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to delete leave type" }))
    throw new Error(err.error || "Failed to delete leave type")
  }
  return res.json()
}

async function fetchLeaveBalances(
  employeeId?: string,
  year?: number
): Promise<{ data: LeaveBalance[] }> {
  const params = new URLSearchParams()
  if (employeeId) params.set("employeeId", employeeId)
  if (year) params.set("year", String(year))
  const res = await fetch(`/api/leave/balances?${params.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch leave balances" }))
    throw new Error(err.error || "Failed to fetch leave balances")
  }
  return res.json()
}

async function allocateLeave(body: {
  employeeId: string
  leaveTypeId: string
  year: number
  allocated: number
  carried?: number
}): Promise<{ data: LeaveBalance }> {
  const res = await fetch("/api/leave/balances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to allocate leave" }))
    throw new Error(err.error || "Failed to allocate leave")
  }
  return res.json()
}

async function fetchLeaveRequests(
  filters: LeaveRequestFilters
): Promise<PaginatedResponse<LeaveRequest>> {
  const params = new URLSearchParams()
  if (filters.status) params.set("status", filters.status)
  if (filters.employeeId) params.set("employeeId", filters.employeeId)
  if (filters.leaveTypeId) params.set("leaveTypeId", filters.leaveTypeId)
  if (filters.from) params.set("from", filters.from)
  if (filters.to) params.set("to", filters.to)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  const res = await fetch(`/api/leave/requests?${params.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch leave requests" }))
    throw new Error(err.error || "Failed to fetch leave requests")
  }
  return res.json()
}

async function fetchTeamLeaveRequests(
  filters: { status?: string; page?: number; limit?: number }
): Promise<PaginatedResponse<LeaveRequest>> {
  const params = new URLSearchParams()
  if (filters.status) params.set("status", filters.status)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  const res = await fetch(`/api/leave/team?${params.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch team leave requests" }))
    throw new Error(err.error || "Failed to fetch team leave requests")
  }
  return res.json()
}

async function applyLeave(body: {
  leaveTypeId: string
  startDate: string
  endDate: string
  reason?: string
}): Promise<{ data: LeaveRequest }> {
  const res = await fetch("/api/leave/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to apply for leave" }))
    throw new Error(err.error || "Failed to apply for leave")
  }
  return res.json()
}

async function cancelLeave(id: string): Promise<{ data: LeaveRequest }> {
  const res = await fetch(`/api/leave/requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "CANCEL" }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to cancel leave request" }))
    throw new Error(err.error || "Failed to cancel leave request")
  }
  return res.json()
}

async function approveLeave(id: string): Promise<{ data: LeaveRequest }> {
  const res = await fetch(`/api/leave/requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "APPROVE" }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to approve leave request" }))
    throw new Error(err.error || "Failed to approve leave request")
  }
  return res.json()
}

async function rejectLeave({
  id,
  rejectionReason,
}: {
  id: string
  rejectionReason: string
}): Promise<{ data: LeaveRequest }> {
  const res = await fetch(`/api/leave/requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "REJECT", rejectionReason }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to reject leave request" }))
    throw new Error(err.error || "Failed to reject leave request")
  }
  return res.json()
}

// ─── Query Hooks ───────────────────────────────────────────────────────────────

export function useLeaveTypes() {
  return useQuery({
    queryKey: ["leave-types"],
    queryFn: fetchLeaveTypes,
    staleTime: 300_000,
  })
}

export function useLeaveBalances(employeeId?: string, year?: number) {
  return useQuery({
    queryKey: ["leave-balances", employeeId, year],
    queryFn: () => fetchLeaveBalances(employeeId, year),
    staleTime: 60_000,
  })
}

export function useLeaveRequests(filters: LeaveRequestFilters = {}) {
  return useQuery({
    queryKey: ["leave-requests", filters],
    queryFn: () => fetchLeaveRequests(filters),
    staleTime: 30_000,
  })
}

export function useMyLeaveRequests(filters: Omit<LeaveRequestFilters, "employeeId"> = {}) {
  return useQuery({
    queryKey: ["my-leave-requests", filters],
    queryFn: () => fetchLeaveRequests(filters),
    staleTime: 30_000,
  })
}

export function useTeamLeaveRequests(
  filters: { status?: string; page?: number; limit?: number } = {}
) {
  return useQuery({
    queryKey: ["team-leave-requests", filters],
    queryFn: () => fetchTeamLeaveRequests(filters),
    staleTime: 30_000,
  })
}

// ─── Mutation Hooks ────────────────────────────────────────────────────────────

export function useApplyLeave() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: applyLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] })
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] })
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] })
      toast.success("Leave request submitted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to apply for leave")
    },
  })
}

export function useCancelLeave() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] })
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] })
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] })
      toast.success("Leave request cancelled")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel leave request")
    },
  })
}

export function useApproveLeave() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: approveLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] })
      queryClient.invalidateQueries({ queryKey: ["team-leave-requests"] })
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] })
      toast.success("Leave request approved")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to approve leave request")
    },
  })
}

export function useRejectLeave() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rejectLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] })
      queryClient.invalidateQueries({ queryKey: ["team-leave-requests"] })
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] })
      toast.success("Leave request rejected")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reject leave request")
    },
  })
}

export function useCreateLeaveType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createLeaveType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] })
      toast.success("Leave type created successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create leave type")
    },
  })
}

export function useUpdateLeaveType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateLeaveType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] })
      toast.success("Leave type updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update leave type")
    },
  })
}

export function useDeleteLeaveType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteLeaveType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] })
      toast.success("Leave type deactivated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to deactivate leave type")
    },
  })
}

export function useAllocateLeave() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: allocateLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] })
      toast.success("Leave balance allocated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to allocate leave")
    },
  })
}

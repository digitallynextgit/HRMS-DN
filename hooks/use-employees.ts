"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmployeeListItem {
  id: string
  employeeNo: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  personalEmail: string | null
  personalPhone: string | null
  dateOfBirth: string | null
  gender: string | null
  nationality: string | null
  bloodGroup: string | null
  profilePhoto: string | null
  status: string
  employmentType: string
  dateOfJoining: string | null
  probationEndDate: string | null
  workLocation: string | null
  isActive: boolean
  createdAt: string
  department: { id: string; name: string } | null
  designation: { id: string; title: string } | null
  manager: { id: string; firstName: string; lastName: string } | null
}

export interface EmployeeDetail extends EmployeeListItem {
  currentAddress: Record<string, string> | null
  permanentAddress: Record<string, string> | null
  emergencyContact: Record<string, string> | null
  _count: { subordinates: number; documents: number }
  employeeRoles: Array<{
    id: string
    role: { id: string; name: string; displayName: string }
  }>
  department: { id: string; name: string; code: string } | null
  designation: { id: string; title: string; level: number } | null
  manager: {
    id: string
    firstName: string
    lastName: string
    email: string
    profilePhoto: string | null
  } | null
}

export interface Department {
  id: string
  name: string
  code: string
  description: string | null
  headId: string | null
}

export interface Designation {
  id: string
  title: string
  level: number
}

export interface EmployeeFilters {
  search?: string
  departmentId?: string
  designationId?: string
  status?: string
  employmentType?: string
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

async function fetchEmployees(filters: EmployeeFilters): Promise<PaginatedResponse<EmployeeListItem>> {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.departmentId) params.set("departmentId", filters.departmentId)
  if (filters.designationId) params.set("designationId", filters.designationId)
  if (filters.status) params.set("status", filters.status)
  if (filters.employmentType) params.set("employmentType", filters.employmentType)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))

  const res = await fetch(`/api/employees?${params.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch employees" }))
    throw new Error(err.error || "Failed to fetch employees")
  }
  return res.json()
}

async function fetchEmployee(id: string): Promise<{ data: EmployeeDetail }> {
  const res = await fetch(`/api/employees/${id}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch employee" }))
    throw new Error(err.error || "Failed to fetch employee")
  }
  return res.json()
}

async function createEmployee(body: Record<string, unknown>): Promise<{ data: EmployeeListItem }> {
  const res = await fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create employee" }))
    throw new Error(err.error || "Failed to create employee")
  }
  return res.json()
}

async function updateEmployee({
  id,
  body,
}: {
  id: string
  body: Record<string, unknown>
}): Promise<{ data: EmployeeListItem }> {
  const res = await fetch(`/api/employees/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update employee" }))
    throw new Error(err.error || "Failed to update employee")
  }
  return res.json()
}

async function deleteEmployee(id: string): Promise<{ message: string }> {
  const res = await fetch(`/api/employees/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to delete employee" }))
    throw new Error(err.error || "Failed to delete employee")
  }
  return res.json()
}

async function fetchOrgChart(): Promise<{ data: import("@/types").OrgNode[] }> {
  const res = await fetch("/api/employees/org-chart")
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch org chart" }))
    throw new Error(err.error || "Failed to fetch org chart")
  }
  return res.json()
}

async function fetchDepartments(): Promise<{ data: Department[] }> {
  const res = await fetch("/api/departments")
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch departments" }))
    throw new Error(err.error || "Failed to fetch departments")
  }
  return res.json()
}

async function fetchDesignations(): Promise<{ data: Designation[] }> {
  const res = await fetch("/api/designations")
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch designations" }))
    throw new Error(err.error || "Failed to fetch designations")
  }
  return res.json()
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useEmployees(filters: EmployeeFilters = {}) {
  return useQuery({
    queryKey: ["employees", filters],
    queryFn: () => fetchEmployees(filters),
    staleTime: 30_000,
  })
}

export function useEmployee(id: string | null | undefined) {
  return useQuery({
    queryKey: ["employee", id],
    queryFn: () => fetchEmployee(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      toast.success("Employee created successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create employee")
    },
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateEmployee,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      queryClient.invalidateQueries({ queryKey: ["employee", variables.id] })
      toast.success("Employee updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update employee")
    },
  })
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      toast.success("Employee terminated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to terminate employee")
    },
  })
}

export function useOrgChart() {
  return useQuery({
    queryKey: ["org-chart"],
    queryFn: fetchOrgChart,
    staleTime: 60_000,
  })
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
    staleTime: 300_000,
  })
}

export function useDesignations() {
  return useQuery({
    queryKey: ["designations"],
    queryFn: fetchDesignations,
    staleTime: 300_000,
  })
}

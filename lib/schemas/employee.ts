import { z } from "zod"

const addressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional().default("India"),
}).optional()

const emergencyContactSchema = z.object({
  name: z.string().optional(),
  relation: z.string().optional(),
  phone: z.string().optional(),
}).optional()

export const createEmployeeSchema = z.object({
  // Personal
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid work email is required"),
  personalEmail: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  personalPhone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  nationality: z.string().optional(),
  bloodGroup: z.string().optional(),

  // Employment
  departmentId: z.string().uuid("Select a department").optional(),
  designationId: z.string().uuid("Select a designation").optional(),
  managerId: z.string().uuid().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).default("FULL_TIME"),
  dateOfJoining: z.string().optional(),
  probationEndDate: z.string().optional(),
  workLocation: z.string().optional(),

  // Address & Emergency
  currentAddress: addressSchema,
  permanentAddress: addressSchema,
  emergencyContact: emergencyContactSchema,

  // Optional initial password
  password: z.string().min(8).optional(),
})

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>

export const updateEmployeeSchema = createEmployeeSchema.partial()
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>

export const employeeFilterSchema = z.object({
  search: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  designationId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "RESIGNED", "TERMINATED"]).optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export type EmployeeFilter = z.infer<typeof employeeFilterSchema>

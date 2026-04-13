"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { cn, formatDate } from "@/lib/utils"
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/constants"
import {
  useCreateEmployee,
  useUpdateEmployee,
  useEmployee,
  useDepartments,
  useDesignations,
} from "@/hooks/use-employees"

// ─── Schema ──────────────────────────────────────────────────────────────────

const formSchema = z.object({
  // Step 1 - Personal
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid work email is required"),
  personalEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  personalPhone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY", ""]).optional(),
  nationality: z.string().optional(),
  bloodGroup: z.string().optional(),

  // Step 2 - Employment
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  managerId: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).default("FULL_TIME"),
  dateOfJoining: z.string().optional(),
  probationEndDate: z.string().optional(),
  workLocation: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),

  // Step 3 - Address
  currentLine1: z.string().optional(),
  currentLine2: z.string().optional(),
  currentCity: z.string().optional(),
  currentState: z.string().optional(),
  currentZip: z.string().optional(),
  sameAsCurrent: z.boolean().default(false),
  permanentLine1: z.string().optional(),
  permanentLine2: z.string().optional(),
  permanentCity: z.string().optional(),
  permanentState: z.string().optional(),
  permanentZip: z.string().optional(),

  // Emergency
  emergencyName: z.string().optional(),
  emergencyRelation: z.string().optional(),
  emergencyPhone: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, label: "Personal Info" },
  { number: 2, label: "Employment" },
  { number: 3, label: "Address & Emergency" },
  { number: 4, label: "Review & Submit" },
]

// ─── Props ───────────────────────────────────────────────────────────────────

interface EmployeeFormProps {
  mode: "create" | "edit"
  employeeId?: string
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: typeof STEPS
  currentStep: number
}) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.number
        const isActive = currentStep === step.number

        return (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                  isCompleted && "bg-primary text-primary-foreground",
                  isActive && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                  !isCompleted && !isActive && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.number}
              </div>
              <span
                className={cn(
                  "text-xs hidden sm:block",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-12 sm:w-20 mx-1 mb-5 transition-colors",
                  currentStep > step.number ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ─── Review section ───────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2">
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EmployeeForm({ mode, employeeId }: EmployeeFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)

  const { data: employeeData, isLoading: isLoadingEmployee } = useEmployee(
    mode === "edit" ? employeeId : null
  )
  const { data: deptsData } = useDepartments()
  const { data: desigData } = useDesignations()

  const departments = deptsData?.data ?? []
  const designations = desigData?.data ?? []

  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
    trigger,
    getValues,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employmentType: "FULL_TIME",
      sameAsCurrent: false,
    },
  })

  const sameAsCurrent = watch("sameAsCurrent")
  const watchedValues = watch()

  // Populate form when editing
  useEffect(() => {
    if (mode === "edit" && employeeData?.data) {
      const emp = employeeData.data
      const ca = (emp.currentAddress ?? {}) as Record<string, string>
      const pa = (emp.permanentAddress ?? {}) as Record<string, string>
      const ec = (emp.emergencyContact ?? {}) as Record<string, string>

      reset({
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        personalEmail: emp.personalEmail ?? "",
        phone: emp.phone ?? "",
        personalPhone: emp.personalPhone ?? "",
        dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.split("T")[0] : "",
        gender: (emp.gender as FormData["gender"]) ?? "",
        nationality: emp.nationality ?? "",
        bloodGroup: emp.bloodGroup ?? "",
        departmentId: emp.department?.id ?? "",
        designationId: emp.designation?.id ?? "",
        managerId: emp.manager?.id ?? "",
        employmentType: (emp.employmentType as FormData["employmentType"]) ?? "FULL_TIME",
        dateOfJoining: emp.dateOfJoining ? emp.dateOfJoining.split("T")[0] : "",
        probationEndDate: emp.probationEndDate ? emp.probationEndDate.split("T")[0] : "",
        workLocation: emp.workLocation ?? "",
        currentLine1: ca.line1 ?? "",
        currentLine2: ca.line2 ?? "",
        currentCity: ca.city ?? "",
        currentState: ca.state ?? "",
        currentZip: ca.zip ?? "",
        permanentLine1: pa.line1 ?? "",
        permanentLine2: pa.line2 ?? "",
        permanentCity: pa.city ?? "",
        permanentState: pa.state ?? "",
        permanentZip: pa.zip ?? "",
        emergencyName: ec.name ?? "",
        emergencyRelation: ec.relation ?? "",
        emergencyPhone: ec.phone ?? "",
      })
    }
  }, [employeeData, mode, reset])

  const stepFields: Record<number, (keyof FormData)[]> = {
    1: ["firstName", "lastName", "email"],
    2: [],
    3: [],
    4: [],
  }

  async function goNext() {
    const fieldsToValidate = stepFields[currentStep]
    const valid = fieldsToValidate.length > 0 ? await trigger(fieldsToValidate) : true
    if (valid) setCurrentStep((s) => Math.min(s + 1, 4))
  }

  function goPrev() {
    setCurrentStep((s) => Math.max(s - 1, 1))
  }

  async function onSubmit(data: FormData) {
    const payload = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      personalEmail: data.personalEmail || undefined,
      phone: data.phone || undefined,
      personalPhone: data.personalPhone || undefined,
      dateOfBirth: data.dateOfBirth || undefined,
      gender: data.gender || undefined,
      nationality: data.nationality || undefined,
      bloodGroup: data.bloodGroup || undefined,
      departmentId: data.departmentId || undefined,
      designationId: data.designationId || undefined,
      managerId: data.managerId || undefined,
      employmentType: data.employmentType,
      dateOfJoining: data.dateOfJoining || undefined,
      probationEndDate: data.probationEndDate || undefined,
      workLocation: data.workLocation || undefined,
      password: data.password || undefined,
      currentAddress:
        data.currentLine1 || data.currentCity
          ? {
              line1: data.currentLine1,
              line2: data.currentLine2,
              city: data.currentCity,
              state: data.currentState,
              zip: data.currentZip,
            }
          : undefined,
      permanentAddress:
        data.sameAsCurrent
          ? {
              line1: data.currentLine1,
              line2: data.currentLine2,
              city: data.currentCity,
              state: data.currentState,
              zip: data.currentZip,
            }
          : data.permanentLine1 || data.permanentCity
          ? {
              line1: data.permanentLine1,
              line2: data.permanentLine2,
              city: data.permanentCity,
              state: data.permanentState,
              zip: data.permanentZip,
            }
          : undefined,
      emergencyContact:
        data.emergencyName
          ? {
              name: data.emergencyName,
              relation: data.emergencyRelation,
              phone: data.emergencyPhone,
            }
          : undefined,
    }

    if (mode === "create") {
      const result = await createEmployee.mutateAsync(payload as Record<string, unknown>)
      if (result?.data?.id) {
        router.push(`/employees/${result.data.id}`)
      }
    } else if (mode === "edit" && employeeId) {
      await updateEmployee.mutateAsync({ id: employeeId, body: payload as Record<string, unknown> })
      router.push(`/employees/${employeeId}`)
    }
  }

  const isSubmitting = createEmployee.isPending || updateEmployee.isPending

  if (mode === "edit" && isLoadingEmployee) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const selectedDept = departments.find((d) => d.id === watchedValues.departmentId)
  const selectedDesig = designations.find((d) => d.id === watchedValues.designationId)

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* ── Step 1: Personal Info ──────────────────────────────────────────── */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField label="First Name" required error={errors.firstName?.message}>
              <Input {...register("firstName")} placeholder="John" />
            </FormField>

            <FormField label="Last Name" required error={errors.lastName?.message}>
              <Input {...register("lastName")} placeholder="Doe" />
            </FormField>

            <FormField label="Work Email" required error={errors.email?.message}>
              <Input {...register("email")} type="email" placeholder="john.doe@company.com" />
            </FormField>

            <FormField label="Personal Email" error={errors.personalEmail?.message}>
              <Input {...register("personalEmail")} type="email" placeholder="john@gmail.com" />
            </FormField>

            <FormField label="Work Phone" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="+91 98765 43210" />
            </FormField>

            <FormField label="Personal Phone" error={errors.personalPhone?.message}>
              <Input {...register("personalPhone")} placeholder="+91 98765 43210" />
            </FormField>

            <FormField label="Date of Birth" error={errors.dateOfBirth?.message}>
              <Input {...register("dateOfBirth")} type="date" />
            </FormField>

            <FormField label="Gender" error={errors.gender?.message}>
              <Select
                value={watchedValues.gender || ""}
                onValueChange={(v) => setValue("gender", v as FormData["gender"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                  <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Nationality" error={errors.nationality?.message}>
              <Input {...register("nationality")} placeholder="Indian" />
            </FormField>

            <FormField label="Blood Group" error={errors.bloodGroup?.message}>
              <Select
                value={watchedValues.bloodGroup || ""}
                onValueChange={(v) => setValue("bloodGroup", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Employment ────────────────────────────────────────────── */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField label="Department" error={errors.departmentId?.message}>
              <Select
                value={watchedValues.departmentId || ""}
                onValueChange={(v) => setValue("departmentId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Designation" error={errors.designationId?.message}>
              <Select
                value={watchedValues.designationId || ""}
                onValueChange={(v) => setValue("designationId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {designations.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Employment Type" error={errors.employmentType?.message}>
              <Select
                value={watchedValues.employmentType}
                onValueChange={(v) => setValue("employmentType", v as FormData["employmentType"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Manager Employee ID" error={errors.managerId?.message}>
              <Input {...register("managerId")} placeholder="Manager's Employee ID (UUID)" autoComplete="off" />
            </FormField>

            <FormField label="Date of Joining" error={errors.dateOfJoining?.message}>
              <Input {...register("dateOfJoining")} type="date" />
            </FormField>

            <FormField label="Probation End Date" error={errors.probationEndDate?.message}>
              <Input {...register("probationEndDate")} type="date" />
            </FormField>

            <FormField label="Work Location" error={errors.workLocation?.message}>
              <Input {...register("workLocation")} placeholder="e.g. Mumbai HQ, Remote" autoComplete="off" />
            </FormField>

            {mode === "create" && (
              <FormField label="Initial Password" error={errors.password?.message}>
                <Input
                  {...register("password")}
                  type="password"
                  placeholder="Min 8 characters (optional)"
                  autoComplete="new-password"
                />
              </FormField>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Address & Emergency ───────────────────────────────────── */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Address</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <FormField label="Address Line 1">
                  <Input {...register("currentLine1")} placeholder="Street address, building" />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField label="Address Line 2">
                  <Input {...register("currentLine2")} placeholder="Apartment, suite, unit" />
                </FormField>
              </div>
              <FormField label="City">
                <Input {...register("currentCity")} placeholder="Mumbai" />
              </FormField>
              <FormField label="State">
                <Input {...register("currentState")} placeholder="Maharashtra" />
              </FormField>
              <FormField label="ZIP / Postal Code">
                <Input {...register("currentZip")} placeholder="400001" />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Permanent Address</CardTitle>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={sameAsCurrent}
                    onCheckedChange={(checked) => setValue("sameAsCurrent", !!checked)}
                  />
                  <span className="text-sm text-muted-foreground">Same as current</span>
                </label>
              </div>
            </CardHeader>
            {!sameAsCurrent && (
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <FormField label="Address Line 1">
                    <Input {...register("permanentLine1")} placeholder="Street address, building" />
                  </FormField>
                </div>
                <div className="sm:col-span-2">
                  <FormField label="Address Line 2">
                    <Input {...register("permanentLine2")} placeholder="Apartment, suite, unit" />
                  </FormField>
                </div>
                <FormField label="City">
                  <Input {...register("permanentCity")} placeholder="Pune" />
                </FormField>
                <FormField label="State">
                  <Input {...register("permanentState")} placeholder="Maharashtra" />
                </FormField>
                <FormField label="ZIP / Postal Code">
                  <Input {...register("permanentZip")} placeholder="411001" />
                </FormField>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Contact Name">
                <Input {...register("emergencyName")} placeholder="Jane Doe" />
              </FormField>
              <FormField label="Relation">
                <Input {...register("emergencyRelation")} placeholder="Spouse, Parent, etc." />
              </FormField>
              <FormField label="Phone Number">
                <Input {...register("emergencyPhone")} placeholder="+91 98765 43210" />
              </FormField>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Step 4: Review ────────────────────────────────────────────────── */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ReviewRow label="Full Name" value={`${watchedValues.firstName || ""} ${watchedValues.lastName || ""}`.trim()} />
              <ReviewRow label="Work Email" value={watchedValues.email} />
              <ReviewRow label="Personal Email" value={watchedValues.personalEmail} />
              <ReviewRow label="Work Phone" value={watchedValues.phone} />
              <ReviewRow label="Personal Phone" value={watchedValues.personalPhone} />
              <ReviewRow label="Date of Birth" value={watchedValues.dateOfBirth ? formatDate(watchedValues.dateOfBirth) : undefined} />
              <ReviewRow label="Gender" value={watchedValues.gender || undefined} />
              <ReviewRow label="Nationality" value={watchedValues.nationality} />
              <ReviewRow label="Blood Group" value={watchedValues.bloodGroup} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ReviewRow label="Department" value={selectedDept?.name} />
              <ReviewRow label="Designation" value={selectedDesig?.title} />
              <ReviewRow label="Employment Type" value={EMPLOYMENT_TYPE_LABELS[watchedValues.employmentType] ?? watchedValues.employmentType} />
              <ReviewRow label="Work Location" value={watchedValues.workLocation} />
              <ReviewRow label="Date of Joining" value={watchedValues.dateOfJoining ? formatDate(watchedValues.dateOfJoining) : undefined} />
              <ReviewRow label="Probation End" value={watchedValues.probationEndDate ? formatDate(watchedValues.probationEndDate) : undefined} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {watchedValues.currentLine1 && (
                <ReviewRow
                  label="Current Address"
                  value={[
                    watchedValues.currentLine1,
                    watchedValues.currentLine2,
                    watchedValues.currentCity,
                    watchedValues.currentState,
                    watchedValues.currentZip,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
              )}
              {sameAsCurrent ? (
                <ReviewRow label="Permanent Address" value="Same as current" />
              ) : watchedValues.permanentLine1 ? (
                <ReviewRow
                  label="Permanent Address"
                  value={[
                    watchedValues.permanentLine1,
                    watchedValues.permanentLine2,
                    watchedValues.permanentCity,
                    watchedValues.permanentState,
                    watchedValues.permanentZip,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
              ) : null}
            </CardContent>
          </Card>

          {watchedValues.emergencyName && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ReviewRow label="Name" value={watchedValues.emergencyName} />
                <ReviewRow label="Relation" value={watchedValues.emergencyRelation} />
                <ReviewRow label="Phone" value={watchedValues.emergencyPhone} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={goPrev}
          disabled={currentStep === 1}
          className="gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-3">
          {currentStep < 4 ? (
            <Button type="button" onClick={goNext} className="gap-1.5">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : mode === "create" ? (
                "Create Employee"
              ) : (
                "Save Changes"
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}

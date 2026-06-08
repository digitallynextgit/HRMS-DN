"use server"

import { db } from "@/lib/db"
import { z } from "zod"
import { PERMISSIONS } from "@/lib/constants"
import { requireSession, requirePermission } from "./_guard"
import { ok, fail, runAction, type ActionResult } from "./_result"

const DEPT_SELECT = {
  id: true,
  name: true,
  code: true,
  description: true,
  headId: true,
  careersTone: true,
  careersJobsLabel: true,
} as const

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
})

type DepartmentRow = {
  id: string
  name: string
  code: string
  description: string | null
  headId: string | null
  careersTone: string | null
  careersJobsLabel: string | null
}

export async function getDepartments(): Promise<ActionResult<DepartmentRow[]>> {
  return runAction(async () => {
    await requireSession()
    const data = await db.department.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: DEPT_SELECT,
    })
    return ok(data)
  })
}

export async function getDepartment(id: string): Promise<ActionResult<DepartmentRow>> {
  return runAction(async () => {
    await requirePermission(PERMISSIONS.EMPLOYEE_READ)
    const dept = await db.department.findUnique({ where: { id }, select: DEPT_SELECT })
    if (!dept) return fail("Not found")
    return ok(dept)
  })
}

export async function createDepartment(input: {
  name: string
  code: string
  description?: string
}): Promise<ActionResult<DepartmentRow>> {
  return runAction(async () => {
    await requirePermission(PERMISSIONS.EMPLOYEE_WRITE)
    const parsed = createSchema.safeParse(input)
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors)
    try {
      const dept = await db.department.create({
        data: {
          name: parsed.data.name,
          code: parsed.data.code.toUpperCase(),
          description: parsed.data.description || null,
        },
        select: DEPT_SELECT,
      })
      return ok(dept)
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002")
        return fail("Department name or code already exists")
      throw e
    }
  })
}

export async function updateDepartment(
  id: string,
  input: {
    name?: string
    code?: string
    description?: string | null
    headId?: string | null
    careersTone?: string | null
    careersJobsLabel?: string | null
  },
): Promise<ActionResult<DepartmentRow>> {
  return runAction(async () => {
    await requirePermission(PERMISSIONS.EMPLOYEE_WRITE)
    const data: Record<string, string | null> = {}
    if (input.name !== undefined) data.name = String(input.name)
    if (input.code !== undefined) data.code = String(input.code).toUpperCase()
    if (input.description !== undefined) data.description = input.description || null
    if (input.headId !== undefined) data.headId = input.headId || null
    if (input.careersTone !== undefined) {
      const tone = input.careersTone
      data.careersTone = tone === "red" || tone === "teal" ? tone : null
    }
    if (input.careersJobsLabel !== undefined) {
      const label = typeof input.careersJobsLabel === "string" ? input.careersJobsLabel.trim() : ""
      data.careersJobsLabel = label.length > 0 ? label : null
    }
    try {
      const dept = await db.department.update({ where: { id }, data, select: DEPT_SELECT })
      return ok(dept)
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002")
        return fail("Department name or code already exists")
      throw e
    }
  })
}

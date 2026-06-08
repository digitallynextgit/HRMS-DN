"use server"

import { db } from "@/lib/db"
import { z } from "zod"
import { PERMISSIONS } from "@/lib/constants"
import { requireSession, requirePermission } from "./_guard"
import { ok, fail, runAction, type ActionResult } from "./_result"

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  level: z.number().int().min(1, "Level must be at least 1"),
})

type DesignationRow = { id: string; title: string; level: number }

export async function getDesignations(): Promise<ActionResult<DesignationRow[]>> {
  return runAction(async () => {
    await requireSession()
    const data = await db.designation.findMany({
      where: { isActive: true },
      orderBy: { level: "asc" },
      select: { id: true, title: true, level: true },
    })
    return ok(data)
  })
}

export async function createDesignation(input: {
  title: string
  level: number
}): Promise<ActionResult<DesignationRow>> {
  return runAction(async () => {
    await requirePermission(PERMISSIONS.EMPLOYEE_WRITE)
    const parsed = createSchema.safeParse(input)
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors)
    try {
      const designation = await db.designation.create({
        data: { title: parsed.data.title, level: parsed.data.level },
        select: { id: true, title: true, level: true },
      })
      return ok(designation)
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002")
        return fail("Designation title already exists")
      throw e
    }
  })
}

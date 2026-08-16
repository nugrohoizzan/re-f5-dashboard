"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { shiftValueRules } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { z } from "zod";

const ruleSchema = z.object({
  rawValue: z.string().min(1).max(20),
  mapsToShift: z.enum(["1", "2", "3"]).nullable(),
  label: z.string().min(1).max(60),
  colorToken: z.string().min(1).max(30),
  startTime: z.string().max(5).optional().or(z.literal("")),
  endTime: z.string().max(5).optional().or(z.literal("")),
});

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Only admins can edit schedule value rules.");
  }
}

export async function upsertShiftValueRule(input: unknown) {
  await requireAdmin();
  const data = ruleSchema.parse(input);

  const [existing] = await db
    .select()
    .from(shiftValueRules)
    .where(eq(shiftValueRules.rawValue, data.rawValue))
    .limit(1);

  if (existing) {
    await db
      .update(shiftValueRules)
      .set({
        mapsToShift: data.mapsToShift,
        label: data.label,
        colorToken: data.colorToken,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
      })
      .where(eq(shiftValueRules.id, existing.id));
  } else {
    await db.insert(shiftValueRules).values({
      ...data,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
    });
  }

  revalidatePath("/settings");
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

export async function deleteShiftValueRule(id: number) {
  await requireAdmin();
  await db.delete(shiftValueRules).where(eq(shiftValueRules.id, id));
  revalidatePath("/settings");
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

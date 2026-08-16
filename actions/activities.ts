"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, auditLog } from "@/lib/db/schema";
import { activitiesBatchSchema, activityInputSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  return session;
}

export async function createActivitiesBatch(input: unknown) {
  const session = await requireUser();
  const data = activitiesBatchSchema.parse(input);

  const rows = data.items.map((item) => ({
    date: data.date,
    shift: data.shift,
    description: item.description,
    status: item.status,
    engineerId: item.engineerId ?? null,
    createdBy: Number(session.user.id),
  }));

  await db.insert(activities).values(rows);

  revalidatePath("/activities");
  revalidatePath("/dashboard");
  return { ok: true, count: rows.length };
}

const updateSchema = activityInputSchema.extend({ id: z.number().int() });

export async function updateActivity(input: unknown) {
  const session = await requireUser();
  const data = updateSchema.parse(input);

  const [existing] = await db
    .select()
    .from(activities)
    .where(eq(activities.id, data.id))
    .limit(1);
  if (!existing) throw new Error("Activity not found.");

  await db
    .update(activities)
    .set({
      description: data.description,
      status: data.status,
      engineerId: data.engineerId ?? existing.engineerId,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, data.id));

  if (existing.status !== data.status) {
    await db.insert(auditLog).values({
      entityType: "activity",
      entityId: data.id,
      field: "status",
      oldValue: existing.status,
      newValue: data.status,
      changedBy: Number(session.user.id),
    });
  }

  revalidatePath("/activities");
  revalidatePath("/dashboard");
}

export async function deleteActivity(id: number) {
  await requireUser();
  await db.delete(activities).where(eq(activities.id, id));
  revalidatePath("/activities");
  revalidatePath("/dashboard");
}

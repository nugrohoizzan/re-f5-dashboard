"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { troubleshooting, auditLog } from "@/lib/db/schema";
import { troubleshootSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  return session;
}

export async function createTroubleshoot(input: unknown) {
  const session = await requireUser();
  const data = troubleshootSchema.parse(input);

  const [row] = await db
    .insert(troubleshooting)
    .values({
      date: data.date,
      shift: data.shift,
      engineerId: data.engineerId ?? null,
      title: data.title,
      description: data.description || null,
      ticketReference: data.ticketReference || null,
      affectedVs: data.affectedVs || null,
      affectedPool: data.affectedPool || null,
      resolution: data.resolution || null,
      status: data.status,
      createdBy: Number(session.user.id),
    })
    .returning();

  revalidatePath("/troubleshooting");
  revalidatePath("/dashboard");
  return row;
}

const updateSchema = troubleshootSchema.extend({ id: z.number().int() });

export async function updateTroubleshoot(input: unknown) {
  const session = await requireUser();
  const data = updateSchema.parse(input);

  const [existing] = await db
    .select()
    .from(troubleshooting)
    .where(eq(troubleshooting.id, data.id))
    .limit(1);
  if (!existing) throw new Error("Troubleshoot item not found.");

  await db
    .update(troubleshooting)
    .set({
      date: data.date,
      shift: data.shift,
      engineerId: data.engineerId ?? existing.engineerId,
      title: data.title,
      description: data.description || null,
      ticketReference: data.ticketReference || null,
      affectedVs: data.affectedVs || null,
      affectedPool: data.affectedPool || null,
      resolution: data.resolution || null,
      status: data.status,
      updatedAt: new Date(),
    })
    .where(eq(troubleshooting.id, data.id));

  if (existing.status !== data.status) {
    await db.insert(auditLog).values({
      entityType: "troubleshooting",
      entityId: data.id,
      field: "status",
      oldValue: existing.status,
      newValue: data.status,
      changedBy: Number(session.user.id),
    });
  }

  revalidatePath("/troubleshooting");
  revalidatePath("/dashboard");
}

export async function deleteTroubleshoot(id: number) {
  await requireUser();
  await db.delete(troubleshooting).where(eq(troubleshooting.id, id));
  revalidatePath("/troubleshooting");
  revalidatePath("/dashboard");
}

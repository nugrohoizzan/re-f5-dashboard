"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { handoverTasks, handoverTaskHistory } from "@/lib/db/schema";
import { titipanBatchSchema, titipanInputSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  return session;
}

export async function createTitipanBatch(input: unknown) {
  const session = await requireUser();
  const data = titipanBatchSchema.parse(input);
  const userId = Number(session.user.id);

  const rows = await db
    .insert(handoverTasks)
    .values(
      data.items.map((item) => ({
        title: item.title,
        category: item.category ?? "none",
        ticketReference: item.ticketReference || null,
        description: item.description || null,
        dueDate: item.dueDate || null,
        status: item.status,
        assignedEngineerId: item.assignedEngineerId ?? null,
        sourceDate: data.date,
        sourceShift: data.shift,
        createdBy: userId,
      }))
    )
    .returning();

  await db.insert(handoverTaskHistory).values(
    rows.map((r) => ({
      taskId: r.id,
      action: "created",
      notes: `Created during Shift ${data.shift}, ${data.date}.`,
      performedBy: userId,
    }))
  );

  revalidatePath("/titipan");
  revalidatePath("/dashboard");
  return { ok: true, count: rows.length };
}

const updateSchema = titipanInputSchema.extend({ id: z.number().int() });

export async function updateTitipan(input: unknown) {
  const session = await requireUser();
  const data = updateSchema.parse(input);
  const userId = Number(session.user.id);

  const [existing] = await db
    .select()
    .from(handoverTasks)
    .where(eq(handoverTasks.id, data.id))
    .limit(1);
  if (!existing) throw new Error("Titipan not found.");

  await db
    .update(handoverTasks)
    .set({
      title: data.title,
      category: data.category ?? "none",
      ticketReference: data.ticketReference || null,
      description: data.description || null,
      dueDate: data.dueDate || null,
      status: data.status,
      assignedEngineerId: data.assignedEngineerId ?? existing.assignedEngineerId,
      updatedAt: new Date(),
    })
    .where(eq(handoverTasks.id, data.id));

  if (existing.status !== data.status) {
    await db.insert(handoverTaskHistory).values({
      taskId: data.id,
      action: "status_changed",
      notes: `${existing.status} → ${data.status}`,
      performedBy: userId,
    });
  } else {
    await db.insert(handoverTaskHistory).values({
      taskId: data.id,
      action: "edited",
      performedBy: userId,
    });
  }

  revalidatePath("/titipan");
  revalidatePath("/dashboard");
}

export async function changeTitipanStatus(
  id: number,
  status: "pending" | "in_progress" | "completed",
  completionNotes?: string
) {
  const session = await requireUser();
  const userId = Number(session.user.id);

  const [existing] = await db
    .select()
    .from(handoverTasks)
    .where(eq(handoverTasks.id, id))
    .limit(1);
  if (!existing) throw new Error("Titipan not found.");

  await db
    .update(handoverTasks)
    .set({
      status,
      completionNotes:
        status === "completed" ? completionNotes ?? existing.completionNotes : existing.completionNotes,
      updatedAt: new Date(),
    })
    .where(eq(handoverTasks.id, id));

  await db.insert(handoverTaskHistory).values({
    taskId: id,
    action: "status_changed",
    notes: `${existing.status} → ${status}`,
    performedBy: userId,
  });

  revalidatePath("/titipan");
  revalidatePath("/dashboard");
}

export async function deleteTitipan(id: number) {
  await requireUser();
  await db.delete(handoverTasks).where(eq(handoverTasks.id, id));
  revalidatePath("/titipan");
  revalidatePath("/dashboard");
}

export async function getTitipanHistory(taskId: number) {
  await requireUser();
  return db
    .select()
    .from(handoverTaskHistory)
    .where(eq(handoverTaskHistory.taskId, taskId))
    .orderBy(handoverTaskHistory.createdAt);
}

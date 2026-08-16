"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { shiftSchedule, auditLog } from "@/lib/db/schema";
import { scheduleCellSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";

export async function setScheduleCell(input: unknown) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const data = scheduleCellSchema.parse(input);

  const [existing] = await db
    .select()
    .from(shiftSchedule)
    .where(
      and(
        eq(shiftSchedule.engineerId, data.engineerId),
        eq(shiftSchedule.date, data.date)
      )
    )
    .limit(1);

  if (existing) {
    if (existing.shiftValue !== data.shiftValue) {
      await db
        .update(shiftSchedule)
        .set({ shiftValue: data.shiftValue, updatedAt: new Date() })
        .where(eq(shiftSchedule.id, existing.id));

      await db.insert(auditLog).values({
        entityType: "schedule",
        entityId: existing.id,
        field: "shift_value",
        oldValue: existing.shiftValue,
        newValue: data.shiftValue,
        changedBy: Number(session.user.id),
      });
    }
  } else {
    await db.insert(shiftSchedule).values({
      engineerId: data.engineerId,
      date: data.date,
      shiftValue: data.shiftValue,
    });
  }

  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Removes every schedule cell for a given date (used when a date column is
// deleted from the grid). Engineers and history for other dates are untouched.
export async function clearScheduleColumn(date: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Only admins can remove a date column.");
  }

  await db.delete(shiftSchedule).where(eq(shiftSchedule.date, date));

  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

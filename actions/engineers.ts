"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { engineers } from "@/lib/db/schema";
import { engineerSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Only admins can manage engineers.");
  }
  return session;
}

export async function createEngineer(input: unknown) {
  await requireAdmin();
  const data = engineerSchema.parse(input);

  const [row] = await db
    .insert(engineers)
    .values({
      name: data.name,
      displayName: data.displayName,
      email: data.email || null,
      role: data.role || null,
      username: data.username || null,
      active: data.active,
    })
    .returning();

  revalidatePath("/engineers");
  revalidatePath("/schedule");
  return row;
}

export async function updateEngineer(id: number, input: unknown) {
  await requireAdmin();
  const data = engineerSchema.parse(input);

  const [row] = await db
    .update(engineers)
    .set({
      name: data.name,
      displayName: data.displayName,
      email: data.email || null,
      role: data.role || null,
      username: data.username || null,
      active: data.active,
      updatedAt: new Date(),
    })
    .where(eq(engineers.id, id))
    .returning();

  revalidatePath("/engineers");
  revalidatePath("/schedule");
  return row;
}

// Soft delete only — historical Activity/Troubleshoot/Titipan records keep
// their engineer_id reference, so a hard delete would corrupt that history.
export async function deactivateEngineer(id: number) {
  await requireAdmin();
  await db
    .update(engineers)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(engineers.id, id));

  revalidatePath("/engineers");
  revalidatePath("/schedule");
}

export async function reactivateEngineer(id: number) {
  await requireAdmin();
  await db
    .update(engineers)
    .set({ active: true, updatedAt: new Date() })
    .where(eq(engineers.id, id));

  revalidatePath("/engineers");
  revalidatePath("/schedule");
}

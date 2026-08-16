"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { mops, mopNotes, mopAnnotations, auditLog } from "@/lib/db/schema";
import { mopMetaSchema, mopNoteSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  return session;
}

// Only Team Leaders and Admins review/close out a MOP or remove it outright.
async function requireReviewer() {
  const session = await requireUser();
  if (session.user.role !== "admin" && session.user.role !== "team_leader") {
    throw new Error("Hanya Team Leader atau Admin yang bisa melakukan aksi ini.");
  }
  return session;
}

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "docx",
};

export async function uploadMop(formData: FormData) {
  const session = await requireUser();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("File wajib diunggah.");

  const fileType = ALLOWED_TYPES[file.type];
  if (!fileType) {
    throw new Error("Format file tidak didukung. Hanya PDF atau DOCX yang diterima.");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Ukuran file maksimal 20MB.");
  }

  const meta = mopMetaSchema.parse({
    title: formData.get("title"),
    scrCode: formData.get("scrCode") ?? "",
    requestedBy: formData.get("requestedBy") ?? "",
    description: formData.get("description") ?? "",
  });

  const blob = await put(`mop/${Date.now()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const [row] = await db
    .insert(mops)
    .values({
      title: meta.title,
      scrCode: meta.scrCode || null,
      requestedBy: meta.requestedBy || null,
      description: meta.description || null,
      fileUrl: blob.url,
      fileName: file.name,
      fileType,
      fileSize: file.size,
      status: "menunggu_review",
      uploadedBy: Number(session.user.id),
    })
    .returning();

  await db.insert(mopAnnotations).values({ mopId: row.id, data: "[]" });

  revalidatePath("/mop");
  return row;
}

const updateSchema = mopMetaSchema.extend({ id: z.number().int() });

export async function updateMop(input: unknown) {
  await requireUser();
  const data = updateSchema.parse(input);

  await db
    .update(mops)
    .set({
      title: data.title,
      scrCode: data.scrCode || null,
      requestedBy: data.requestedBy || null,
      description: data.description || null,
      updatedAt: new Date(),
    })
    .where(eq(mops.id, data.id));

  revalidatePath("/mop");
  revalidatePath(`/mop/${data.id}`);
}

export async function deleteMop(id: number) {
  await requireReviewer();

  const [existing] = await db.select().from(mops).where(eq(mops.id, id)).limit(1);
  if (!existing) throw new Error("MOP tidak ditemukan.");

  try {
    await del(existing.fileUrl);
  } catch {
    // File mungkin sudah terhapus di storage.
  }

  await db.delete(mops).where(eq(mops.id, id));

  revalidatePath("/mop");
}

export async function changeMopStatus(id: number, status: "menunggu_review" | "selesai_review") {
  const session = await requireReviewer();

  await db
    .update(mops)
    .set({
      status,
      reviewedBy: status === "selesai_review" ? Number(session.user.id) : null,
      reviewedAt: status === "selesai_review" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(mops.id, id));

  await db.insert(auditLog).values({
    entityType: "mop",
    entityId: id,
    field: "status",
    newValue: status,
    changedBy: Number(session.user.id),
  });

  revalidatePath("/mop");
  revalidatePath(`/mop/${id}`);
}

export async function addMopNote(input: unknown) {
  const session = await requireReviewer();
  const data = mopNoteSchema.parse(input);

  const [row] = await db
    .insert(mopNotes)
    .values({ mopId: data.mopId, note: data.note, createdBy: Number(session.user.id) })
    .returning();

  revalidatePath(`/mop/${data.mopId}`);
  return row;
}

export async function deleteMopNote(id: number, mopId: number) {
  await requireReviewer();
  await db.delete(mopNotes).where(eq(mopNotes.id, id));
  revalidatePath(`/mop/${mopId}`);
}

export async function saveMopAnnotation(mopId: number, data: string) {
  await requireUser();
  const session = await auth();

  const [existing] = await db
    .select()
    .from(mopAnnotations)
    .where(eq(mopAnnotations.mopId, mopId))
    .limit(1);

  if (existing) {
    await db
      .update(mopAnnotations)
      .set({ data, updatedBy: Number(session!.user.id), updatedAt: new Date() })
      .where(eq(mopAnnotations.mopId, mopId));
  } else {
    await db
      .insert(mopAnnotations)
      .values({ mopId, data, updatedBy: Number(session!.user.id) });
  }

  revalidatePath(`/mop/${mopId}`);
}

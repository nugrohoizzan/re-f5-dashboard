"use server";

import { revalidatePath } from "next/cache";
import { eq, or, ilike, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarEvents } from "@/lib/db/schema";
import { calendarEventBaseSchema, calendarEventSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  return session;
}

export async function createCalendarEvent(input: unknown) {
  const session = await requireUser();
  const data = calendarEventSchema.parse(input);

  const [row] = await db
    .insert(calendarEvents)
    .values({
      title: data.title,
      description: data.description || null,
      startAt: new Date(data.startAt),
      endType: data.endType,
      plannedEndAt: data.endType === "determined" && data.plannedEndAt ? new Date(data.plannedEndAt) : null,
      createdBy: Number(session.user.id),
    })
    .returning();

  revalidatePath("/calendar");
  return row;
}

const updateSchema = calendarEventBaseSchema.extend({ id: z.number().int() }).refine(
  (data) => data.endType !== "determined" || !!data.plannedEndAt,
  { message: "Waktu selesai wajib diisi untuk tipe 'Ada Kepastian'.", path: ["plannedEndAt"] }
);

export async function updateCalendarEvent(input: unknown) {
  await requireUser();
  const data = updateSchema.parse(input);

  const [existing] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, data.id)).limit(1);
  if (!existing) throw new Error("Event tidak ditemukan.");

  await db
    .update(calendarEvents)
    .set({
      title: data.title,
      description: data.description || null,
      startAt: new Date(data.startAt),
      endType: data.endType,
      plannedEndAt: data.endType === "determined" && data.plannedEndAt ? new Date(data.plannedEndAt) : null,
      // Kalau tipe diubah balik jadi belum-selesai, lepas kunci actualEndAt
      // lama supaya event kembali dianggap berjalan.
      actualEndAt: data.endType === "determined" ? existing.actualEndAt : null,
      updatedAt: new Date(),
    })
    .where(eq(calendarEvents.id, data.id));

  revalidatePath("/calendar");
}

// Dipakai tombol "Tandai Selesai" pada event bertipe in_progress — mengunci
// waktu selesai sebenarnya. finishedAt default sekarang, tapi boleh diisi
// manual (mis. lupa nutup kemarin).
export async function completeCalendarEvent(id: number, finishedAt?: string) {
  await requireUser();
  await db
    .update(calendarEvents)
    .set({
      actualEndAt: finishedAt ? new Date(finishedAt) : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(calendarEvents.id, id));
  revalidatePath("/calendar");
}

export async function deleteCalendarEvent(id: number) {
  await requireUser();
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  revalidatePath("/calendar");
}

// Semua event yang overlap dengan bulan tertentu (dipakai untuk kasih
// penanda titik di grid bulan). Dianggap overlap kalau mulai sebelum akhir
// bulan, DAN (belum ada titik akhir ATAU titik akhirnya setelah awal bulan).
export async function getCalendarEventsForMonth(monthStart: string, monthEnd: string) {
  await requireUser();
  const rows = await db.select().from(calendarEvents).orderBy(calendarEvents.startAt);
  return rows.filter((e) => {
    const start = e.startAt;
    const end = e.actualEndAt ?? e.plannedEndAt ?? null;
    const rangeStart = new Date(monthStart);
    const rangeEnd = new Date(monthEnd);
    if (start > rangeEnd) return false;
    if (end && end < rangeStart) return false;
    return true;
  });
}

// Event yang "aktif" di satu tanggal spesifik — dipakai untuk day view.
// Event tanpa titik akhir (masih berjalan) dianggap aktif dari startAt
// sampai HARI INI (itulah "trace" yang diminta), bukan cuma tanggal
// mulainya saja.
export async function getCalendarEventsForDay(dateISO: string) {
  await requireUser();
  const dayStart = new Date(`${dateISO}T00:00:00`);
  const dayEnd = new Date(`${dateISO}T23:59:59.999`);
  const now = new Date();

  const rows = await db.select().from(calendarEvents).orderBy(calendarEvents.startAt);
  return rows.filter((e) => {
    const effectiveEnd = e.actualEndAt ?? e.plannedEndAt ?? now;
    return e.startAt <= dayEnd && effectiveEnd >= dayStart;
  });
}

export async function searchCalendarEvents(q: string) {
  await requireUser();
  if (!q.trim()) return [];
  return db
    .select()
    .from(calendarEvents)
    .where(or(ilike(calendarEvents.title, `%${q}%`), ilike(calendarEvents.description, `%${q}%`)))
    .orderBy(desc(calendarEvents.startAt))
    .limit(20);
}

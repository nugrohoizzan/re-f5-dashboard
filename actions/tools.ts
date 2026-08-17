"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { toolNotes, cliCommands, quickLinks } from "@/lib/db/schema";
import { auth } from "@/lib/auth"; // sesuaikan path kalau beda, lihat CATATAN #2
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// -----------------------------------------------------------------------
// CATATAN #2: sesuaikan dua helper ini kalau nama field session kamu beda.
// Saat ini: semua yang login boleh LIHAT (karena middleware sudah menjaga
// semua route), tapi hanya role "admin" yang boleh tambah/edit/hapus.
// -----------------------------------------------------------------------
async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}
async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") {
    throw new Error("Hanya admin yang bisa melakukan aksi ini.");
  }
  return session;
}

export type ActionResult = { error?: string; success?: boolean };

// ============================= NOTES & ACCOUNTS =============================

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "image/png",
  "image/jpeg",
  "image/webp",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadToolNoteFile(
  formData: FormData
): Promise<{ error?: string; fileUrl?: string; fileName?: string; fileType?: string }> {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file) return { error: "Tidak ada file." };
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { error: "Format tidak didukung. Gunakan PDF, DOCX, atau gambar (PNG/JPG/WEBP)." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "Ukuran file maksimal 10MB." };
  }
  try {
    const blob = await put(`tool-notes/${Date.now()}-${file.name}`, file, { access: "public" });
    return { fileUrl: blob.url, fileName: file.name, fileType: file.type };
  } catch {
    return { error: "Gagal mengunggah file." };
  }
}

export async function createToolNote(input: {
  title: string;
  category?: string;
  content?: string;
  accountUsername?: string;
  accountPassword?: string;
  accountUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  if (!input.title.trim()) return { error: "Judul wajib diisi." };
  try {
    await db.insert(toolNotes).values({
      title: input.title.trim(),
      category: input.category || null,
      content: input.content || null,
      accountUsername: input.accountUsername || null,
      accountPasswordEncrypted: input.accountPassword ? encryptSecret(input.accountPassword) : null,
      accountUrl: input.accountUrl || null,
      fileUrl: input.fileUrl || null,
      fileName: input.fileName || null,
      fileType: input.fileType || null,
    });
  } catch {
    return { error: "Gagal menyimpan catatan." };
  }
  revalidatePath("/tools/notes-accounts");
  return { success: true };
}

export async function updateToolNote(
  id: number,
  input: {
    title: string;
    category?: string;
    content?: string;
    accountUsername?: string;
    accountPassword?: string; // kosongkan kalau tidak mau ganti password
    accountUrl?: string;
  }
): Promise<ActionResult> {
  await requireAdmin();
  if (!input.title.trim()) return { error: "Judul wajib diisi." };
  try {
    await db
      .update(toolNotes)
      .set({
        title: input.title.trim(),
        category: input.category || null,
        content: input.content || null,
        accountUsername: input.accountUsername || null,
        ...(input.accountPassword ? { accountPasswordEncrypted: encryptSecret(input.accountPassword) } : {}),
        accountUrl: input.accountUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(toolNotes.id, id));
  } catch {
    return { error: "Gagal memperbarui catatan." };
  }
  revalidatePath("/tools/notes-accounts");
  revalidatePath(`/tools/notes-accounts/${id}`);
  return { success: true };
}

export async function deleteToolNote(id: number): Promise<ActionResult> {
  await requireAdmin();
  try {
    const [existing] = await db.select().from(toolNotes).where(eq(toolNotes.id, id));
    if (existing?.fileUrl) {
      try {
        await del(existing.fileUrl);
      } catch {
        // biarkan lanjut walau gagal hapus blob lama
      }
    }
    await db.delete(toolNotes).where(eq(toolNotes.id, id));
  } catch {
    return { error: "Gagal menghapus catatan." };
  }
  revalidatePath("/tools/notes-accounts");
  return { success: true };
}

// Password TIDAK pernah ikut payload halaman awal — baru di-decrypt saat
// tombol "mata" diklik, lewat action khusus ini.
export async function revealToolNotePassword(id: number): Promise<{ password?: string; error?: string }> {
  await requireSession();
  try {
    const [row] = await db.select().from(toolNotes).where(eq(toolNotes.id, id));
    if (!row?.accountPasswordEncrypted) return { error: "Tidak ada password tersimpan." };
    return { password: decryptSecret(row.accountPasswordEncrypted) };
  } catch {
    return { error: "Gagal membuka password." };
  }
}

// ============================= CLI COMMANDS =============================

export async function createCliCommand(input: {
  command: string;
  description?: string;
  category?: string;
}): Promise<ActionResult> {
  await requireAdmin();
  if (!input.command.trim()) return { error: "Command wajib diisi." };
  try {
    await db.insert(cliCommands).values({
      command: input.command.trim(),
      description: input.description || null,
      category: input.category || null,
    });
  } catch {
    return { error: "Gagal menyimpan command." };
  }
  revalidatePath("/tools/cli-commands");
  return { success: true };
}

export async function updateCliCommand(
  id: number,
  input: { command: string; description?: string; category?: string }
): Promise<ActionResult> {
  await requireAdmin();
  if (!input.command.trim()) return { error: "Command wajib diisi." };
  try {
    await db
      .update(cliCommands)
      .set({
        command: input.command.trim(),
        description: input.description || null,
        category: input.category || null,
        updatedAt: new Date(),
      })
      .where(eq(cliCommands.id, id));
  } catch {
    return { error: "Gagal memperbarui command." };
  }
  revalidatePath("/tools/cli-commands");
  return { success: true };
}

export async function deleteCliCommand(id: number): Promise<ActionResult> {
  await requireAdmin();
  try {
    await db.delete(cliCommands).where(eq(cliCommands.id, id));
  } catch {
    return { error: "Gagal menghapus command." };
  }
  revalidatePath("/tools/cli-commands");
  return { success: true };
}

// ============================= QUICK LINKS =============================

export async function createQuickLink(input: { title: string; url: string }): Promise<ActionResult> {
  await requireAdmin();
  if (!input.title.trim()) return { error: "Judul wajib diisi." };
  if (!/^https?:\/\//i.test(input.url.trim())) return { error: "URL harus diawali http:// atau https://" };
  try {
    await db.insert(quickLinks).values({ title: input.title.trim(), url: input.url.trim() });
  } catch {
    return { error: "Gagal menyimpan link." };
  }
  revalidatePath("/tools/quick-links");
  return { success: true };
}

export async function updateQuickLink(id: number, input: { title: string; url: string }): Promise<ActionResult> {
  await requireAdmin();
  if (!input.title.trim()) return { error: "Judul wajib diisi." };
  if (!/^https?:\/\//i.test(input.url.trim())) return { error: "URL harus diawali http:// atau https://" };
  try {
    await db
      .update(quickLinks)
      .set({ title: input.title.trim(), url: input.url.trim(), updatedAt: new Date() })
      .where(eq(quickLinks.id, id));
  } catch {
    return { error: "Gagal memperbarui link." };
  }
  revalidatePath("/tools/quick-links");
  return { success: true };
}

export async function deleteQuickLink(id: number): Promise<ActionResult> {
  await requireAdmin();
  try {
    await db.delete(quickLinks).where(eq(quickLinks.id, id));
  } catch {
    return { error: "Gagal menghapus link." };
  }
  revalidatePath("/tools/quick-links");
  return { success: true };
}
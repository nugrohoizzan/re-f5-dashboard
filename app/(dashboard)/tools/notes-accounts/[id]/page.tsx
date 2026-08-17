import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { toolNotes } from "@/lib/db/schema";
import { ArrowLeft } from "lucide-react";
import { ToolNoteDetailPanel } from "@/components/tools/tool-note-detail-panel";

export default async function NoteDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const [note] = await db.select().from(toolNotes).where(eq(toolNotes.id, id));
  if (!note) notFound();

  return (
    <div className="page-enter mx-auto max-w-2xl space-y-4">
      <Link
        href="/tools/notes-accounts"
        className="focus-ring inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar
      </Link>
      <ToolNoteDetailPanel note={note} />
    </div>
  );
}
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { toolNotes } from "@/lib/db/schema";
import { ToolNotesList } from "@/components/tools/tool-notes-list";
import { ToolNoteFormDialog } from "@/components/tools/tool-note-form-dialog";

export default async function NotesAccountsPage() {
  const notes = await db.select().from(toolNotes).orderBy(desc(toolNotes.updatedAt));

  return (
    <div className="page-enter space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Notes & Accounts</h1>
          <p className="text-sm text-zinc-500">SOP, Akun sama Notes penting.</p>
        </div>
        <ToolNoteFormDialog mode="create" />
      </div>
      <ToolNotesList notes={notes} />
    </div>
  );
}
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addMopNote, deleteMopNote } from "@/actions/mop";
import type { MopNote } from "@/lib/db/schema";

type NoteWithAuthor = MopNote & { authorName?: string | null };

export function MopNotesPanel({
  mopId,
  notes,
  canWrite,
}: {
  mopId: number;
  notes: NoteWithAuthor[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleAdd() {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await addMopNote({ mopId, note: value.trim() });
      setValue("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah catatan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus catatan ini?")) return;
    try {
      await deleteMopNote(id, mopId);
      router.refresh();
    } catch {
      toast.error("Gagal menghapus catatan.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Catatan Review
      </p>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {notes.length === 0 && (
          <p className="text-sm text-zinc-400">Belum ada catatan dari Team Leader.</p>
        )}
        {notes.map((n) => (
          <div key={n.id} className="animate-in fade-in-0 rounded-md border border-zinc-200 bg-zinc-50 p-2.5 duration-200">
            <p className="whitespace-pre-wrap text-sm text-zinc-800">{n.note}</p>
            <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-400">
              <span>
                {n.authorName ?? "—"} · {new Date(n.createdAt).toLocaleString("id-ID")}
              </span>
              {canWrite && (
                <button
                  onClick={() => handleDelete(n.id)}
                  className="focus-ring rounded p-0.5 hover:text-red-600"
                  aria-label="Hapus catatan"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {canWrite && (
        <div className="mt-3 flex gap-2">
          <Textarea
            rows={2}
            placeholder="Tulis catatan untuk engineer di luar isi dokumen..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1"
          />
          <Button variant="primary" size="icon" onClick={handleAdd} disabled={saving || !value.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

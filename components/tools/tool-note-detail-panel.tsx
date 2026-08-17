"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Download, Pencil, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revealToolNotePassword, deleteToolNote } from "@/actions/tools";
import { ToolNoteFormDialog } from "./tool-note-form-dialog";

interface NoteDetail {
  id: number;
  title: string;
  category: string | null;
  content: string | null;
  accountUsername: string | null;
  accountUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
}

export function ToolNoteDetailPanel({ note }: { note: NoteDetail }) {
  const router = useRouter();
  const [password, setPassword] = React.useState<string | null>(null);
  const [revealing, setRevealing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function handleReveal() {
    if (password) {
      setPassword(null);
      return;
    }
    setRevealing(true);
    const res = await revealToolNotePassword(note.id);
    setRevealing(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setPassword(res.password ?? null);
  }

  function copyPassword() {
    if (!password) return;
    navigator.clipboard.writeText(password);
    toast.success("Password disalin.");
  }

  async function handleDelete() {
    if (!confirm("Hapus catatan ini beserta lampirannya? Tindakan ini gabisa dicancel.")) return;
    setDeleting(true);
    const res = await deleteToolNote(note.id);
    setDeleting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Catatan dihapus.");
    router.push("/tools/notes-accounts");
  }

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">{note.title}</h1>
          {note.category && (
            <span className="mt-1 inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              {note.category}
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <ToolNoteFormDialog
            mode="edit"
            note={note}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            }
          />
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="h-4 w-4" /> Hapus
          </Button>
        </div>
      </div>

      {note.content && <p className="whitespace-pre-wrap text-sm text-zinc-700">{note.content}</p>}

      {(note.accountUsername || note.accountUrl) && (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Kredensial akun</p>
          {note.accountUsername && (
            <p className="mb-1">
              <span className="text-zinc-500">Username:</span> {note.accountUsername}
            </p>
          )}
          <div className="mb-1 flex items-center gap-2">
            <span className="text-zinc-500">Password:</span>
            <span className="font-mono">{password ? password : "••••••••"}</span>
            <button onClick={handleReveal} disabled={revealing} className="text-zinc-400 hover:text-red-600">
              {password ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            {password && (
              <button onClick={copyPassword} className="text-zinc-400 hover:text-red-600">
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {note.accountUrl && (
            <p>
              <span className="text-zinc-500">URL:</span>{" "}
              <a href={note.accountUrl} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">
                {note.accountUrl}
              </a>
            </p>
          )}
        </div>
      )}

      {note.fileUrl && (
        <a
          href={note.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          <Download className="h-4 w-4" /> {note.fileName ?? "Unduh lampiran"}
        </a>
      )}
    </div>
  );
}
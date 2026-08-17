"use client";

import * as React from "react";
import Link from "next/link";
import { Search, KeyRound, FileText as FileIcon, StickyNote } from "lucide-react";
import { Input } from "@/components/ui/input";

interface NoteRow {
  id: number;
  title: string;
  category: string | null;
  content: string | null;
  accountUsername: string | null;
  fileName: string | null;
}

export function ToolNotesList({ notes }: { notes: NoteRow[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.category ?? "").toLowerCase().includes(q) ||
        (n.content ?? "").toLowerCase().includes(q)
    );
  }, [notes, query]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari judul, kategori, atau isi catatan..."
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-500">
          Tidak ada catatan yg cocok.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((n) => (
            <Link
              key={n.id}
              href={`/tools/notes-accounts/${n.id}`}
              className="group rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-2">
                {n.accountUsername ? (
                  <KeyRound className="h-4 w-4 shrink-0 text-red-600" />
                ) : n.fileName ? (
                  <FileIcon className="h-4 w-4 shrink-0 text-blue-600" />
                ) : (
                  <StickyNote className="h-4 w-4 shrink-0 text-zinc-500" />
                )}
                <h3 className="truncate text-sm font-semibold text-zinc-900 group-hover:text-red-600">
                  {n.title}
                </h3>
              </div>
              {n.category && (
                <span className="mb-1.5 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600">
                  {n.category}
                </span>
              )}
              {n.content && <p className="line-clamp-2 text-xs text-zinc-500">{n.content}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
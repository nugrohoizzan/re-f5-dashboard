"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createQuickLink, updateQuickLink, deleteQuickLink } from "@/actions/tools";

interface LinkRow {
  id: number;
  title: string;
  url: string;
}

export function QuickLinksManager({ links }: { links: LinkRow[] }) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return links;
    return links.filter((l) => l.title.toLowerCase().includes(q));
  }, [links, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari link..." className="pl-8" />
        </div>
        <QuickLinkFormDialog mode="create" />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-500">
          Tidak ada link yang cocok.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <QuickLinkCard key={l.id} link={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuickLinkCard({ link }: { link: LinkRow }) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  async function handleDelete() {
    if (!confirm("Hapus link ini?")) return;
    setDeleting(true);
    const res = await deleteQuickLink(link.id);
    setDeleting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Link dihapus.");
    router.refresh();
  }

  return (
    <div className="group relative flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <ExternalLink className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-red-600" />
        <span className="truncate text-sm font-medium text-zinc-900 group-hover:text-red-600">{link.title}</span>
      </a>
      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <QuickLinkFormDialog
          mode="edit"
          link={link}
          trigger={
            <button
              type="button"
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          }
        />
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function QuickLinkFormDialog({
  mode,
  link,
  trigger,
}: {
  mode: "create" | "edit";
  link?: LinkRow;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(link?.title ?? "");
  const [url, setUrl] = React.useState(link?.url ?? "");
  const [pending, setPending] = React.useState(false);

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Judul wajib diisi.");
      return;
    }
    setPending(true);
    const res =
      mode === "create" ? await createQuickLink({ title, url }) : await updateQuickLink(link!.id, { title, url });
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(mode === "create" ? "Link ditambahkan." : "Link diperbarui.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4" /> Tambah Link
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah Quick Link" : "Edit Quick Link"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ql-title">Judul</Label>
            <Input id="ql-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="cth. Portal Klien X" />
          </div>
          <div>
            <Label htmlFor="ql-url">URL</Label>
            <Input id="ql-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={pending}>
            {pending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
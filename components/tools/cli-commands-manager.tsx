"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2, Copy } from "lucide-react";
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
import { createCliCommand, updateCliCommand, deleteCliCommand } from "@/actions/tools";

interface CliRow {
  id: number;
  command: string;
  description: string | null;
  category: string | null;
}

export function CliCommandsManager({ commands }: { commands: CliRow[] }) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.command.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q) ||
        (c.category ?? "").toLowerCase().includes(q)
    );
  }, [commands, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari command..." className="pl-8" />
        </div>
        <CliCommandFormDialog mode="create" />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-500">
          Tidak ada command yg cocok.
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {filtered.map((c) => (
            <CliCommandRow key={c.id} cmd={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CliCommandRow({ cmd }: { cmd: CliRow }) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  function copy() {
    navigator.clipboard.writeText(cmd.command);
    toast.success("Command disalin.");
  }

  async function handleDelete() {
    if (!confirm("Hapus command ini?")) return;
    setDeleting(true);
    const res = await deleteCliCommand(cmd.id);
    setDeleting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Command dihapus.");
    router.refresh();
  }

  return (
    <div className="flex items-start justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <code className="rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-100">{cmd.command}</code>
          {cmd.category && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600">
              {cmd.category}
            </span>
          )}
        </div>
        {cmd.description && <p className="mt-1 text-xs text-zinc-500">{cmd.description}</p>}
      </div>
      <div className="flex shrink-0 gap-1">
        <button onClick={copy} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" title="Salin">
          <Copy className="h-4 w-4" />
        </button>
        <CliCommandFormDialog
          mode="edit"
          cmd={cmd}
          trigger={
            <button className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" title="Edit">
              <Pencil className="h-4 w-4" />
            </button>
          }
        />
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
          title="Hapus"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CliCommandFormDialog({
  mode,
  cmd,
  trigger,
}: {
  mode: "create" | "edit";
  cmd?: CliRow;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [command, setCommand] = React.useState(cmd?.command ?? "");
  const [description, setDescription] = React.useState(cmd?.description ?? "");
  const [category, setCategory] = React.useState(cmd?.category ?? "");
  const [pending, setPending] = React.useState(false);

  async function handleSubmit() {
    if (!command.trim()) {
      toast.error("Command wajib diisi.");
      return;
    }
    setPending(true);
    const res =
      mode === "create"
        ? await createCliCommand({ command, description, category })
        : await updateCliCommand(cmd!.id, { command, description, category });
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(mode === "create" ? "Command ditambahkan." : "Command diperbarui.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4" /> Tambah Command
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah Command" : "Edit Command"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cli-command">Command</Label>
            <Input
              id="cli-command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              className="font-mono"
              placeholder="cth. tmsh show sys version"
            />
          </div>
          <div>
            <Label htmlFor="cli-desc">Fungsi / deskripsi</Label>
            <textarea
              id="cli-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <div>
            <Label htmlFor="cli-cat">Kategori (opsional)</Label>
            <Input
              id="cli-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="cth. F5 tmsh, Linux, Git"
            />
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
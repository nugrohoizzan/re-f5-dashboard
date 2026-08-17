"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Download, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateMop, deleteMop, changeMopStatus } from "@/actions/mop";
import type { Mop } from "@/lib/db/schema";

export function MopEditDialog({ mop }: { mop: Mop }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    title: mop.title,
    scrCode: mop.scrCode ?? "",
    requestedBy: mop.requestedBy ?? "",
    description: mop.description ?? "",
  });
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Judul wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await updateMop({ id: mop.id, ...form });
      toast.success("MOP berhasil diperbarui.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal update MOP.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" /> Edit
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit MOP</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Judul</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kode SCR</Label>
              <Input value={form.scrCode} onChange={(e) => setForm((f) => ({ ...f, scrCode: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Diminta oleh</Label>
              <Input
                value={form.requestedBy}
                onChange={(e) => setForm((f) => ({ ...f, requestedBy: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MopDeleteButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function handleDelete() {
    if (!confirm("Hapus MOP ini beserta file dan coretannya? Action gabisa dibatalin.")) return;
    setBusy(true);
    try {
      await deleteMop(id);
      toast.success("MOP berhasil dihapus.");
      router.push("/mop");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus MOP.");
      setBusy(false);
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>
      <Trash2 className="h-4 w-4" /> Hapus
    </Button>
  );
}

export function MopDownloadButton({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer">
        <Download className="h-4 w-4" /> Download
      </a>
    </Button>
  );
}

export function MopStatusButton({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const next = status === "selesai_review" ? "menunggu_review" : "selesai_review";
      await changeMopStatus(id, next);
      toast.success(
        next === "selesai_review" ? "MOP ditandai selesai review internal." : "Status dikembalikan ke Menunggu Review."
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "selesai_review") {
    return (
      <Button variant="outline" size="sm" onClick={toggle} disabled={busy}>
        <RotateCcw className="h-4 w-4" /> Buka Kembali Review
      </Button>
    );
  }
  return (
    <Button variant="primary" size="sm" onClick={toggle} disabled={busy}>
      <CheckCircle2 className="h-4 w-4" /> Tandai Selesai Review Internal
    </Button>
  );
}

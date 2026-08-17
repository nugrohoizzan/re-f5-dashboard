"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createActivitiesBatch, updateActivity, deleteActivity } from "@/actions/activities";
import type { ResolvedEngineer } from "@/lib/schedule-rules";
import type { Activity } from "@/lib/db/schema";

type Row = { description: string; status: "pending" | "completed" };

export function AddActivitiesDialog({
  date,
  shift,
  engineers,
  label = "Tambah Aktivitas",
}: {
  date: string;
  shift: "1" | "2" | "3";
  engineers: ResolvedEngineer[];
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<Row[]>([{ description: "", status: "pending" }]);
  const [saving, setSaving] = React.useState(false);

  function addRow() {
    setRows((r) => [...r, { description: "", status: "pending" }]);
  }
  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }
  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  async function handleSave() {
    const items = rows.filter((r) => r.description.trim().length > 0);
    if (items.length === 0) {
      toast.error("Tambahkan minimal satu deskripsi aktivitas.");
      return;
    }
    setSaving(true);
    try {
      await createActivitiesBatch({
        date,
        shift,
        items: items.map((r) => ({ ...r, engineerId: engineers[0]?.id ?? null })),
      });
      toast.success(`${items.length} aktivitas berhasil disimpan.`);
      setRows([{ description: "", status: "pending" }]);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error("Gagal menyimpan aktivitas. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {label}
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Tambah Aktivitas — Shift {shift}, {date}</DialogTitle>
          <DialogDescription>
            {engineers.length > 0
              ? `Dicatat untuk ${engineers.map((e) => e.displayName).join(", ")}.`
              : "Gada engineer untuk tanggal/shift ini."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                placeholder="cth. Checklist Monitoring"
                value={row.description}
                onChange={(e) => updateRow(idx, { description: e.target.value })}
                className="flex-1"
              />
              <Select
                value={row.status}
                onChange={(e) => updateRow(idx, { status: e.target.value as Row["status"] })}
                className="w-36"
              >
                <option value="pending">Pending</option>
                <option value="completed">Selesai</option>
              </Select>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="focus-ring rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-600"
                  aria-label="Hapus baris"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addRow} className="w-fit">
          <Plus className="h-4 w-4" /> Tambah Aktivitas
        </Button>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Aktivitas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditActivityDialog({
  activity,
  open,
  onOpenChange,
}: {
  activity: Activity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [description, setDescription] = React.useState(activity.description);
  const [status, setStatus] = React.useState(activity.status);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setDescription(activity.description);
    setStatus(activity.status);
  }, [activity]);

  async function handleSave() {
    if (!description.trim()) {
      toast.error("Deskripsi gaboleh kosong.");
      return;
    }
    setSaving(true);
    try {
      await updateActivity({ id: activity.id, description, status });
      toast.success("Aktivitas berhasil diperbarui.");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Gagal memperbarui aktivitas.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus aktivitas ini? Action gabisa dibatalin.")) return;
    try {
      await deleteActivity(activity.id);
      toast.success("Aktivitas berhasil dihapus.");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Gagal menghapus aktivitas.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah Aktivitas</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="pending">Pending</option>
            <option value="completed">Selesai</option>
          </Select>
        </div>
        <DialogFooter className="justify-between sm:justify-between">
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Hapus
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

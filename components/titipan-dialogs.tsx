"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ArrowRightCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createTitipanBatch,
  updateTitipan,
  deleteTitipan,
  changeTitipanStatus,
  carryOverTitipan,
  getTitipanHistory,
} from "@/actions/titipan";
import type { ResolvedEngineer } from "@/lib/schedule-rules";
import type { HandoverTask, HandoverTaskHistoryEntry } from "@/lib/db/schema";
import { formatDateLong } from "@/lib/utils";


const STATUS_LABEL_ID: Record<string, string> = {
  pending: "pending",
  in_progress: "sedang diproses",
  completed: "selesai",
};

type Row = {
  title: string;
  ticketReference: string;
  description: string;
  dueDate: string;
  status: "pending" | "in_progress" | "completed";
};

const EMPTY_ROW: Row = {
  title: "",
  ticketReference: "",
  description: "",
  dueDate: "",
  status: "pending",
};

export function AddTitipanDialog({
  date,
  shift,
  engineers,
}: {
  date: string;
  shift: "1" | "2" | "3";
  engineers: ResolvedEngineer[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<Row[]>([{ ...EMPTY_ROW }]);
  const [saving, setSaving] = React.useState(false);

  function addRow() {
    setRows((r) => [...r, { ...EMPTY_ROW }]);
  }
  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }
  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  async function handleSave() {
    const items = rows.filter((r) => r.title.trim().length > 0);
    if (items.length === 0) {
      toast.error("Tambahkan minimal satu tugas.");
      return;
    }
    setSaving(true);
    try {
      await createTitipanBatch({
        date,
        shift,
        items: items.map((r) => ({ ...r, assignedEngineerId: engineers[0]?.id ?? null })),
      });
      toast.success(`${items.length} item titipan berhasil disimpan.`);
      setRows([{ ...EMPTY_ROW }]);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Gagal menyimpan titipan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Tambah Titipan
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tambah Titipan — Shift {shift}, {date}</DialogTitle>
          <DialogDescription>
            {engineers.length > 0
              ? `Dibuat oleh ${engineers.map((e) => e.displayName).join(", ")}. Tetap terlihat oleh shift berikutnya sampai selesai.`
              : "Tidak ada engineer untuk tanggal/shift ini — cek Jadwal Shift."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={idx} className="rounded-md border border-zinc-200 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Input
                  placeholder="Judul Handover Task"
                  value={row.title}
                  onChange={(e) => updateRow(idx, { title: e.target.value })}
                  className="flex-1"
                />
                <Select
                  value={row.status}
                  onChange={(e) => updateRow(idx, { status: e.target.value as Row["status"] })}
                  className="w-36"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">Sedang Diproses</option>
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
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Tiket / SCR (opsional (kalo MOP))"
                  value={row.ticketReference}
                  onChange={(e) => updateRow(idx, { ticketReference: e.target.value })}
                />
                <Input
                  type="date"
                  placeholder="Tanggal jatuh tempo (opsional)"
                  value={row.dueDate}
                  onChange={(e) => updateRow(idx, { dueDate: e.target.value })}
                />
              </div>
              <Textarea
                className="mt-2"
                placeholder="Catatan (opsional)"
                rows={2}
                value={row.description}
                onChange={(e) => updateRow(idx, { description: e.target.value })}
              />
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addRow} className="w-fit">
          <Plus className="h-4 w-4" /> Tambah Titipan
        </Button>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Titipan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TitipanDetailDialog({
  task,
  trigger,
}: {
  task: HandoverTask & { engineerName?: string | null };
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [history, setHistory] = React.useState<HandoverTaskHistoryEntry[]>([]);
  const [form, setForm] = React.useState({
    title: task.title,
    ticketReference: task.ticketReference ?? "",
    description: task.description ?? "",
    dueDate: task.dueDate ?? "",
    status: task.status,
  });
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      getTitipanHistory(task.id).then(setHistory).catch(() => {});
    }
  }, [open, task.id]);

  async function handleStatusChange(status: "pending" | "in_progress" | "completed") {
    setBusy(true);
    try {
      await changeTitipanStatus(task.id, status);
      toast.success(`Ditandai sebagai ${STATUS_LABEL_ID[status] ?? status}.`);
      router.refresh();
      setOpen(false);
    } catch {
      toast.error("Gagal memperbarui status.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCarryOver() {
    setBusy(true);
    try {
      await carryOverTitipan(task.id);
      toast.success("Berhasil dititipkan ke shift berikutnya.");
      router.refresh();
      setOpen(false);
    } catch {
      toast.error("Gagal melakukan carry over.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    setBusy(true);
    try {
      await updateTitipan({ id: task.id, ...form });
      toast.success("Titipan berhasil diperbarui.");
      router.refresh();
      setEditing(false);
      setOpen(false);
    } catch {
      toast.error("Gagal menyimpan perubahan.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus titipan ini? Tindakan ini tidak dapat dibatalkan.")) return;
    setBusy(true);
    try {
      await deleteTitipan(task.id);
      toast.success("Berhasil dihapus.");
      router.refresh();
      setOpen(false);
    } catch {
      toast.error("Gagal menghapus.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </span>
      <DialogContent className="max-w-lg">
        {editing ? (
          <>
            <DialogHeader>
              <DialogTitle>Ubah Titipan</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Judul</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tiket / SCR</Label>
                  <Input
                    value={form.ticketReference}
                    onChange={(e) => setForm((f) => ({ ...f, ticketReference: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tanggal jatuh tempo</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Catatan</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Kembali
              </Button>
              <Button variant="primary" onClick={handleSaveEdit} disabled={busy}>
                {busy ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{task.title}</DialogTitle>
                <StatusBadge status={task.status} />
              </div>
              <DialogDescription>
                {task.ticketReference && <span className="font-mono">{task.ticketReference}</span>}
                {task.ticketReference && " · "}
                Sumber: Shift {task.sourceShift}, {formatDateLong(task.sourceDate)}
              </DialogDescription>
            </DialogHeader>

            {task.description && (
              <p className="whitespace-pre-wrap text-sm text-zinc-600">{task.description}</p>
            )}

            {task.dueDate && (
              <p className="text-xs text-zinc-400">Jatuh tempo {formatDateLong(task.dueDate)}</p>
            )}

            {history.length > 0 && (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <p className="mb-1.5 text-xs font-semibold text-zinc-500">Riwayat</p>
                <ul className="space-y-1 text-xs text-zinc-500">
                  {history.map((h) => (
                    <li key={h.id}>
                      {new Date(h.createdAt).toLocaleString("id-ID")} — {h.action.replace("_", " ")}
                      {h.notes ? `: ${h.notes}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter className="flex-wrap justify-between sm:justify-between">
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>
                <Trash2 className="h-4 w-4" /> Hapus
              </Button>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={handleCarryOver} disabled={busy}>
                  <ArrowRightCircle className="h-4 w-4" /> Carry Over
                </Button>
                {task.status !== "in_progress" && (
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange("in_progress")} disabled={busy}>
                    Tandai Sedang Diproses
                  </Button>
                )}
                {task.status !== "completed" && (
                  <Button variant="primary" size="sm" onClick={() => handleStatusChange("completed")} disabled={busy}>
                    Tandai Selesai
                  </Button>
                )}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

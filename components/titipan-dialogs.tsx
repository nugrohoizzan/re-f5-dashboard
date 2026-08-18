"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
  getTitipanHistory,
} from "@/actions/titipan";
import type { ResolvedEngineer } from "@/lib/schedule-rules";
import type { HandoverTask, HandoverTaskHistoryEntry } from "@/lib/db/schema";
import { formatDateLong } from "@/lib/utils";
import { CATEGORY_LABEL, CATEGORY_OPTIONS, type TitipanCategory } from "@/lib/titipan-categories";

const STATUS_LABEL_ID: Record<string, string> = {
  pending: "pending",
  in_progress: "sedang diproses",
  completed: "selesai",
};

const SUPPORT_ACTION_OPTIONS = ["Enable/Disable", "Ubah Ratio/Traffic"];

type Row = {
  title: string;
  category: TitipanCategory;
  ticketReference: string;
  description: string;
  dueDate: string;
  status: "pending" | "in_progress" | "completed";
};

const EMPTY_ROW: Row = {
  title: "",
  category: "none",
  ticketReference: "",
  description: "",
  dueDate: "",
  status: "pending",
};

// Field tiket/aksi hanya relevan kalau kategorinya bukan "none".
function TicketField({
  category,
  value,
  onChange,
}: {
  category: TitipanCategory;
  value: string;
  onChange: (v: string) => void;
}) {
  if (category === "none") return null;
  if (category === "support") {
    return (
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Pilih aksi support...</option>
        {SUPPORT_ACTION_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    );
  }
  return (
    <Input placeholder="Tiket / SCR" value={value} onChange={(e) => onChange(e.target.value)} />
  );
}

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
                <Select
                  value={row.category}
                  onChange={(e) =>
                    updateRow(idx, { category: e.target.value as TitipanCategory, ticketReference: "" })
                  }
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </Select>
                <Input
                  type="date"
                  placeholder="Deadline (opsional)"
                  value={row.dueDate}
                  onChange={(e) => updateRow(idx, { dueDate: e.target.value })}
                />
              </div>
              {row.category !== "none" && (
                <div className="mt-2">
                  <TicketField
                    category={row.category}
                    value={row.ticketReference}
                    onChange={(v) => updateRow(idx, { ticketReference: v })}
                  />
                </div>
              )}
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
    category: (task.category ?? "none") as TitipanCategory,
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
                  <Label>Kategori</Label>
                  <Select
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        category: e.target.value as TitipanCategory,
                        ticketReference: "",
                      }))
                    }
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Deadline</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              {form.category !== "none" && (
                <div className="space-y-1.5">
                  <Label>{form.category === "support" ? "Aksi Support" : "Tiket / SCR"}</Label>
                  <TicketField
                    category={form.category}
                    value={form.ticketReference}
                    onChange={(v) => setForm((f) => ({ ...f, ticketReference: v }))}
                  />
                </div>
              )}
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
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle>{task.title}</DialogTitle>
                <StatusBadge status={task.status} />
                {task.category && task.category !== "none" && (
                  <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                    {CATEGORY_LABEL[task.category as TitipanCategory] ?? task.category}
                  </span>
                )}
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
              <p className="text-xs text-zinc-400">Deadline {formatDateLong(task.dueDate)}</p>
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
                {task.status !== "pending" && (
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange("pending")} disabled={busy}>
                    Tandai Pending
                  </Button>
                )}
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
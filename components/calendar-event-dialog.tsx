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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  completeCalendarEvent,
} from "@/actions/calendar";
import type { CalendarEvent } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";

export type EndTypeValue = "undetermined" | "in_progress" | "determined";

export const END_TYPE_LABEL: Record<EndTypeValue, string> = {
  undetermined: "Belum Bisa Ditentukan",
  in_progress: "Sedang Proses",
  determined: "Ada Kepastian",
};

const END_TYPE_OPTIONS: EndTypeValue[] = ["undetermined", "in_progress", "determined"];

function DateTimeRow({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
}: {
  dateValue: string;
  timeValue: string;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Input type="date" value={dateValue} onChange={(e) => onDateChange(e.target.value)} className="flex-[1.3]" />
      <Input type="time" value={timeValue} onChange={(e) => onTimeChange(e.target.value)} className="flex-1" />
    </div>
  );
}

function splitLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function combineLocal(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr || "00:00"}:00`);
}

function CalendarStatusBadge({ event }: { event: CalendarEvent }) {
  if (event.actualEndAt) return <Badge variant="completed">Selesai</Badge>;
  if (event.endType === "determined") return <Badge variant="pending">Terjadwal</Badge>;
  if (event.endType === "in_progress") return <Badge variant="progress">Sedang Berjalan</Badge>;
  return <Badge variant="neutral">Belum Ditentukan</Badge>;
}

type FormState = {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endType: EndTypeValue;
  endDate: string;
  endTime: string;
};

function emptyForm(defaultDate: string): FormState {
  const now = splitLocal(new Date());
  return {
    title: "",
    description: "",
    startDate: defaultDate,
    startTime: now.time,
    endType: "undetermined",
    endDate: defaultDate,
    endTime: now.time,
  };
}

export function AddCalendarEventDialog({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(() => emptyForm(defaultDate));
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Judul wajib diisi.");
      return;
    }
    if (form.endType === "determined" && (!form.endDate || !form.endTime)) {
      toast.error("Waktu selesai wajib diisi untuk tipe 'Ada Kepastian'.");
      return;
    }
    setSaving(true);
    try {
      await createCalendarEvent({
        title: form.title,
        description: form.description,
        startAt: combineLocal(form.startDate, form.startTime).toISOString(),
        endType: form.endType,
        plannedEndAt:
          form.endType === "determined" ? combineLocal(form.endDate, form.endTime).toISOString() : "",
      });
      toast.success("Activity berhasil ditambahkan.");
      setForm(emptyForm(defaultDate));
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Gagal menyimpan activity. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setForm(emptyForm(defaultDate));
      }}
    >
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Tambah Activity
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Activity</DialogTitle>
          <DialogDescription>
            SChedule diluar daily, handover & troubleshoot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Judul</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="cth. Switch Over ke DC2"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Mulai</Label>
            <DateTimeRow
              dateValue={form.startDate}
              timeValue={form.startTime}
              onDateChange={(v) => set("startDate", v)}
              onTimeChange={(v) => set("startTime", v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Waktu Selesai</Label>
            <Select value={form.endType} onChange={(e) => set("endType", e.target.value as EndTypeValue)}>
              {END_TYPE_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {END_TYPE_LABEL[v]}
                </option>
              ))}
            </Select>
          </div>

          {form.endType === "determined" ? (
            <div className="space-y-1.5">
              <Label>Selesai pada</Label>
              <DateTimeRow
                dateValue={form.endDate}
                timeValue={form.endTime}
                onDateChange={(v) => set("endDate", v)}
                onTimeChange={(v) => set("endTime", v)}
              />
            </div>
          ) : (
            <p className="text-xs text-zinc-400">
              {form.endType === "in_progress"
                ? "Activity bakalan tetep kecatet on progress sampai tandai Selesai."
                : "Activity bakalan tetep kecatet on progress sampai waktu selesainya diedit manual."}
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Deskripsi (opsional)</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
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

export function CalendarEventDetailDialog({
  event,
  trigger,
}: {
  event: CalendarEvent;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const startLocal = splitLocal(new Date(event.startAt));
  const endLocal = splitLocal(event.plannedEndAt ? new Date(event.plannedEndAt) : new Date(event.startAt));

  const [form, setForm] = React.useState<FormState>({
    title: event.title,
    description: event.description ?? "",
    startDate: startLocal.date,
    startTime: startLocal.time,
    endType: event.endType as EndTypeValue,
    endDate: endLocal.date,
    endTime: endLocal.time,
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSaveEdit() {
    if (!form.title.trim()) {
      toast.error("Judul wajib diisi.");
      return;
    }
    if (form.endType === "determined" && (!form.endDate || !form.endTime)) {
      toast.error("Waktu selesai wajib diisi untuk tipe 'Ada Kepastian'.");
      return;
    }
    setBusy(true);
    try {
      await updateCalendarEvent({
        id: event.id,
        title: form.title,
        description: form.description,
        startAt: combineLocal(form.startDate, form.startTime).toISOString(),
        endType: form.endType,
        plannedEndAt:
          form.endType === "determined" ? combineLocal(form.endDate, form.endTime).toISOString() : "",
      });
      toast.success("Activity berhasil diperbarui.");
      router.refresh();
      setEditing(false);
      setOpen(false);
    } catch {
      toast.error("Gagal menyimpan perubahan.");
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    setBusy(true);
    try {
      await completeCalendarEvent(event.id);
      toast.success("Activity ditandai selesai.");
      router.refresh();
      setOpen(false);
    } catch {
      toast.error("Gagal menandai selesai.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus activity ini? Tindakan ini tidak dapat dibatalkan.")) return;
    setBusy(true);
    try {
      await deleteCalendarEvent(event.id);
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
              <DialogTitle>Ubah Activity</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Judul</Label>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Mulai</Label>
                <DateTimeRow
                  dateValue={form.startDate}
                  timeValue={form.startTime}
                  onDateChange={(v) => set("startDate", v)}
                  onTimeChange={(v) => set("startTime", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Waktu Selesai</Label>
                <Select value={form.endType} onChange={(e) => set("endType", e.target.value as EndTypeValue)}>
                  {END_TYPE_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {END_TYPE_LABEL[v]}
                    </option>
                  ))}
                </Select>
              </div>
              {form.endType === "determined" && (
                <div className="space-y-1.5">
                  <Label>Selesai pada</Label>
                  <DateTimeRow
                    dateValue={form.endDate}
                    timeValue={form.endTime}
                    onDateChange={(v) => set("endDate", v)}
                    onTimeChange={(v) => set("endTime", v)}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Deskripsi</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
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
                <DialogTitle>{event.title}</DialogTitle>
                <CalendarStatusBadge event={event} />
              </div>
              <DialogDescription>Mulai {formatDateTime(event.startAt)}</DialogDescription>
            </DialogHeader>

            <p className="text-sm text-zinc-600">
              {event.actualEndAt
                ? `Selesai: ${formatDateTime(event.actualEndAt)}`
                : event.endType === "determined" && event.plannedEndAt
                ? `Target selesai: ${formatDateTime(event.plannedEndAt)}`
                : "Masih berjalan — belum ada waktu selesai."}
            </p>

            {event.description && (
              <p className="whitespace-pre-wrap text-sm text-zinc-600">{event.description}</p>
            )}

            <DialogFooter className="flex-wrap justify-between sm:justify-between">
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>
                <Trash2 className="h-4 w-4" /> Hapus
              </Button>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                {event.endType === "in_progress" && !event.actualEndAt && (
                  <Button variant="primary" size="sm" onClick={handleComplete} disabled={busy}>
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

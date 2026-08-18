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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createTroubleshoot, updateTroubleshoot, deleteTroubleshoot } from "@/actions/troubleshooting";
import type { ResolvedEngineer } from "@/lib/schedule-rules";
import type { Troubleshoot } from "@/lib/db/schema";

type FormState = {
  title: string;
  description: string;
  ticketReference: string;
  affectedObject: string;
  resolution: string;
  status: "pending" | "in_progress" | "completed";
};

const EMPTY: FormState = {
  title: "",
  description: "",
  ticketReference: "",
  affectedObject: "",
  resolution: "",
  status: "pending",
};

// Data lama mungkin punya affectedVs & affectedPool terpisah — gabungkan
// jadi satu string supaya tidak hilang saat item lama dibuka untuk diedit.
function combineAffected(vs?: string | null, pool?: string | null) {
  return [vs, pool].filter(Boolean).join(" / ");
}

export function TroubleshootDialog({
  date,
  shift,
  engineers,
  existing,
  label = "Tambah Troubleshoot",
}: {
  date: string;
  shift: "1" | "2" | "3";
  engineers: ResolvedEngineer[];
  existing?: Troubleshoot;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(
    existing
      ? {
          title: existing.title,
          description: existing.description ?? "",
          ticketReference: existing.ticketReference ?? "",
          affectedObject: combineAffected(existing.affectedVs, existing.affectedPool),
          resolution: existing.resolution ?? "",
          status: existing.status,
        }
      : EMPTY
  );
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Judul wajib diisi.");
      return;
    }
    setSaving(true);
    // Backend/DB masih pakai 2 kolom terpisah (affectedVs, affectedPool);
    // di form sekarang sudah digabung jadi satu, jadi semuanya dikirim
    // lewat affectedVs saja dan affectedPool dikosongkan.
    const payload = {
      title: form.title,
      description: form.description,
      ticketReference: form.ticketReference,
      affectedVs: form.affectedObject,
      affectedPool: "",
      resolution: form.resolution,
      status: form.status,
    };
    try {
      if (existing) {
        await updateTroubleshoot({
          id: existing.id,
          date: existing.date,
          shift: existing.shift,
          engineerId: existing.engineerId,
          ...payload,
        });
        toast.success("Troubleshoot berhasil diperbarui.");
      } else {
        await createTroubleshoot({
          date,
          shift,
          engineerId: engineers[0]?.id ?? null,
          ...payload,
        });
        toast.success("Troubleshoot berhasil ditambahkan.");
        setForm(EMPTY);
      }
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Gagal menyimpan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    if (!confirm("Hapus troubleshoot ini? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      await deleteTroubleshoot(existing.id);
      toast.success("Berhasil dihapus.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Gagal menghapus.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {existing ? (
        <button
          onClick={() => setOpen(true)}
          className="focus-ring text-left text-sm font-medium text-zinc-900 hover:text-red-700"
        >
          {existing.title}
        </button>
      ) : (
        <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> {label}
        </Button>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Ubah Troubleshoot" : `Tambah Troubleshoot — Shift ${shift}, ${date}`}</DialogTitle>
          {!existing && (
            <DialogDescription>
              {engineers.length > 0
                ? `Dicatat untuk ${engineers.map((e) => e.displayName).join(", ")}.`
                : "Tidak ada engineer untuk tanggal/shift ini — cek Jadwal Shift."}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Judul singkat</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="cth. Troubleshoot NDS" />
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi detail</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tiket / referensi (opsional)</Label>
              <Input value={form.ticketReference} onChange={(e) => set("ticketReference", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => set("status", e.target.value as FormState["status"])}>
                <option value="pending">Pending</option>
                <option value="in_progress">Sedang Diproses</option>
                <option value="completed">Selesai</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Objek yang terdampak (opsional)</Label>
            <Input
              value={form.affectedObject}
              onChange={(e) => set("affectedObject", e.target.value)}
              placeholder="cth. VS_APP01, Pool_Member_10.1.1.5"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Resolusi / RCA (opsional)</Label>
            <Textarea value={form.resolution} onChange={(e) => set("resolution", e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter className={existing ? "justify-between sm:justify-between" : undefined}>
          {existing && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> Hapus
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
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

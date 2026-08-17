"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createEngineer, updateEngineer, deactivateEngineer, reactivateEngineer } from "@/actions/engineers";
import type { Engineer } from "@/lib/db/schema";

type FormState = {
  name: string;
  displayName: string;
  email: string;
  role: string;
  username: string;
  active: boolean;
};

const EMPTY: FormState = { name: "", displayName: "", email: "", role: "", username: "", active: true };

export function EngineerDialog({ existing }: { existing?: Engineer }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(
    existing
      ? {
          name: existing.name,
          displayName: existing.displayName,
          email: existing.email ?? "",
          role: existing.role ?? "",
          username: existing.username ?? "",
          active: existing.active,
        }
      : EMPTY
  );
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.displayName.trim()) {
      toast.error("Nama lengkap dan nama tampilan wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await updateEngineer(existing.id, form);
        toast.success("Engineer berhasil diperbarui.");
      } else {
        await createEngineer(form);
        toast.success("Engineer berhasil ditambahkan.");
        setForm(EMPTY);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan engineer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {existing ? (
        <button
          onClick={() => setOpen(true)}
          className="focus-ring text-sm font-medium text-zinc-900 hover:text-red-700"
        >
          {existing.displayName}
        </button>
      ) : (
        <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Tambah Engineer
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Ubah Engineer" : "Tambah Engineer"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nama lengkap</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nama tampilan</Label>
              <Input value={form.displayName} onChange={(e) => set("displayName", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email (opsional)</Label>
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Peran (opsional)</Label>
              <Input value={form.role} onChange={(e) => set("role", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Username (opsional)</Label>
            <Input value={form.username} onChange={(e) => set("username", e.target.value)} />
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

export function ToggleActiveButton({ engineer }: { engineer: Engineer }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      if (engineer.active) {
        await deactivateEngineer(engineer.id);
        toast.success(`${engineer.displayName} berhasil dinonaktifkan.`);
      } else {
        await reactivateEngineer(engineer.id);
        toast.success(`${engineer.displayName} berhasil diaktifkan lagi.`);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal update engineer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={busy}>
      {engineer.active ? "Nonaktifkan" : "Aktifkan"}
    </Button>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { upsertShiftValueRule, deleteShiftValueRule } from "@/actions/settings";
import type { ShiftValueRule } from "@/lib/db/schema";

const COLOR_OPTIONS = ["neutral", "off", "oh", "ct", "shift1", "shift2", "shift3"];

export function ShiftValueRulesEditor({ rules }: { rules: ShiftValueRule[] }) {
  const router = useRouter();
  const [newRow, setNewRow] = React.useState({
    rawValue: "",
    mapsToShift: "" as "" | "1" | "2" | "3",
    label: "",
    colorToken: "neutral",
    startTime: "",
    endTime: "",
  });
  const [saving, setSaving] = React.useState(false);

  async function handleAdd() {
    if (!newRow.rawValue.trim() || !newRow.label.trim()) {
      toast.error("Nilai dan label wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await upsertShiftValueRule({
        rawValue: newRow.rawValue.trim(),
        mapsToShift: newRow.mapsToShift || null,
        label: newRow.label.trim(),
        colorToken: newRow.colorToken,
        startTime: newRow.startTime,
        endTime: newRow.endTime,
      });
      toast.success("Aturan tersimpan.");
      setNewRow({ rawValue: "", mapsToShift: "", label: "", colorToken: "neutral", startTime: "", endTime: "" });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan aturan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus aturan ini? Sel jadwal yg pake nilai ini bakal tetep nampilin teksnya, tapi warna dan pemetaan shift hilang.")) return;
    try {
      await deleteShiftValueRule(id);
      toast.success("Aturan dihapus.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus aturan.");
    }
  }

  function startEditRow(r: ShiftValueRule) {
    setNewRow({
      rawValue: r.rawValue,
      mapsToShift: (r.mapsToShift as "1" | "2" | "3" | null) ?? "",
      label: r.label,
      colorToken: r.colorToken,
      startTime: r.startTime ?? "",
      endTime: r.endTime ?? "",
    });
  }

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="py-2">Nilai</th>
            <th className="py-2">Shift</th>
            <th className="py-2">Label</th>
            <th className="py-2">Jam</th>
            <th className="py-2">Warna</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rules.map((r) => (
            <tr key={r.id}>
              <td className="py-2 font-mono">{r.rawValue}</td>
              <td className="py-2">{r.mapsToShift ? `Shift ${r.mapsToShift}` : "—"}</td>
              <td className="py-2">{r.label}</td>
              <td className="py-2 text-zinc-500">
                {r.startTime && r.endTime ? `${r.startTime}\u2013${r.endTime}` : "—"}
              </td>
              <td className="py-2">{r.colorToken}</td>
              <td className="py-2 text-right">
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => startEditRow(r)}
                    className="focus-ring rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="focus-ring rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                    aria-label="Hapus aturan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-zinc-200 p-3">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Nilai</label>
          <Input
            value={newRow.rawValue}
            onChange={(e) => setNewRow((r) => ({ ...r, rawValue: e.target.value }))}
            placeholder="cth. 23"
            className="w-20"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Termasuk shift</label>
          <Select
            value={newRow.mapsToShift}
            onChange={(e) => setNewRow((r) => ({ ...r, mapsToShift: e.target.value as any }))}
            className="w-28"
          >
            <option value="">Tidak ada</option>
            <option value="1">Shift 1</option>
            <option value="2">Shift 2</option>
            <option value="3">Shift 3</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Label</label>
          <Input
            value={newRow.label}
            onChange={(e) => setNewRow((r) => ({ ...r, label: e.target.value }))}
            placeholder="cth. Shift 2 & 3"
            className="w-36"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Jam mulai</label>
          <Input
            type="time"
            value={newRow.startTime}
            onChange={(e) => setNewRow((r) => ({ ...r, startTime: e.target.value }))}
            className="w-28"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Jam selesai</label>
          <Input
            type="time"
            value={newRow.endTime}
            onChange={(e) => setNewRow((r) => ({ ...r, endTime: e.target.value }))}
            className="w-28"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Warna</label>
          <Select
            value={newRow.colorToken}
            onChange={(e) => setNewRow((r) => ({ ...r, colorToken: e.target.value }))}
            className="w-28"
          >
            {COLOR_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="primary" size="sm" onClick={handleAdd} disabled={saving}>
          <Plus className="h-4 w-4" /> Simpan
        </Button>
      </div>
      <p className="text-xs text-zinc-400">
        Klik &ldquo;Edit&rdquo; pada baris buat memuat nilainya ke form di bawah dansave buat update.
      </p>
    </div>
  );
}

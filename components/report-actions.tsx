"use client";

import { toast } from "sonner";
import { Copy, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportActions({ text }: { text: string }) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Laporan berhasil disalin ke clipboard.");
    } catch {
      toast.error("Gagal menyalin otomatis — silakan pilih dan salin manual.");
    }
  }

  return (
    <div className="flex gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={handleCopy}>
        <Copy className="h-4 w-4" /> Salin
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Cetak
      </Button>
    </div>
  );
}

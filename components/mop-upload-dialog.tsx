"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { uploadMop } from "@/actions/mop";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

export function MopUploadDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", scrCode: "", requestedBy: "", description: "" });
  const inputRef = React.useRef<HTMLInputElement>(null);

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error("Format file tidak didukung. Hanya PDF atau DOCX.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 20MB.");
      return;
    }
    setFile(f);
    if (!form.title) {
      setForm((s) => ({ ...s, title: f.name.replace(/\.(pdf|docx?|)$/i, "") }));
    }
  }

  async function handleUpload() {
    if (!file) {
      toast.error("Pilih atau seret file MOP terlebih dahulu.");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Judul MOP wajib diisi.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("title", form.title);
      fd.set("scrCode", form.scrCode);
      fd.set("requestedBy", form.requestedBy);
      fd.set("description", form.description);
      const row = await uploadMop(fd);
      toast.success("MOP berhasil diunggah dan Menunggu Review.");
      setOpen(false);
      setFile(null);
      setForm({ title: "", scrCode: "", requestedBy: "", description: "" });
      router.push(`/mop/${row.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah MOP.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <UploadCloud className="h-4 w-4" /> Upload MOP
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload MOP</DialogTitle>
          <DialogDescription>
            Seret file ke area di bawah, atau klik untuk memilih.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-150",
            dragging ? "border-red-400 bg-red-50" : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          {file ? (
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <FileText className="h-5 w-5 text-red-600" />
              <span className="max-w-[280px] truncate font-medium">{file.name}</span>
              <span className="text-xs text-zinc-400">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="focus-ring rounded-full p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-red-600"
                aria-label="Hapus file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-zinc-400" />
              <p className="text-sm font-medium text-zinc-600">Seret & lepas file MOP di sini</p>
              <p className="text-xs text-zinc-400">PDF atau DOCX, maksimal 20MB</p>
            </>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Judul MOP</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              placeholder="cth. MOP Perubahan SSL Profile Conjur"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kode SCR (opsional)</Label>
              <Input
                value={form.scrCode}
                onChange={(e) => setForm((s) => ({ ...s, scrCode: e.target.value }))}
                placeholder="cth. SCR26073173374"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Diminta oleh (opsional)</Label>
              <Input
                value={form.requestedBy}
                onChange={(e) => setForm((s) => ({ ...s, requestedBy: e.target.value }))}
                placeholder="Nama user/requestor"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi (opsional)</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Mengunggah..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

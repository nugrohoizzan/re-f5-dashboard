"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, UploadCloud, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createToolNote, updateToolNote, uploadToolNoteFile } from "@/actions/tools";

interface ExistingNote {
  id: number;
  title: string;
  category: string | null;
  content: string | null;
  accountUsername: string | null;
  accountUrl: string | null;
}

export function ToolNoteFormDialog({
  mode,
  note,
  trigger,
}: {
  mode: "create" | "edit";
  note?: ExistingNote;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(note?.title ?? "");
  const [category, setCategory] = React.useState(note?.category ?? "");
  const [content, setContent] = React.useState(note?.content ?? "");
  const [accountUsername, setAccountUsername] = React.useState(note?.accountUsername ?? "");
  const [accountPassword, setAccountPassword] = React.useState("");
  const [accountUrl, setAccountUrl] = React.useState(note?.accountUrl ?? "");
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  function handleFileSelect(f: File | null) {
    if (!f) return;
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
      "image/webp",
    ];
    if (!allowed.includes(f.type)) {
      toast.error("Format tidak didukung. Gunakan PDF, DOCX, atau gambar.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10MB.");
      return;
    }
    setFile(f);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Judul wajib diisi.");
      return;
    }
    setPending(true);
    try {
      let uploaded: { fileUrl?: string; fileName?: string; fileType?: string } = {};
      if (file) {
        const fd = new FormData();
        fd.set("file", file);
        const res = await uploadToolNoteFile(fd);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        uploaded = res;
      }

      if (mode === "create") {
        const res = await createToolNote({
          title,
          category,
          content,
          accountUsername,
          accountPassword,
          accountUrl,
          ...uploaded,
        });
        if (res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Catatan ditambahkan.");
      } else if (note) {
        const res = await updateToolNote(note.id, {
          title,
          category,
          content,
          accountUsername,
          accountPassword,
          accountUrl,
        });
        if (res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Catatan diperbarui.");
      }
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4" /> Tambah Catatan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah Catatan / Akun" : "Edit Catatan"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="tn-title">Judul</Label>
            <Input
              id="tn-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="cth. Akun Portal / SOP"
            />
          </div>
          <div>
            <Label htmlFor="tn-category">Kategori (opsional)</Label>
            <Input
              id="tn-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="cth. SOP, Akun, Catatan"
            />
          </div>
          <div>
            <Label htmlFor="tn-content">Isi / deskripsi</Label>
            <textarea
              id="tn-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="rounded-md border border-dashed border-zinc-300 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Kredensial akun (opsional)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="tn-user">Username</Label>
                <Input id="tn-user" value={accountUsername} onChange={(e) => setAccountUsername(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tn-pass">
                  Password {mode === "edit" && <span className="text-zinc-400">(kosongkan jika tidak diubah)</span>}
                </Label>
                <Input
                  id="tn-pass"
                  type="password"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-2">
              <Label htmlFor="tn-url">URL login (opsional)</Label>
              <Input
                id="tn-url"
                value={accountUrl}
                onChange={(e) => setAccountUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {mode === "create" && (
            <div>
              <Label>Lampiran file (opsional)</Label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFileSelect(e.dataTransfer.files?.[0] ?? null);
                }}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed p-4 text-center transition-colors ${
                  dragOver ? "border-red-500 bg-red-50" : "border-zinc-300"
                }`}
              >
                {file ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-700">
                    <span className="max-w-[220px] truncate">{file.name}</span>
                    <button onClick={() => setFile(null)} className="text-zinc-400 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-6 w-6 text-zinc-400" />
                    <p className="text-xs text-zinc-500">Tarik file ke sini, atau</p>
                    <label className="cursor-pointer text-xs font-medium text-red-600 hover:underline">
                      pilih file
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={pending}>
            {pending ? "Menyimpan..." : mode === "create" ? "Simpan" : "Simpan perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
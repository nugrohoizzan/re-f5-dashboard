import Link from "next/link";
import { or, ilike, eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { mops, users } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { SearchBox } from "@/components/search-box";
import { MopUploadDialog } from "@/components/mop-upload-dialog";
import { FileText } from "lucide-react";
import { cn, formatTimestamp } from "@/lib/utils";

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "menunggu_review", label: "Menunggu Review" },
  { key: "selesai_review", label: "Selesai Review" },
] as const;

export default async function MopPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const status = searchParams.status ?? "all";
  const q = searchParams.q?.trim();

  const statusFilter = status === "all" ? undefined : eq(mops.status, status as "menunggu_review" | "selesai_review");
  // Pencarian berdasarkan judul ATAU kode SCR, sesuai permintaan.
  const searchFilter = q ? or(ilike(mops.title, `%${q}%`), ilike(mops.scrCode, `%${q}%`)) : undefined;
  const filter = statusFilter && searchFilter ? and(statusFilter, searchFilter) : statusFilter ?? searchFilter;

  const rows = await db
    .select({
      id: mops.id,
      title: mops.title,
      scrCode: mops.scrCode,
      requestedBy: mops.requestedBy,
      fileType: mops.fileType,
      status: mops.status,
      createdAt: mops.createdAt,
      uploaderName: users.name,
    })
    .from(mops)
    .leftJoin(users, eq(mops.uploadedBy, users.id))
    .where(filter)
    .orderBy(desc(mops.createdAt));

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">MOP</h1>
          <p className="text-sm text-zinc-400">
            Method Of Procedure.
          </p>
        </div>
        <MopUploadDialog />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-md bg-zinc-100 p-1">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/mop?status=${f.key}${q ? `&q=${q}` : ""}`}
              className={cn(
                "focus-ring rounded-[6px] px-4 py-1.5 text-sm font-medium transition-all duration-150",
                status === f.key ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <SearchBox placeholder="Cari judul atau kode SCR..." />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-12 text-center text-sm text-zinc-400">
            Belum ada MOP. Klik &ldquo;Upload MOP&rdquo; buat nambahin MOP.
          </div>
        )}
        {rows.map((m) => (
          <Link key={m.id} href={`/mop/${m.id}`}>
            <Card className="h-full cursor-pointer p-4 hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-2 flex items-start justify-between gap-2">
                <FileText className="h-5 w-5 shrink-0 text-red-600" />
                <StatusBadge status={m.status} />
              </div>
              <p className="line-clamp-2 text-sm font-medium text-zinc-900">{m.title}</p>
              {m.scrCode && <p className="mt-1 font-mono text-xs text-zinc-400">{m.scrCode}</p>}
              <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                <span>{m.uploaderName ?? "—"}</span>
                <span>{formatTimestamp(m.createdAt)}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

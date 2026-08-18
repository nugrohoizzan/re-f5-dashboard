import Link from "next/link";
import { and, eq, or, ilike, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { handoverTasks, engineers } from "@/lib/db/schema";
import { getEngineersForShift } from "@/lib/schedule-rules";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { AddTitipanDialog, TitipanDetailDialog } from "@/components/titipan-dialogs";
import { CATEGORY_LABEL, type TitipanCategory } from "@/lib/titipan-categories";
import { SearchBox } from "@/components/search-box";
import { formatDateLong, todayISO, cn } from "@/lib/utils";

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "Sedang Diproses" },
  { key: "completed", label: "Selesai" },
] as const;

export default async function TitipanPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const status = searchParams.status ?? "pending";
  const q = searchParams.q?.trim();
  const today = todayISO();

  const statusFilter = status === "all" ? undefined : eq(handoverTasks.status, status as any);
  const searchFilter = q
    ? or(ilike(handoverTasks.title, `%${q}%`), ilike(handoverTasks.ticketReference, `%${q}%`))
    : undefined;

  const filter =
    statusFilter && searchFilter
      ? and(statusFilter, searchFilter)
      : statusFilter ?? searchFilter ?? undefined;

  const [rows, todayEngineers] = await Promise.all([
    db
      .select({
        id: handoverTasks.id,
        title: handoverTasks.title,
        category: handoverTasks.category,
        description: handoverTasks.description,
        ticketReference: handoverTasks.ticketReference,
        sourceDate: handoverTasks.sourceDate,
        sourceShift: handoverTasks.sourceShift,
        status: handoverTasks.status,
        dueDate: handoverTasks.dueDate,
        assignedEngineerId: handoverTasks.assignedEngineerId,
        createdBy: handoverTasks.createdBy,
        createdAt: handoverTasks.createdAt,
        updatedAt: handoverTasks.updatedAt,
        completionNotes: handoverTasks.completionNotes,
        notes: handoverTasks.notes,
        engineerName: engineers.displayName,
      })
      .from(handoverTasks)
      .leftJoin(engineers, eq(handoverTasks.assignedEngineerId, engineers.id))
      .where(filter)
      .orderBy(desc(handoverTasks.updatedAt)),
    getEngineersForShift(today, "1"),
  ]);

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-zinc-900">Titipan & Pending Action</h1>
        <AddTitipanDialog date={today} shift="1" engineers={todayEngineers} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-md bg-zinc-100 p-1">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/titipan?status=${f.key}${q ? `&q=${q}` : ""}`}
              className={cn(
                "focus-ring rounded-[6px] px-4 py-1.5 text-sm font-medium transition-all duration-150",
                status === f.key
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <SearchBox placeholder="Cari tugas atau tiket..." />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2.5">Tugas</th>
                <th className="px-4 py-2.5">Tiket</th>
                <th className="px-4 py-2.5">Sumber</th>
                <th className="px-4 py-2.5">Engineer</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Update Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                    Gada data saat ini.
                  </td>
                </tr>
              )}
              {rows.map((t) => (
                <tr key={t.id} className="transition-colors duration-150 hover:bg-zinc-50">
                  <td className="px-4 py-2.5">
                    <TitipanDetailDialog
                      task={t}
                      trigger={
                        <span className="font-medium text-zinc-900 hover:text-red-700">{t.title}</span>
                      }
                    />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                    {t.ticketReference ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500">
                    Shift {t.sourceShift}, {formatDateLong(t.sourceDate)}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500">{t.engineerName ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">
                    {new Date(t.updatedAt).toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

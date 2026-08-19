import Link from "next/link";
import { and, eq, or, ilike, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { handoverTasks, engineers } from "@/lib/db/schema";
import { getEngineersForShift } from "@/lib/schedule-rules";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { AddTitipanDialog, TitipanDetailDialog } from "@/components/titipan-dialogs";
import { CATEGORY_LABEL, type TitipanCategory } from "@/lib/titipan-categories";
import { SearchBox } from "@/components/search-box";
import { formatDateLong, todayISO, cn } from "@/lib/utils";
import { Ticket, Tag, CalendarClock, User } from "lucide-react";

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

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-400">
            Gada data saat ini.
          </div>
        )}
        {rows.map((t) => (
          <Card key={t.id} className="hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-start justify-between gap-3">
                <TitipanDetailDialog
                  task={t}
                  trigger={
                    <span className="text-left text-sm font-medium text-zinc-900 hover:text-red-700">
                      {t.title}
                    </span>
                  }
                />
                <StatusBadge status={t.status} />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                {t.category && t.category !== "none" && (
                  <span className="inline-flex items-center gap-1">
                    <Tag className="h-3 w-3 shrink-0" />
                    {CATEGORY_LABEL[t.category as TitipanCategory] ?? t.category}
                  </span>
                )}
                {t.ticketReference && (
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Ticket className="h-3 w-3 shrink-0" /> {t.ticketReference}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3 shrink-0" />
                  Shift {t.sourceShift}, {formatDateLong(t.sourceDate)}
                </span>
                {t.engineerName && (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3 shrink-0" /> {t.engineerName}
                  </span>
                )}
              </div>

              {t.description && (
                <p className="line-clamp-2 text-sm text-zinc-500">{t.description}</p>
              )}

              <p className="text-xs text-zinc-400">
                Update terakhir: {new Date(t.updatedAt).toLocaleDateString("id-ID")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
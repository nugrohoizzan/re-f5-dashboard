import { and, eq, or, ilike, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { troubleshooting } from "@/lib/db/schema";
import { getEngineersForShift, getShiftTimeMap } from "@/lib/schedule-rules";
import { DateShiftPicker } from "@/components/date-shift-picker";
import { EngineerBadges } from "@/components/engineer-badges";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { TroubleshootDialog } from "@/components/troubleshoot-dialog";
import { SearchBox } from "@/components/search-box";
import { todayISO } from "@/lib/utils";
import { Ticket, Boxes, CheckCircle2 } from "lucide-react";

export default async function TroubleshootingPage({
  searchParams,
}: {
  searchParams: { date?: string; shift?: string; q?: string };
}) {
  const date = searchParams.date || todayISO();
  const shift = (searchParams.shift as "1" | "2" | "3") || "1";
  const q = searchParams.q?.trim();

  const baseFilter = and(eq(troubleshooting.date, date), eq(troubleshooting.shift, shift));
  const filter = q
    ? and(
        baseFilter,
        or(
          ilike(troubleshooting.title, `%${q}%`),
          ilike(troubleshooting.ticketReference, `%${q}%`),
          ilike(troubleshooting.affectedVs, `%${q}%`),
          ilike(troubleshooting.affectedPool, `%${q}%`)
        )
      )
    : baseFilter;

  const [shiftEngineers, rows, shiftTimes] = await Promise.all([
    getEngineersForShift(date, shift),
    db.select().from(troubleshooting).where(filter).orderBy(desc(troubleshooting.createdAt)),
    getShiftTimeMap(),
  ]);

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-zinc-900">Troubleshooting</h1>
        <TroubleshootDialog date={date} shift={shift} engineers={shiftEngineers} />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <DateShiftPicker date={date} shift={shift} shiftTimes={shiftTimes} />
            <SearchBox placeholder="Cari judul, tiket, atau objek terdampak..." />
          </div>
          <EngineerBadges engineers={shiftEngineers} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-400">
            Blom ada troubleshoot.
          </div>
        )}
        {rows.map((t) => {
          const affected = [t.affectedVs, t.affectedPool].filter(Boolean).join(" / ");
          return (
            <Card key={t.id} className="hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <TroubleshootDialog date={date} shift={shift} engineers={shiftEngineers} existing={t} />
                  <StatusBadge status={t.status} />
                </div>

                {(t.ticketReference || affected) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                    {t.ticketReference && (
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Ticket className="h-3 w-3 shrink-0" /> {t.ticketReference}
                      </span>
                    )}
                    {affected && (
                      <span className="inline-flex items-center gap-1">
                        <Boxes className="h-3 w-3 shrink-0" /> {affected}
                      </span>
                    )}
                  </div>
                )}

                {t.description && (
                  <p className="line-clamp-2 text-sm text-zinc-500">{t.description}</p>
                )}

                {t.resolution && (
                  <div className="flex items-start gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <p className="line-clamp-2">{t.resolution}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

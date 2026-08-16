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
          ilike(troubleshooting.affectedVs, `%${q}%`)
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
            <SearchBox placeholder="Cari judul, tiket, atau VS..." />
          </div>
          <EngineerBadges engineers={shiftEngineers} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-400">
            Belum ada troubleshoot untuk tanggal dan shift ini.
          </div>
        )}
        {rows.map((t) => (
          <Card key={t.id} className="hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-start justify-between gap-3 pt-4">
              <div className="min-w-0">
                <TroubleshootDialog date={date} shift={shift} engineers={shiftEngineers} existing={t} />
                {t.ticketReference && (
                  <p className="mt-0.5 font-mono text-xs text-zinc-400">{t.ticketReference}</p>
                )}
                {t.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{t.description}</p>
                )}
              </div>
              <StatusBadge status={t.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

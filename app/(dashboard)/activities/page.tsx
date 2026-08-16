import { and, eq, ilike, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { getEngineersForShift, getShiftTimeMap } from "@/lib/schedule-rules";
import { DateShiftPicker } from "@/components/date-shift-picker";
import { EngineerBadges } from "@/components/engineer-badges";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { AddActivitiesDialog } from "@/components/activity-dialogs";
import { ActivityRow } from "@/components/activity-row";
import { SearchBox } from "@/components/search-box";
import { todayISO } from "@/lib/utils";

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: { date?: string; shift?: string; q?: string };
}) {
  const date = searchParams.date || todayISO();
  const shift = (searchParams.shift as "1" | "2" | "3") || "1";
  const q = searchParams.q?.trim();

  const [shiftEngineers, rows, shiftTimes] = await Promise.all([
    getEngineersForShift(date, shift),
    db
      .select()
      .from(activities)
      .where(
        q
          ? and(eq(activities.date, date), eq(activities.shift, shift), ilike(activities.description, `%${q}%`))
          : and(eq(activities.date, date), eq(activities.shift, shift))
      )
      .orderBy(desc(activities.createdAt)),
    getShiftTimeMap(),
  ]);

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-zinc-900">Aktivitas</h1>
        <AddActivitiesDialog date={date} shift={shift} engineers={shiftEngineers} />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <DateShiftPicker date={date} shift={shift} shiftTimes={shiftTimes} />
            <SearchBox placeholder="Cari deskripsi aktivitas..." />
          </div>
          <EngineerBadges engineers={shiftEngineers} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-400">
            Belum ada aktivitas untuk tanggal dan shift ini.
          </div>
        )}
        {rows.map((a) => (
          <ActivityRow key={a.id} activity={a} />
        ))}
      </div>
    </div>
  );
}

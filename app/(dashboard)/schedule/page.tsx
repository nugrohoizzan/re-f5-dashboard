import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { engineers, shiftSchedule, shiftValueRules } from "@/lib/db/schema";
import { ScheduleGrid } from "@/components/schedule-grid";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const monthParam = searchParams.month; // "YYYY-MM"
  const anchor = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  const rangeStart = startOfMonth(anchor);
  const rangeEnd = endOfMonth(anchor);
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map((d) =>
    format(d, "yyyy-MM-dd")
  );

  const [activeEngineers, scheduleRows, rules] = await Promise.all([
    db
      .select()
      .from(engineers)
      .where(eq(engineers.active, true))
      .orderBy(engineers.sortOrder),
    db
      .select()
      .from(shiftSchedule)
      .where(and(gte(shiftSchedule.date, days[0]), lte(shiftSchedule.date, days[days.length - 1]))),
    db.select().from(shiftValueRules),
  ]);

  const scheduleMap: Record<string, Record<string, string>> = {};
  for (const row of scheduleRows) {
    scheduleMap[row.engineerId] ??= {};
    scheduleMap[row.engineerId][row.date] = row.shiftValue;
  }

  const prevMonth = format(new Date(rangeStart.getFullYear(), rangeStart.getMonth() - 1, 1), "yyyy-MM");
  const nextMonth = format(new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 1), "yyyy-MM");
  const thisMonth = format(new Date(), "yyyy-MM");

  return (
    <div className="page-enter space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Jadwal Shift</h1>
          <p className="text-sm text-zinc-400">
            Klik sel mana aja buat edit.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/schedule?month=${prevMonth}`}
            className="focus-ring rounded-md border border-zinc-200 bg-white p-2 text-zinc-500 transition-all duration-150 hover:-translate-x-0.5 hover:bg-zinc-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[9rem] text-center text-sm font-medium text-zinc-900">
            {format(rangeStart, "MMMM yyyy", { locale: localeId })}
          </span>
          <Link
            href={`/schedule?month=${nextMonth}`}
            className="focus-ring rounded-md border border-zinc-200 bg-white p-2 text-zinc-500 transition-all duration-150 hover:translate-x-0.5 hover:bg-zinc-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/schedule?month=${thisMonth}`}
            className="focus-ring ml-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Hari Ini
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden">
        <ScheduleGrid
          engineers={activeEngineers}
          days={days}
          scheduleMap={scheduleMap}
          rules={rules}
        />
      </Card>
    </div>
  );
}

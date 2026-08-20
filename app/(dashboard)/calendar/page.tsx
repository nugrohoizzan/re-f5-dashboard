import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameMonth,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCalendarEventsForMonth, searchCalendarEvents } from "@/actions/calendar";
import { AddCalendarEventDialog, CalendarEventDetailDialog } from "@/components/calendar-event-dialog";
import { CalendarMonthPicker } from "@/components/calendar-month-picker";
import { SearchBox } from "@/components/search-box";
import { formatDateTime, todayISO, cn } from "@/lib/utils";

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Warna titik penanda per-urutan (bukan per-kategori) — cukup untuk kasih
// sinyal visual "ada beberapa activity" tanpa perlu legenda warna.
const DOT_COLORS = ["bg-red-500", "bg-sky-500", "bg-amber-500", "bg-emerald-500"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string; q?: string };
}) {
  const q = searchParams.q?.trim();
  const todayStr = todayISO();

  if (q) {
    const results = await searchCalendarEvents(q);
    return (
      <div className="page-enter space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-zinc-900">Calendar</h1>
          <AddCalendarEventDialog defaultDate={todayStr} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/calendar" className="text-sm font-medium text-red-600 hover:underline">
            ← Kembali ke kalender
          </Link>
          <SearchBox placeholder="Cari activity..." />
        </div>

        <div className="space-y-2">
          {results.length === 0 && (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-400">
              Gak ada activity yang cocok.
            </div>
          )}
          {results.map((e) => (
            <CalendarEventDetailDialog
              key={e.id}
              event={e}
              trigger={
                <div className="cursor-pointer rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                  <p className="text-sm font-medium text-zinc-900">{e.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{formatDateTime(e.startAt)}</p>
                </div>
              }
            />
          ))}
        </div>
      </div>
    );
  }

  const anchor = searchParams.month ? new Date(`${searchParams.month}-01T00:00:00`) : new Date(`${todayStr}T00:00:00`);
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const events = await getCalendarEventsForMonth(gridStart.toISOString(), gridEnd.toISOString());

  function countEvents(day: Date) {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    return events.filter((e) => {
      const start = new Date(e.startAt);
      const end = e.actualEndAt ? new Date(e.actualEndAt) : e.plannedEndAt ? new Date(e.plannedEndAt) : new Date();
      return start <= dayEnd && end >= dayStart;
    }).length;
  }

  const prevMonth = format(subMonths(anchor, 1), "yyyy-MM");
  const nextMonth = format(addMonths(anchor, 1), "yyyy-MM");

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-zinc-900">Calendar</h1>
        <AddCalendarEventDialog defaultDate={todayStr} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?month=${prevMonth}`}
            className="focus-ring rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <CalendarMonthPicker
            year={anchor.getFullYear()}
            month={anchor.getMonth() + 1}
            label={format(anchor, "MMMM yyyy", { locale: localeId })}
          />
          <Link
            href={`/calendar?month=${nextMonth}`}
            className="focus-ring rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <SearchBox placeholder="Cari activity..." />
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, anchor);
            const isToday = dayStr === todayStr;
            const dayCount = countEvents(day);
            return (
              <Link
                key={dayStr}
                href={`/calendar/${dayStr}`}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1.5 border-b border-r border-zinc-100 text-sm transition-colors duration-150 hover:bg-zinc-50 md:aspect-auto md:h-24 lg:h-28",
                  !inMonth && "text-zinc-300"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    isToday && "bg-red-600 font-semibold text-white"
                  )}
                >
                  {day.getDate()}
                </span>
                {dayCount > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-0.5 sm:gap-1 md:gap-1.5">
                    {Array.from({ length: Math.min(dayCount, DOT_COLORS.length) }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-white/60 sm:h-2 sm:w-2 md:h-3 md:w-3",
                          DOT_COLORS[i]
                        )}
                      />
                    ))}
                    {dayCount > DOT_COLORS.length && (
                      <span className="shrink-0 text-[9px] font-semibold leading-none text-zinc-500 sm:text-[11px] md:text-xs">
                        +{dayCount - DOT_COLORS.length}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

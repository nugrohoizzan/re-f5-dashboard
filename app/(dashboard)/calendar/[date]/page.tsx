import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { getCalendarEventsForDay } from "@/actions/calendar";
import { CalendarDayTimeline } from "@/components/calendar-day-timeline";

export default async function CalendarDayPage({ params }: { params: { date: string } }) {
  const { date } = params;
  const events = await getCalendarEventsForDay(date);
  const dateObj = new Date(`${date}T00:00:00`);
  const monthParam = format(dateObj, "yyyy-MM");

  return (
    <div className="page-enter space-y-4">
      <Link
        href={`/calendar?month=${monthParam}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      <h1 className="text-lg font-semibold capitalize text-zinc-900">
        {format(dateObj, "EEEE — d MMMM yyyy", { locale: localeId })}
      </h1>

      <CalendarDayTimeline dateISO={date} events={events} now={new Date().toISOString()} />
    </div>
  );
}

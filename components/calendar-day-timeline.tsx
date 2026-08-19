"use client";

import * as React from "react";
import { AddCalendarEventDialog, CalendarEventDetailDialog } from "@/components/calendar-event-dialog";
import { formatTimeHM } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/db/schema";

const HOUR_HEIGHT = 56; // px per jam
const TOTAL_HEIGHT = HOUR_HEIGHT * 24;

function minutesSinceMidnight(d: Date) {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

type Block = {
  event: CalendarEvent;
  topPx: number;
  heightPx: number;
  ongoing: boolean;
};

type PositionedBlock = Block & { col: number; totalCols: number };

/** Susun blok yang jam-nya tumpang tindih jadi kolom-kolom bersebelahan
 * (seperti Google Calendar), supaya tidak ada yang ketutupan blok lain.
 * Algoritma greedy standar: proses berurutan dari atas, isi ke kolom
 * pertama yang sudah "kosong" (event sebelumnya di kolom itu sudah selesai
 * sebelum event ini mulai); kalau tidak ada yang kosong, buka kolom baru.
 * Semua blok dalam satu klaster tumpang-tindih berbagi jumlah kolom yang
 * sama supaya lebarnya seragam. */
function layoutBlocks(blocks: Block[]): PositionedBlock[] {
  const sorted = [...blocks].sort((a, b) => a.topPx - b.topPx || b.heightPx - a.heightPx);

  const result: PositionedBlock[] = [];
  let cluster: PositionedBlock[] = [];
  let colEndTimes: number[] = [];
  let clusterEnd = -Infinity;

  function flushCluster() {
    if (cluster.length === 0) return;
    const totalCols = Math.max(...cluster.map((c) => c.col)) + 1;
    for (const c of cluster) c.totalCols = totalCols;
    result.push(...cluster);
    cluster = [];
  }

  for (const b of sorted) {
    const start = b.topPx;
    const end = b.topPx + b.heightPx;

    if (start >= clusterEnd) {
      flushCluster();
      colEndTimes = [];
      clusterEnd = -Infinity;
    }

    let col = colEndTimes.findIndex((endTime) => endTime <= start);
    if (col === -1) {
      col = colEndTimes.length;
      colEndTimes.push(end);
    } else {
      colEndTimes[col] = end;
    }

    cluster.push({ ...b, col, totalCols: 1 });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flushCluster();

  return result;
}

export function CalendarDayTimeline({
  dateISO,
  events,
  now,
}: {
  dateISO: string;
  events: CalendarEvent[];
  now: string; // ISO string, dihitung di server saat render
}) {
  const dayStart = React.useMemo(() => new Date(`${dateISO}T00:00:00`), [dateISO]);
  const dayEnd = React.useMemo(() => new Date(`${dateISO}T23:59:59.999`), [dateISO]);
  const nowDate = React.useMemo(() => new Date(now), [now]);
  const isToday = nowDate >= dayStart && nowDate <= dayEnd;

  const lineRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (isToday) {
      lineRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blocks: Block[] = events.map((e) => {
    const start = new Date(e.startAt);
    const effectiveEnd = e.actualEndAt ? new Date(e.actualEndAt) : e.plannedEndAt ? new Date(e.plannedEndAt) : nowDate;

    const clippedStart = start < dayStart ? dayStart : start;
    const clippedEnd = effectiveEnd > dayEnd ? dayEnd : effectiveEnd;

    const topPx = (minutesSinceMidnight(clippedStart) / 60) * HOUR_HEIGHT;
    const heightPx = Math.max(
      ((minutesSinceMidnight(clippedEnd) - minutesSinceMidnight(clippedStart)) / 60) * HOUR_HEIGHT,
      26
    );
    const ongoing = !e.actualEndAt && !(e.endType === "determined" && e.plannedEndAt);

    return { event: e, topPx, heightPx, ongoing };
  });

  const positioned = React.useMemo(() => layoutBlocks(blocks), [blocks]);

  const nowTopPx = (minutesSinceMidnight(nowDate) / 60) * HOUR_HEIGHT;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <AddCalendarEventDialog defaultDate={dateISO} />
      </div>

      <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="relative" style={{ height: TOTAL_HEIGHT }}>
          {Array.from({ length: 24 }).map((_, hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-zinc-100"
              style={{ top: hour * HOUR_HEIGHT }}
            >
              <span className="absolute -top-2.5 left-2 bg-white pr-2 text-[11px] text-zinc-400">
                {String(hour).padStart(2, "0")}.00
              </span>
            </div>
          ))}

          {isToday && (
            <div
              ref={lineRef}
              className="absolute left-0 right-0 z-10 flex items-center gap-2"
              style={{ top: nowTopPx }}
            >
              <span className="ml-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {formatTimeHM(nowDate)}
              </span>
              <div className="h-px flex-1 bg-red-500" />
            </div>
          )}

          {/* Track tempat semua blok activity digambar — pl-14 kasih ruang
              label jam di kiri. Posisi kolom (col/totalCols) tiap blok
              dihitung relatif terhadap lebar track INI, bukan viewport. */}
          <div className="absolute inset-0 pl-14 pr-2">
            <div className="relative h-full">
              {positioned.map(({ event, topPx, heightPx, ongoing, col, totalCols }) => {
                const widthPct = 100 / totalCols;
                const leftPct = col * widthPct;
                const deadline =
                  event.endType === "determined" && event.plannedEndAt
                    ? formatTimeHM(new Date(event.plannedEndAt))
                    : null;

                return (
                  <div
                    key={event.id}
                    className="absolute"
                    style={{
                      top: topPx,
                      height: heightPx,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                    }}
                  >
                    <CalendarEventDetailDialog
                      event={event}
                      trigger={
                        <div
                          className={`h-full overflow-hidden rounded-md border-l-4 px-2 py-1 text-left text-xs shadow-sm transition-all duration-150 hover:z-20 hover:shadow-md ${
                            ongoing
                              ? "border-l-red-500 bg-red-50 text-red-800"
                              : "border-l-emerald-500 bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          <p className="truncate font-medium">{event.title}</p>
                          <p className="truncate text-[11px] opacity-80">
                            {formatTimeHM(new Date(event.startAt))}
                            {ongoing
                              ? " — berjalan"
                              : event.actualEndAt
                              ? ` — ${formatTimeHM(new Date(event.actualEndAt))}`
                              : ""}
                          </p>
                          {deadline && (
                            <p className="truncate text-[11px] font-medium opacity-90">Deadline: {deadline}</p>
                          )}
                          {event.description && (
                            <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[11px] opacity-75">
                              {event.description}
                            </p>
                          )}
                        </div>
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {events.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-400">
          Gada activity di tanggal ini.
        </div>
      )}
    </div>
  );
}

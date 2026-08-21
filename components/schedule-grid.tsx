"use client";

import * as React from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { setScheduleCell } from "@/actions/schedule";
import type { Engineer, ShiftValueRule } from "@/lib/db/schema";

const COLOR_CLASSES: Record<string, string> = {
  neutral: "bg-white text-zinc-700",
  off: "bg-zinc-100 text-zinc-400",
  oh: "bg-amber-50 text-amber-700",
  ct: "bg-purple-50 text-purple-700",
  shift1: "bg-emerald-50 text-emerald-800",
  shift2: "bg-sky-50 text-sky-800",
  shift3: "bg-indigo-50 text-indigo-800",
};

function isWeekend(dateStr: string) {
  const day = parseISO(dateStr).getDay();
  return day === 0 || day === 6;
}

export function ScheduleGrid({
  engineers,
  days,
  scheduleMap,
  rules,
}: {
  engineers: Engineer[];
  days: string[];
  scheduleMap: Record<string, Record<string, string>>;
  rules: ShiftValueRule[];
}) {
  const [grid, setGrid] = React.useState(scheduleMap);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sorotan baris/kolom ala Excel — murni visual (state terpisah), tidak
  // ikut campur sama sekali dengan logic edit sel di bawah.
  const [selectedEngineerId, setSelectedEngineerId] = React.useState<number | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  React.useEffect(() => setGrid(scheduleMap), [scheduleMap]);

  React.useEffect(() => {
    if (editingKey) inputRef.current?.focus();
  }, [editingKey]);

  function ruleFor(value: string) {
    return rules.find((r) => r.rawValue === value);
  }

  function cellKey(engineerId: number, date: string) {
    return `${engineerId}__${date}`;
  }

  function toggleRowSelection(engineerId: number) {
    setSelectedEngineerId((cur) => (cur === engineerId ? null : engineerId));
  }

  function toggleColumnSelection(date: string) {
    setSelectedDate((cur) => (cur === date ? null : date));
  }

  function startEdit(engineerId: number, date: string) {
    setDraft(grid[engineerId]?.[date] ?? "");
    setEditingKey(cellKey(engineerId, date));
  }

  async function commitEdit(engineerId: number, date: string) {
    const key = cellKey(engineerId, date);
    setEditingKey(null);
    const previous = grid[engineerId]?.[date] ?? "";
    const value = draft.trim();
    if (value === previous) return;

    // optimistic update
    setGrid((g) => ({ ...g, [engineerId]: { ...g[engineerId], [date]: value } }));

    try {
      await setScheduleCell({ engineerId, date, shiftValue: value });
    } catch {
      toast.error("Gagal memperbarui jadwal. Silakan coba lagi.");
      setGrid((g) => ({ ...g, [engineerId]: { ...g[engineerId], [date]: previous } }));
    }
  }

  return (
    <div className="max-h-[70vh] overflow-auto">
      <table className="sched-table w-full text-sm">
        <thead>
          <tr>
            <th className="sched-sticky-corner min-w-[9rem] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
              Engineer
            </th>
            {days.map((d) => {
              const date = parseISO(d);
              const weekend = isWeekend(d);
              const colSelected = selectedDate === d;
              return (
                <th
                  key={d}
                  onClick={() => toggleColumnSelection(d)}
                  className={cn(
                    "sched-sticky-head min-w-[64px] cursor-pointer select-none px-2 py-2 text-center text-xs font-medium transition-colors duration-100",
                    weekend && "bg-zinc-800",
                    colSelected && "bg-red-600 text-white"
                  )}
                >
                  <div>{format(date, "EEE")}</div>
                  <div className={cn(colSelected ? "text-red-100" : "text-zinc-300")}>
                    {format(date, "d/M")}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {engineers.map((eng) => {
            const rowSelected = selectedEngineerId === eng.id;
            return (
              <tr key={eng.id}>
                <td
                  onClick={() => toggleRowSelection(eng.id)}
                  className={cn(
                    "sched-sticky-col cursor-pointer select-none px-3 py-1.5 text-sm font-medium transition-colors duration-100",
                    rowSelected
                      ? "!bg-red-600 !text-white"
                      : "bg-white text-zinc-900"
                  )}
                >
                  {eng.displayName}
                </td>
                {days.map((d) => {
                  const key = cellKey(eng.id, d);
                  const value = grid[eng.id]?.[d] ?? "";
                  const rule = ruleFor(value);
                  const colorClass = COLOR_CLASSES[rule?.colorToken ?? "neutral"];
                  const isEditing = editingKey === key;
                  const colSelected = selectedDate === d;
                  const highlighted = rowSelected || colSelected;
                  const isIntersection = rowSelected && colSelected;

                  return (
                    <td
                      key={d}
                      className={cn(
                        "h-9 min-w-[64px] cursor-pointer p-0 text-center",
                        isWeekend(d) && !value && "bg-zinc-50"
                      )}
                      onClick={() => !isEditing && startEdit(eng.id, d)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => commitEdit(eng.id, d)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitEdit(eng.id, d);
                            } else if (e.key === "Escape") {
                              setEditingKey(null);
                            }
                          }}
                          className="focus-ring h-9 w-full min-w-[64px] border-0 bg-white text-center text-sm outline-none"
                          maxLength={20}
                        />
                      ) : (
                        // Ring highlight ditaruh di SINI (div dalam, yang
                        // punya background warna) — bukan di <td> luar —
                        // supaya tidak ketutup dan benar-benar kelihatan.
                        <div
                          className={cn(
                            "flex h-9 w-full items-center justify-center font-medium transition-shadow duration-100",
                            colorClass,
                            highlighted &&
                              (isIntersection
                                ? "ring-2 ring-inset ring-red-600"
                                : "ring-2 ring-inset ring-red-400")
                          )}
                          title={
                            rule
                              ? rule.startTime && rule.endTime
                                ? `${rule.label} (${rule.startTime}\u2013${rule.endTime})`
                                : rule.label
                              : value
                          }
                        >
                          {value}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {engineers.length === 0 && (
            <tr>
              <td colSpan={days.length + 1} className="px-4 py-10 text-center text-zinc-400">
                Belum ada engineer aktif — tambahkan dari halaman Engineer.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
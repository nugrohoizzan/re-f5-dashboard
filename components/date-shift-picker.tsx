"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SHIFTS = ["1", "2", "3"] as const;

export function DateShiftPicker({
  date,
  shift,
  shiftTimes,
}: {
  date: string;
  shift: string;
  /** e.g. { "1": "06:00–14:00", "2": "14:00–22:00", "3": "22:00–06:00" } */
  shiftTimes?: Record<"1" | "2" | "3", string | null>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(next: { date?: string; shift?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.date) params.set("date", next.date);
    if (next.shift) params.set("shift", next.shift);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="dsp-date" className="text-xs font-medium text-zinc-500">
          Tanggal
        </label>
        <Input
          id="dsp-date"
          type="date"
          value={date}
          onChange={(e) => updateParams({ date: e.target.value })}
          className="w-40 sm:w-44"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-500">Shift</span>
        <div className="inline-flex rounded-md bg-zinc-100 p-1">
          {SHIFTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => updateParams({ shift: s })}
              className={cn(
                "focus-ring flex flex-col items-center rounded-[6px] px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm",
                shift === s
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              <span>Shift {s}</span>
              {shiftTimes?.[s] && (
                <span
                  className={cn(
                    "text-[9px] font-normal sm:text-[10px]",
                    shift === s ? "text-zinc-300" : "text-zinc-400"
                  )}
                >
                  {shiftTimes[s]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

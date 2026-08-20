"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export function CalendarMonthPicker({
  year,
  month, // 1-12
  label, // cth. "Agustus 2026", ditampilkan di tombol
}: {
  year: number;
  month: number;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pickerYear, setPickerYear] = React.useState(year);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Reset tahun yang ditampilkan di panel setiap kali dibuka, biar selalu
  // mulai dari tahun yang lagi aktif.
  function handleOpen() {
    setPickerYear(year);
    setOpen(true);
  }

  function goToMonth(y: number, m: number) {
    const mm = String(m).padStart(2, "0");
    router.push(`/calendar?month=${y}-${mm}`);
    setOpen(false);
  }

  function goToToday() {
    const now = new Date();
    goToMonth(now.getFullYear(), now.getMonth() + 1);
  }

  // Klik di luar panel -> tutup.
  React.useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className="focus-ring flex w-40 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-sm font-semibold capitalize text-zinc-900 transition-colors duration-150 hover:bg-zinc-100"
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-40 mt-2 w-64 -translate-x-1/2 animate-in fade-in-0 zoom-in-95 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg duration-150">
          {/* Navigasi tahun: panah cepat + bisa diketik langsung buat lompat jauh */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setPickerYear((y) => y - 1)}
              className="focus-ring rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-100"
              aria-label="Tahun sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={pickerYear}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) setPickerYear(v);
              }}
              className="focus-ring w-20 rounded-md border border-zinc-200 py-1 text-center text-sm font-semibold text-zinc-900"
            />
            <button
              type="button"
              onClick={() => setPickerYear((y) => y + 1)}
              className="focus-ring rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-100"
              aria-label="Tahun berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {MONTH_LABELS.map((m, idx) => {
              const monthNum = idx + 1;
              const isSelected = pickerYear === year && monthNum === month;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => goToMonth(pickerYear, monthNum)}
                  className={cn(
                    "focus-ring rounded-md py-1.5 text-xs font-medium transition-colors duration-150",
                    isSelected
                      ? "bg-red-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={goToToday}
            className="focus-ring mt-3 w-full rounded-md border border-zinc-200 py-1.5 text-xs font-medium text-zinc-600 transition-colors duration-150 hover:bg-zinc-50"
          >
            Bulan ini
          </button>
        </div>
      )}
    </div>
  );
}

import { db } from "@/lib/db";
import { engineers, shiftSchedule, shiftValueRules } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export type ResolvedEngineer = {
  id: number;
  name: string;
  displayName: string;
  shiftValue: string;
  /** Keterangan tambahan di belakang nama, cth. "(OH)" atau "(Overlap)" â€”
   * muncul kalau engineer ini masuk shift ini karena jam kerjanya
   * tumpang-tindih, bukan karena ini shift utamanya. Kosong (undefined)
   * kalau ini memang shift utama/aslinya. */
  note?: string;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Ubah rentang jam jadi daftar interval menit dalam siklus 24 jam. Kalau
 * jam selesai < jam mulai berarti rentangnya melewati tengah malam (mis.
 * 22:00â€“06:00 atau 18:00â€“02:00), jadi dipecah jadi dua interval. */
function expandRange(start: string, end: string): Array<[number, number]> {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (e > s) return [[s, e]];
  return [
    [s, 24 * 60],
    [0, e],
  ];
}

function rangesOverlap(a: Array<[number, number]>, b: Array<[number, number]>): boolean {
  for (const [as, ae] of a) {
    for (const [bs, be] of b) {
      if (as < be && bs < ae) return true;
    }
  }
  return false;
}

/**
 * Given a date and shift ("1" | "2" | "3"), return every active engineer
 * whose schedule value untuk tanggal itu masuk ke jam kerja shift tsb â€”
 * baik karena memang shift utamanya (mapsToShift persis sama), MAUPUN
 * karena rentang jamnya tumpang-tindih dengan jam shift ini (mis. OH
 * 08:00â€“17:00 tumpang tindih Shift 1 06:00â€“14:00 dan Shift 2 14:00â€“22:00;
 * nilai "23" 18:00â€“02:00 tumpang tindih Shift 2 dan Shift 3). Engineer yang
 * masuk karena tumpang tindih (bukan shift utamanya) diberi keterangan
 * `note` supaya tetap kelihatan bedanya di UI.
 */
export async function getEngineersForShift(
  date: string,
  shift: "1" | "2" | "3"
): Promise<ResolvedEngineer[]> {
  const rules = await db.select().from(shiftValueRules);

  const shiftRule = rules.find((r) => r.rawValue === shift && r.startTime && r.endTime);
  const shiftRange = shiftRule ? expandRange(shiftRule.startTime!, shiftRule.endTime!) : null;

  // rawValue -> keterangan (undefined = tampil polos, ini shift utamanya)
  const valueNote = new Map<string, string | undefined>();

  for (const r of rules) {
    if (r.mapsToShift === shift) {
      // Ini memang shift utama nilai ini -> tampil polos, tidak perlu dicek tumpang tindih.
      valueNote.set(r.rawValue, undefined);
      continue;
    }
    if (!shiftRange || !r.startTime || !r.endTime) continue;
    const overlaps = rangesOverlap(shiftRange, expandRange(r.startTime, r.endTime));
    if (!overlaps) continue;
    // Nilai tanpa shift utama (mis. OH) -> label pakai nama nilainya sendiri.
    // Nilai yang punya shift utama tapi tumpang tindih ke shift lain (mis.
    // "23" yang utamanya Shift 2 tapi nyerempet Shift 3) -> label "Overlap".
    valueNote.set(r.rawValue, r.mapsToShift === null ? `(${r.rawValue})` : "(Overlap)");
  }

  // Fallback: kalau rule utk shift ini sendiri belum diisi jamnya di
  // Settings, tetap terima nilai shift itu apa adanya tanpa keterangan.
  if (!valueNote.has(shift)) valueNote.set(shift, undefined);

  const matchingValues = Array.from(valueNote.keys());
  if (matchingValues.length === 0) return [];

  const rows = await db
    .select({
      id: engineers.id,
      name: engineers.name,
      displayName: engineers.displayName,
      shiftValue: shiftSchedule.shiftValue,
    })
    .from(shiftSchedule)
    .innerJoin(engineers, eq(shiftSchedule.engineerId, engineers.id))
    .where(
      and(
        eq(shiftSchedule.date, date),
        inArray(shiftSchedule.shiftValue, matchingValues),
        eq(engineers.active, true)
      )
    );

  return rows.map((r) => ({ ...r, note: valueNote.get(r.shiftValue) }));
}

export function buildShiftTimeMap(
  rules: { rawValue: string; mapsToShift: string | null; startTime: string | null; endTime: string | null }[]
): Record<"1" | "2" | "3", string | null> {
  const map: Record<"1" | "2" | "3", string | null> = { "1": null, "2": null, "3": null };
  for (const shift of ["1", "2", "3"] as const) {
    const exact = rules.find((r) => r.rawValue === shift && r.startTime && r.endTime);
    const fallback = rules.find((r) => r.mapsToShift === shift && r.startTime && r.endTime);
    const rule = exact ?? fallback;
    map[shift] = rule ? `${rule.startTime}\u2013${rule.endTime}` : null;
  }
  return map;
}

export async function getShiftTimeMap() {
  const rules = await db.select().from(shiftValueRules);
  return buildShiftTimeMap(rules);
}

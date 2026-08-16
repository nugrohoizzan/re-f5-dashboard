import { db } from "@/lib/db";
import { engineers, shiftSchedule, shiftValueRules } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export type ResolvedEngineer = {
  id: number;
  name: string;
  displayName: string;
  shiftValue: string;
};

/**
 * Given a date and shift ("1" | "2" | "3"), return every active engineer
 * whose schedule value for that date maps to that shift, per the rules
 * configured in shift_value_rules. This is the single source of truth used
 * by every "Add Activity / Troubleshoot / Titipan" form so engineer names
 * are never typed manually.
 */
export async function getEngineersForShift(
  date: string,
  shift: "1" | "2" | "3"
): Promise<ResolvedEngineer[]> {
  const rules = await db.select().from(shiftValueRules);
  const matchingValues = rules
    .filter((r) => r.mapsToShift === shift)
    .map((r) => r.rawValue);

  // Always also accept the literal shift number as a fallback, in case a
  // schedule cell was entered before a rule existed for that value.
  if (!matchingValues.includes(shift)) matchingValues.push(shift);

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

  return rows;
}

// Given the active rule set, resolve the canonical clock-time label for a
// working shift ("1" | "2" | "3"), e.g. "06:00–14:00", for display purposes
// (schedule grid tooltips, the dashboard shift picker, etc). Falls back to
// null if no rule with a time range maps to that shift yet.
export function buildShiftTimeMap(
  rules: { rawValue: string; mapsToShift: string | null; startTime: string | null; endTime: string | null }[]
): Record<"1" | "2" | "3", string | null> {
  const map: Record<"1" | "2" | "3", string | null> = { "1": null, "2": null, "3": null };
  for (const shift of ["1", "2", "3"] as const) {
    // Prefer the rule whose rawValue is exactly the shift number itself
    // ("1", "2", "3") over other values that merely also map to it (e.g. "23").
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

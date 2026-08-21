import { and, eq, gte, lte, asc } from "drizzle-orm";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { db } from "@/lib/db";
import { shiftSchedule, engineers } from "@/lib/db/schema";
import { getEngineersForShift } from "@/lib/schedule-rules";
import { withApiKey, apiData, apiList } from "@/lib/api-response";
import { todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApiKey(request, async () => {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const month = searchParams.get("month");
    let from = searchParams.get("from");
    let to = searchParams.get("to");

    if (month) {
      const anchor = new Date(`${month}-01T00:00:00`);
      from = format(startOfMonth(anchor), "yyyy-MM-dd");
      to = format(endOfMonth(anchor), "yyyy-MM-dd");
    }

    if (from || to) {
      const conditions = [];
      if (from) conditions.push(gte(shiftSchedule.date, from));
      if (to) conditions.push(lte(shiftSchedule.date, to));

      const rows = await db
        .select({
          date: shiftSchedule.date,
          shiftValue: shiftSchedule.shiftValue,
          engineerName: engineers.displayName,
        })
        .from(shiftSchedule)
        .innerJoin(engineers, eq(shiftSchedule.engineerId, engineers.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(asc(shiftSchedule.date));

      return apiList(rows);
    }

    const targetDate = date ?? todayISO();
    const [shift1, shift2, shift3] = await Promise.all([
      getEngineersForShift(targetDate, "1"),
      getEngineersForShift(targetDate, "2"),
      getEngineersForShift(targetDate, "3"),
    ]);

    return apiData({ date: targetDate, shift1, shift2, shift3 });
  });
}
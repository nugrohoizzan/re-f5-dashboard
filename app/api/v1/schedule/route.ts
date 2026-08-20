import { and, eq, gte, lte, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { shiftSchedule, engineers } from "@/lib/db/schema";
import { getEngineersForShift } from "@/lib/schedule-rules";
import { withApiKey, apiData, apiList } from "@/lib/api-response";
import { todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Dua mode:
// 1) GET /api/v1/schedule?date=YYYY-MM-DD
//    -> roster resmi per shift (siapa masuk shift 1/2/3) untuk 1 tanggal.
//    Tanpa ?date sama sekali -> pakai hari ini.
// 2) GET /api/v1/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
//    -> data mentah grid jadwal per engineer per tanggal (buat sinkron ke
//    spreadsheet "manage service" dst).
export async function GET(request: Request) {
  return withApiKey(request, async () => {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

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

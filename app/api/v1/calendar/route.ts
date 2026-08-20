import { and, gte, lte, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarEvents } from "@/lib/db/schema";
import { withApiKey, apiList } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/v1/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=200
// from/to difilter terhadap startAt. Kosongin keduanya buat ambil semua.
export async function GET(request: Request) {
  return withApiKey(request, async () => {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = Math.min(Number(searchParams.get("limit")) || 200, 500);

    const conditions = [];
    if (from) conditions.push(gte(calendarEvents.startAt, new Date(`${from}T00:00:00Z`)));
    if (to) conditions.push(lte(calendarEvents.startAt, new Date(`${to}T23:59:59Z`)));

    const rows = await db
      .select()
      .from(calendarEvents)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(calendarEvents.startAt))
      .limit(limit);

    return apiList(rows);
  });
}

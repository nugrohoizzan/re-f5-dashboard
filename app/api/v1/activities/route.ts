import { and, eq, gte, lte, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, engineers } from "@/lib/db/schema";
import { withApiKey, apiList } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/v1/activities?date=YYYY-MM-DD&from=&to=&shift=1|2|3&status=pending|completed&limit=200
export async function GET(request: Request) {
  return withApiKey(request, async () => {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const shift = searchParams.get("shift");
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || 200, 500);

    const conditions = [];
    if (date) conditions.push(eq(activities.date, date));
    if (from) conditions.push(gte(activities.date, from));
    if (to) conditions.push(lte(activities.date, to));
    if (shift) conditions.push(eq(activities.shift, shift as "1" | "2" | "3"));
    if (status) conditions.push(eq(activities.status, status as "pending" | "completed"));

    const rows = await db
      .select({
        id: activities.id,
        date: activities.date,
        shift: activities.shift,
        description: activities.description,
        status: activities.status,
        engineerName: engineers.displayName,
        createdAt: activities.createdAt,
        updatedAt: activities.updatedAt,
      })
      .from(activities)
      .leftJoin(engineers, eq(activities.engineerId, engineers.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    return apiList(rows);
  });
}

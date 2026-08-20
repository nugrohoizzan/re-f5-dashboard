import { and, eq, gte, lte, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { troubleshooting, engineers } from "@/lib/db/schema";
import { withApiKey, apiList } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/v1/troubleshooting?date=YYYY-MM-DD&from=&to=&shift=1|2|3&status=pending|in_progress|completed&limit=200
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
    if (date) conditions.push(eq(troubleshooting.date, date));
    if (from) conditions.push(gte(troubleshooting.date, from));
    if (to) conditions.push(lte(troubleshooting.date, to));
    if (shift) conditions.push(eq(troubleshooting.shift, shift as "1" | "2" | "3"));
    if (status) conditions.push(eq(troubleshooting.status, status as "pending" | "in_progress" | "completed"));

    const rows = await db
      .select({
        id: troubleshooting.id,
        date: troubleshooting.date,
        shift: troubleshooting.shift,
        title: troubleshooting.title,
        description: troubleshooting.description,
        ticketReference: troubleshooting.ticketReference,
        affectedVs: troubleshooting.affectedVs,
        affectedPool: troubleshooting.affectedPool,
        resolution: troubleshooting.resolution,
        status: troubleshooting.status,
        engineerName: engineers.displayName,
        createdAt: troubleshooting.createdAt,
        updatedAt: troubleshooting.updatedAt,
      })
      .from(troubleshooting)
      .leftJoin(engineers, eq(troubleshooting.engineerId, engineers.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(troubleshooting.createdAt))
      .limit(limit);

    return apiList(rows);
  });
}

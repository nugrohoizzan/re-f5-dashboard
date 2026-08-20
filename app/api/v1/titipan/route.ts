import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { handoverTasks, engineers } from "@/lib/db/schema";
import { withApiKey, apiList } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/v1/titipan?status=pending|in_progress|completed&category=none|support|mop|scm|ncm|ekse&limit=200
export async function GET(request: Request) {
  return withApiKey(request, async () => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const limit = Math.min(Number(searchParams.get("limit")) || 200, 500);

    const conditions = [];
    if (status) conditions.push(eq(handoverTasks.status, status as "pending" | "in_progress" | "completed"));
    if (category)
      conditions.push(
        eq(handoverTasks.category, category as "none" | "support" | "mop" | "scm" | "ncm" | "ekse")
      );

    const rows = await db
      .select({
        id: handoverTasks.id,
        title: handoverTasks.title,
        category: handoverTasks.category,
        description: handoverTasks.description,
        ticketReference: handoverTasks.ticketReference,
        sourceDate: handoverTasks.sourceDate,
        sourceShift: handoverTasks.sourceShift,
        status: handoverTasks.status,
        dueDate: handoverTasks.dueDate,
        engineerName: engineers.displayName,
        notes: handoverTasks.notes,
        completionNotes: handoverTasks.completionNotes,
        createdAt: handoverTasks.createdAt,
        updatedAt: handoverTasks.updatedAt,
      })
      .from(handoverTasks)
      .leftJoin(engineers, eq(handoverTasks.assignedEngineerId, engineers.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(handoverTasks.updatedAt))
      .limit(limit);

    return apiList(rows);
  });
}

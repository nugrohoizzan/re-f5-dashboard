import { eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, troubleshooting, handoverTasks, engineers } from "@/lib/db/schema";
import { getEngineersForShift } from "@/lib/schedule-rules";
import { withApiKey, apiData } from "@/lib/api-response";
import { todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET /api/v1/handover-summary?date=YYYY-MM-DD&shift=1|2|3
// Satu endpoint gabungan: siapa lagi standby, activity & troubleshoot hari
// itu, plus titipan yang masih belum selesai (lintas hari). Didesain buat
// bot yang perlu format 1 laporan (WA/laporan-ke-atasan) tanpa harus
// gabung-gabung beberapa endpoint sendiri.
export async function GET(request: Request) {
  return withApiKey(request, async () => {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? todayISO();
    const shift = (searchParams.get("shift") ?? "1") as "1" | "2" | "3";

    const [engineersOnDuty, dayActivities, dayTroubleshoot, openTitipan] = await Promise.all([
      getEngineersForShift(date, shift),
      db
        .select({
          id: activities.id,
          description: activities.description,
          status: activities.status,
          createdAt: activities.createdAt,
        })
        .from(activities)
        .where(eq(activities.date, date)),
      db
        .select({
          id: troubleshooting.id,
          title: troubleshooting.title,
          status: troubleshooting.status,
          ticketReference: troubleshooting.ticketReference,
          resolution: troubleshooting.resolution,
        })
        .from(troubleshooting)
        .where(eq(troubleshooting.date, date)),
      db
        .select({
          id: handoverTasks.id,
          title: handoverTasks.title,
          category: handoverTasks.category,
          status: handoverTasks.status,
          ticketReference: handoverTasks.ticketReference,
          engineerName: engineers.displayName,
        })
        .from(handoverTasks)
        .leftJoin(engineers, eq(handoverTasks.assignedEngineerId, engineers.id))
        .where(ne(handoverTasks.status, "completed")),
    ]);

    return apiData({
      date,
      shift,
      engineersOnDuty,
      activities: dayActivities,
      troubleshooting: dayTroubleshoot,
      openTitipan,
    });
  });
}

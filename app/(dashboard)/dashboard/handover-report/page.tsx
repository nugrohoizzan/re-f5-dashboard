import { and, eq, ne, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, troubleshooting, handoverTasks, engineers } from "@/lib/db/schema";
import { getEngineersForShift, getShiftTimeMap } from "@/lib/schedule-rules";
import { todayISO, formatDateLong } from "@/lib/utils";
import { DateShiftPicker } from "@/components/date-shift-picker";
import { Card, CardContent } from "@/components/ui/card";
import { ReportActions } from "@/components/report-actions";

export default async function HandoverReportPage({
  searchParams,
}: {
  searchParams: { date?: string; shift?: string };
}) {
  const date = searchParams.date || todayISO();
  const shift = (searchParams.shift as "1" | "2" | "3") || "1";

  const [shiftEngineers, dayActivities, dayTroubleshoot, openTitipan, shiftTimes] = await Promise.all([
    getEngineersForShift(date, shift),
    db.select().from(activities).where(and(eq(activities.date, date), eq(activities.shift, shift))),
    db
      .select()
      .from(troubleshooting)
      .where(and(eq(troubleshooting.date, date), eq(troubleshooting.shift, shift))),
    db
      .select({
        title: handoverTasks.title,
        ticketReference: handoverTasks.ticketReference,
        status: handoverTasks.status,
        sourceDate: handoverTasks.sourceDate,
        sourceShift: handoverTasks.sourceShift,
        engineerName: engineers.displayName,
      })
      .from(handoverTasks)
      .leftJoin(engineers, eq(handoverTasks.assignedEngineerId, engineers.id))
      .where(ne(handoverTasks.status, "completed"))
      .orderBy(desc(handoverTasks.updatedAt)),
    getShiftTimeMap(),
  ]);

  const lines: string[] = [];
  lines.push("LAPORAN SERAH TERIMA");
  lines.push(formatDateLong(date));
  lines.push("");
  lines.push(`SHIFT ${shift}`);
  lines.push("Engineer:");
  if (shiftEngineers.length === 0) lines.push("(belum ada jadwal)");
  shiftEngineers.forEach((e) => lines.push(e.displayName));
  lines.push("");

  lines.push("TROUBLESHOOT");
  if (dayTroubleshoot.length === 0) lines.push("(tidak ada)");
  const statusLabelId: Record<string, string> = { pending: "Pending", in_progress: "Sedang Diproses", completed: "Selesai" };
  dayTroubleshoot.forEach((t, i) => {
    lines.push(`${i + 1}. ${t.title}`);
    lines.push(`   Status: ${statusLabelId[t.status] ?? t.status}`);
    if (t.description) lines.push(`   Catatan: ${t.description}`);
    if (t.resolution) lines.push(`   Resolusi: ${t.resolution}`);
  });
  lines.push("");

  lines.push("ACTIVITY");
  if (dayActivities.length === 0) lines.push("(tidak ada)");
  dayActivities.forEach((a) => {
    lines.push(`${a.status === "completed" ? "✓" : "○"} ${a.description}`);
  });
  lines.push("");

  lines.push("TITIPAN & PENDING");
  if (openTitipan.length === 0) lines.push("(tidak ada)");
  openTitipan.forEach((t) => {
    lines.push(
      `⏳ ${t.ticketReference ? `[${t.ticketReference}] ` : ""}${t.title} (dari Shift ${t.sourceShift}, ${formatDateLong(
        t.sourceDate
      )})`
    );
  });

  const reportText = lines.join("\n");

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-zinc-900">Laporan Handover</h1>
        <ReportActions text={reportText} />
      </div>

      <Card>
        <CardContent className="pt-4">
          <DateShiftPicker date={date} shift={shift} shiftTimes={shiftTimes} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-900">{reportText}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

import { and, eq, ne, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, troubleshooting, handoverTasks, engineers } from "@/lib/db/schema";
import { getEngineersForShift, getShiftTimeMap } from "@/lib/schedule-rules";
import { DateShiftPicker } from "@/components/date-shift-picker";
import { EngineerBadges } from "@/components/engineer-badges";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AddActivitiesDialog } from "@/components/activity-dialogs";
import { TroubleshootDialog } from "@/components/troubleshoot-dialog";
import { AddTitipanDialog, TitipanDetailDialog } from "@/components/titipan-dialogs";
import { todayISO, formatDateLong } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { date?: string; shift?: string };
}) {
  const date = searchParams.date || todayISO();
  const shift = (searchParams.shift as "1" | "2" | "3") || "1";

  const [shiftEngineers, dayActivities, dayTroubleshoot, openTitipan, shiftTimes] = await Promise.all([
    getEngineersForShift(date, shift),
    db
      .select()
      .from(activities)
      .where(and(eq(activities.date, date), eq(activities.shift, shift)))
      .orderBy(desc(activities.createdAt)),
    db
      .select()
      .from(troubleshooting)
      .where(and(eq(troubleshooting.date, date), eq(troubleshooting.shift, shift)))
      .orderBy(desc(troubleshooting.createdAt)),
    db
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
        assignedEngineerId: handoverTasks.assignedEngineerId,
        createdBy: handoverTasks.createdBy,
        createdAt: handoverTasks.createdAt,
        updatedAt: handoverTasks.updatedAt,
        completionNotes: handoverTasks.completionNotes,
        notes: handoverTasks.notes,
        engineerName: engineers.displayName,
      })
      .from(handoverTasks)
      .leftJoin(engineers, eq(handoverTasks.assignedEngineerId, engineers.id))
      .where(ne(handoverTasks.status, "completed"))
      .orderBy(desc(handoverTasks.updatedAt)),
    getShiftTimeMap(),
  ]);

  const activitiesCompleted = dayActivities.filter((a) => a.status === "completed").length;
  const activitiesPending = dayActivities.filter((a) => a.status === "pending").length;
  const troubleshootOpen = dayTroubleshoot.filter((t) => t.status !== "completed").length;

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-400">{formatDateLong(date)}</p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <DateShiftPicker date={date} shift={shift} shiftTimes={shiftTimes} />
          <EngineerBadges engineers={shiftEngineers} />
        </CardContent>
      </Card>

      {/* Subtle summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryStat label="Engineer" value={shiftEngineers.length} />
        <SummaryStat label="Aktivitas Selesai" value={activitiesCompleted} />
        <SummaryStat label="Aktivitas Pending" value={activitiesPending} />
        <SummaryStat label="Troubleshoot Isu" value={troubleshootOpen} />
        <SummaryStat label="Titipan Pending" value={openTitipan.length} />
        <Link
          href="/dashboard/handover-report"
          className="focus-ring flex flex-col justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800 transition-all duration-150 hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-sm"
        >
          Laporan Handover →
        </Link>
      </div>

      <Tabs defaultValue="troubleshoot">
        <TabsList>
          <TabsTrigger value="troubleshoot">Troubleshoot</TabsTrigger>
          <TabsTrigger value="activity">Aktivitas</TabsTrigger>
          <TabsTrigger value="titipan">Titipan</TabsTrigger>
        </TabsList>

        <TabsContent value="troubleshoot">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-500">Issu yg ditanganin.</p>
            <TroubleshootDialog date={date} shift={shift} engineers={shiftEngineers} />
          </div>
          <div className="space-y-2">
            {dayTroubleshoot.length === 0 && <EmptyState text="gada troubleshoot or isu." />}
            {dayTroubleshoot.map((t) => (
              <Card key={t.id} className="hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex items-start justify-between gap-3 pt-4">
                  <div>
                    <TroubleshootDialog
                      date={date}
                      shift={shift}
                      engineers={shiftEngineers}
                      existing={t}
                    />
                    {t.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{t.description}</p>
                    )}
                  </div>
                  <StatusBadge status={t.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-500">Operasional Activity.</p>
            <AddActivitiesDialog date={date} shift={shift} engineers={shiftEngineers} />
          </div>
          <div className="space-y-2">
            {dayActivities.length === 0 && <EmptyState text="Gada kerjaan." />}
            {dayActivities.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <p className="text-sm text-zinc-900">{a.description}</p>
                  <StatusBadge status={a.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="titipan">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-500">
              Item pending yg dititipin.
            </p>
            <AddTitipanDialog date={date} shift={shift} engineers={shiftEngineers} />
          </div>
          <div className="space-y-2">
            {openTitipan.length === 0 && <EmptyState text="Gada handover josjis pol." />}
            {openTitipan.map((t) => (
              <Card key={t.id} className="hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex items-start justify-between gap-3 pt-4">
                  <div>
                    <TitipanDetailDialog
                      task={t}
                      trigger={
                        <span className="text-sm font-medium text-zinc-900 hover:text-red-700">
                          {t.title}
                        </span>
                      }
                    />
                    <p className="mt-1 text-xs text-zinc-400">
                      {t.ticketReference && <span className="font-mono">{t.ticketReference} · </span>}
                      Dari Shift {t.sourceShift}, {formatDateLong(t.sourceDate)}
                      {t.engineerName ? ` · ${t.engineerName}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
      <p className="text-lg font-semibold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-400">
      {text}
    </div>
  );
}

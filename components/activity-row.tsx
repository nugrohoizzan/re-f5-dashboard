"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { EditActivityDialog } from "@/components/activity-dialogs";
import { formatDateTime } from "@/lib/utils";
import type { Activity } from "@/lib/db/schema";

export function ActivityRow({ activity }: { activity: Activity }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Card className="cursor-pointer transition-colors hover:border-red-300" onClick={() => setOpen(true)}>
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm text-zinc-900">{activity.description}</p>
            <p className="mt-0.5 text-xs text-zinc-400">{formatDateTime(activity.createdAt)}</p>
          </div>
          <StatusBadge status={activity.status} />
        </CardContent>
      </Card>
      <EditActivityDialog activity={activity} open={open} onOpenChange={setOpen} />
    </>
  );
}

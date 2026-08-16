import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<string, { label: string; variant: "pending" | "progress" | "completed" }> = {
  pending: { label: "Pending", variant: "pending" },
  in_progress: { label: "Sedang Diproses", variant: "progress" },
  completed: { label: "Selesai", variant: "completed" },
  menunggu_review: { label: "Menunggu Review", variant: "pending" },
  selesai_review: { label: "Selesai Review Internal", variant: "completed" },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_MAP[status] ?? { label: status, variant: "pending" as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

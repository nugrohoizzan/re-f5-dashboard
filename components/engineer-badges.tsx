import { Users } from "lucide-react";
import type { ResolvedEngineer } from "@/lib/schedule-rules";

export function EngineerBadges({
  engineers,
}: {
  engineers: ResolvedEngineer[];
}) {
  if (engineers.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        Belum ada engineer terjadwal untuk tanggal dan shift ini.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Users className="h-4 w-4 text-zinc-400" />
      {engineers.map((e) => (
        <span
          key={e.id}
          className="animate-in fade-in-0 zoom-in-95 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-sm font-medium text-red-800 duration-200"
        >
          {e.displayName}
        </span>
      ))}
    </div>
  );
}

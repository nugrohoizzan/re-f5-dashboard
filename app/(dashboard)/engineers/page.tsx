import { db } from "@/lib/db";
import { engineers } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EngineerDialog, ToggleActiveButton } from "@/components/engineer-dialogs";

export default async function EngineersPage() {
  const rows = await db.select().from(engineers).orderBy(asc(engineers.sortOrder));

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Engineer</h1>
          <p className="text-sm text-zinc-400">
            Daftar engineer yang dipakai di operasional.
          </p>
        </div>
        <EngineerDialog />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2.5">Nama</th>
                <th className="px-4 py-2.5">Peran</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((eng) => (
                <tr key={eng.id} className="transition-colors duration-150 hover:bg-zinc-50">
                  <td className="px-4 py-2.5">
                    <EngineerDialog existing={eng} />
                    <p className="text-xs text-zinc-400">{eng.name}</p>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500">{eng.role ?? "—"}</td>
                  <td className="px-4 py-2.5 text-zinc-500">{eng.email ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={eng.active ? "completed" : "off"}>
                      {eng.active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <ToggleActiveButton engineer={eng} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

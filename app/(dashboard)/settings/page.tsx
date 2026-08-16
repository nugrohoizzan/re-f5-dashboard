import { db } from "@/lib/db";
import { shiftValueRules } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShiftValueRulesEditor } from "@/components/shift-value-rules-editor";
import { auth } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await auth();
  const rules = await db.select().from(shiftValueRules).orderBy(asc(shiftValueRules.rawValue));

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Pengaturan</h1>
        <p className="text-sm text-zinc-400">
          Atur pemetaan nilai jadwal dan jam kerjanya.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aturan nilai jadwal</CardTitle>
        </CardHeader>
        <CardContent>
          {session?.user?.role === "admin" ? (
            <ShiftValueRulesEditor rules={rules} />
          ) : (
            <p className="text-sm text-zinc-500">
              Cuma admin yg bisa ubah.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

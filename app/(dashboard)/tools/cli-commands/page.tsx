import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { cliCommands } from "@/lib/db/schema";
import { CliCommandsManager } from "@/components/tools/cli-commands-manager";

export default async function CliCommandsPage() {
  const commands = await db.select().from(cliCommands).orderBy(desc(cliCommands.updatedAt));
  return (
    <div className="page-enter space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Command CLI</h1>
        <p className="text-sm text-zinc-500">Kumpulan command beserta fungsinya.</p>
      </div>
      <CliCommandsManager commands={commands} />
    </div>
  );
}
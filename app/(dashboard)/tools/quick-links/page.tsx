import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { quickLinks } from "@/lib/db/schema";
import { QuickLinksManager } from "@/components/tools/quick-links-manager";

export default async function QuickLinksPage() {
  const links = await db.select().from(quickLinks).orderBy(desc(quickLinks.updatedAt));
  return (
    <div className="page-enter space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Quick Links</h1>
        <p className="text-sm text-zinc-500">Link ekosistem yg sering dipake.</p>
      </div>
      <QuickLinksManager links={links} />
    </div>
  );
}
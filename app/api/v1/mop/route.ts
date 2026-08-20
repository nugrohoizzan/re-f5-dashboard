import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { mops, users } from "@/lib/db/schema";
import { withApiKey, apiList } from "@/lib/api-response";
import { alias } from "drizzle-orm/pg-core";

export const dynamic = "force-dynamic";

const uploader = alias(users, "uploader");
const reviewer = alias(users, "reviewer");

// GET /api/v1/mop?status=menunggu_review|selesai_review&limit=200
export async function GET(request: Request) {
  return withApiKey(request, async () => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || 200, 500);

    const conditions = [];
    if (status) conditions.push(eq(mops.status, status as "menunggu_review" | "selesai_review"));

    const rows = await db
      .select({
        id: mops.id,
        title: mops.title,
        scrCode: mops.scrCode,
        requestedBy: mops.requestedBy,
        description: mops.description,
        fileUrl: mops.fileUrl,
        fileName: mops.fileName,
        fileType: mops.fileType,
        status: mops.status,
        uploadedByName: uploader.name,
        reviewedByName: reviewer.name,
        reviewedAt: mops.reviewedAt,
        createdAt: mops.createdAt,
        updatedAt: mops.updatedAt,
      })
      .from(mops)
      .leftJoin(uploader, eq(mops.uploadedBy, uploader.id))
      .leftJoin(reviewer, eq(mops.reviewedBy, reviewer.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(mops.createdAt))
      .limit(limit);

    return apiList(rows);
  });
}

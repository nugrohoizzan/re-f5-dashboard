import { NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api-auth";
import type { ApiKey } from "@/lib/db/schema";

/** Bungkus tiap route handler /api/v1/* dengan ini. Otomatis nolak request
 * tanpa/dengan API key yang salah, dan nangkep error tak terduga supaya
 * gak pernah bocorin stack trace ke luar. */
export async function withApiKey(
  request: Request,
  handler: (key: ApiKey) => Promise<NextResponse>
): Promise<NextResponse> {
  const key = await verifyApiKey(request);
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Unauthorized. Sertakan header 'Authorization: Bearer <API_KEY>' dengan key yang valid dan masih aktif.",
      },
      { status: 401 }
    );
  }

  try {
    return await handler(key);
  } catch (err) {
    console.error("[api/v1] error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export function apiList<T>(data: T[]) {
  return NextResponse.json({ data, count: data.length, generatedAt: new Date().toISOString() });
}

export function apiData<T>(data: T) {
  return NextResponse.json({ data, generatedAt: new Date().toISOString() });
}

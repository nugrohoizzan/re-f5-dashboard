import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";

const KEY_PREFIX = "f5ops_";

/** Bikin token acak baru. HANYA dipanggil sekali saat generate key baru
 * (lewat script) — token asli ini gak pernah disimpan, cuma hash-nya. */
export function generateApiKeyToken(): string {
  const raw = randomBytes(24).toString("base64url");
  return `${KEY_PREFIX}${raw}`;
}

export function hashApiKeyToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function keyPrefixOf(token: string): string {
  return token.slice(0, 12);
}

/** Cek header Authorization: Bearer <token> terhadap tabel api_keys.
 * Return baris api_keys kalau valid & aktif, null kalau tidak. */
export async function verifyApiKey(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token || !token.startsWith(KEY_PREFIX)) return null;

  const hash = hashApiKeyToken(token);
  const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1);
  if (!key || !key.active) return null;

  // Catat kapan terakhir dipakai, tapi jangan sampai ini bikin response
  // lambat/gagal kalau update-nya error.
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .catch(() => {});

  return key;
}

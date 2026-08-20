import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createHash, randomBytes } from "crypto";
import * as schema from "./schema";

// ---------------------------------------------------------------------------
// Generate API key baru untuk integrasi eksternal (bot WA, bot laporan,
// Google Sheets, dst). Token ASLI cuma ditampilkan SEKALI di sini — kirim
// ke tim yang minta akses lewat jalur aman (jangan taruh di chat publik),
// karena setelah ini token gak bisa dilihat lagi (yang tersimpan cuma hash).
//
// Sengaja TIDAK import dari lib/api-auth.ts atau @/lib/db — keduanya bikin
// koneksi database langsung begitu di-import, sebelum .env.local di atas
// sempat kebaca (import selalu jalan duluan di JS/TS, apapun urutan
// tulisannya). Jadi logic hash/generate token & koneksi db-nya
// diduplikat kecil di sini, sama seperti pola seed.ts dan migrate.ts.
//
// Jalankan: npx tsx lib/db/generate-api-key.ts "Label buat integrasi ini"
// Contoh:   npx tsx lib/db/generate-api-key.ts "Bot WA - HO Report"
// ---------------------------------------------------------------------------

function generateApiKeyToken(): string {
  const raw = randomBytes(24).toString("base64url");
  return `f5ops_${raw}`;
}

function hashApiKeyToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function main() {
  // slice+join biar tetep aman walau tanda kutip labelnya kepotong pas
  // lewat npm/PowerShell di Windows (argv jadi beberapa bagian, bukan 1).
  const label = process.argv.slice(2).join(" ").trim();
  if (!label) {
    console.error('Pakai: npx tsx lib/db/generate-api-key.ts "Label integrasi"');
    console.error('Contoh: npx tsx lib/db/generate-api-key.ts "Bot WA - HO Report"');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql, { schema });

  const token = generateApiKeyToken();
  const keyHash = hashApiKeyToken(token);
  const keyPrefix = token.slice(0, 12);

  await db.insert(schema.apiKeys).values({
    label,
    keyHash,
    keyPrefix,
    active: true,
  });

  console.log("\n✓ API key berhasil dibuat untuk:", label);
  console.log("\n  Token (SIMPAN SEKARANG, cuma muncul sekali):\n");
  console.log(`  ${token}\n`);
  console.log("  Cara pakai di sisi tim yang integrasi — header request:");
  console.log(`  Authorization: Bearer ${token}\n`);

  await sql.end();
}

main().catch((err) => {
  console.error("Generate API key failed:", err);
  process.exit(1);
});
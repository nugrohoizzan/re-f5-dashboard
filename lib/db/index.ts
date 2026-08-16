import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __f5ops_pg_client__: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Neon connection string."
  );
}

// Reuse the connection across hot reloads / lambda invocations instead of
// opening a new pool on every request.
const client =
  global.__f5ops_pg_client__ ??
  postgres(connectionString, { max: 10, prepare: false });

if (process.env.NODE_ENV !== "production") {
  global.__f5ops_pg_client__ = client;
}

export const db = drizzle(client, { schema });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export type DbClient = ReturnType<typeof createDbClient>;

/**
 * Create a Drizzle client connected to Postgres (Supabase).
 * Use this in server-side code only.
 */
export function createDbClient(connectionString: string) {
  const queryClient = postgres(connectionString, {
    prepare: false, // required for Supabase pooler compatibility
    max: 1,
  });
  return drizzle(queryClient, { schema });
}

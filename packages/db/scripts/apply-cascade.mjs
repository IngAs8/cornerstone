import postgres from "postgres";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env" });
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

// 1a. Find orphan public.users rows
const orphanIds = (await sql`
  SELECT id FROM public.users WHERE id NOT IN (SELECT id FROM auth.users)
`).map((r) => r.id);

if (orphanIds.length > 0) {
  console.log(`Cleaning up ${orphanIds.length} orphan(s):`, orphanIds);
  // Delete dependents first (cascading from households)
  await sql`DELETE FROM public.households WHERE owner_id = ANY(${orphanIds})`;
  // Then delete orphan users
  await sql`DELETE FROM public.users WHERE id = ANY(${orphanIds})`;
  console.log("Orphans removed.");
}

// 2. Apply the cascade FK migration
const content = readFileSync("./drizzle/rls/0004_user_cascade.sql", "utf8");
await sql.unsafe(content);
console.log("Cascade FK applied.");

await sql.end();

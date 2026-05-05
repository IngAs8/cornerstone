import postgres from "postgres";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const file = "./drizzle/rls/0003_seed_categories.sql";

console.log(`Applying ${file}...`);
await sql.unsafe(readFileSync(file, "utf8"));

const counts = await sql`
  SELECT type, COUNT(*) as n FROM public.categories
  WHERE household_id IS NULL GROUP BY type
`;
for (const row of counts) console.log(`  ${row.type}: ${row.n} categories`);

await sql.end();

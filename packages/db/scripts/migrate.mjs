// Apply Drizzle migrations directly via postgres-js — avoids the interactive
// confirmation prompt that drizzle-kit push requires.
import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });
const migrationsDir = "./drizzle";
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Found ${files.length} migration file(s):\n  ${files.join("\n  ")}\n`);

for (const file of files) {
  console.log(`Applying ${file}...`);
  const content = readFileSync(join(migrationsDir, file), "utf8");
  // Drizzle uses `--> statement-breakpoint` to separate statements
  const statements = content
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt);
    } catch (err) {
      // Allow idempotent re-runs: skip duplicate type / table errors
      const code = err.code;
      if (code === "42P07" || code === "42710") {
        console.log(`  (already exists, skipping)`);
        continue;
      }
      console.error(`Failed: ${stmt.substring(0, 100)}...`);
      throw err;
    }
  }
  console.log(`  ✔ ${file} applied`);
}

console.log("\nAll migrations applied successfully.");
await sql.end();

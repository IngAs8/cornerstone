// Apply RLS policies (idempotent — drops + recreates).
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

const file = "./drizzle/rls/0001_rls_policies.sql";
console.log(`Applying ${file}...\n`);

const content = readFileSync(file, "utf8");

// Split on statement boundaries (semicolons NOT inside strings or function bodies)
// Strategy: detect $$ ... $$ blocks and treat them as single statements.
const statements = [];
let buffer = "";
let inDollarQuote = false;

for (const line of content.split("\n")) {
  // Skip pure comment lines
  const trimmed = line.trim();
  if (trimmed.startsWith("--") || trimmed === "") {
    if (!inDollarQuote) continue;
  }

  // Toggle dollar-quote state
  const dollarCount = (line.match(/\$\$/g) ?? []).length;
  if (dollarCount % 2 === 1) inDollarQuote = !inDollarQuote;

  buffer += line + "\n";

  if (!inDollarQuote && trimmed.endsWith(";")) {
    statements.push(buffer.trim());
    buffer = "";
  }
}

console.log(`Parsed ${statements.length} statements.\n`);

let succeeded = 0;
let skipped = 0;

for (const stmt of statements) {
  if (!stmt) continue;
  const preview = stmt.substring(0, 80).replace(/\s+/g, " ");
  try {
    await sql.unsafe(stmt);
    succeeded++;
    console.log(`  ✔ ${preview}`);
  } catch (err) {
    // 42710 = duplicate object (policy/function already exists)
    // 42P07 = duplicate table
    if (err.code === "42710" || err.code === "42P07") {
      skipped++;
      console.log(`  ⊙ ${preview} (already exists)`);
      continue;
    }
    console.error(`\n✘ FAILED: ${preview}`);
    console.error(`  Code: ${err.code}`);
    console.error(`  Detail: ${err.message}\n`);
    throw err;
  }
}

console.log(`\nDone. ${succeeded} applied, ${skipped} skipped.`);
await sql.end();

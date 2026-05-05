import postgres from "postgres";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env" });
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const content = readFileSync("./drizzle/rls/0005_fix_household_cascade.sql", "utf8");
await sql.unsafe(content);
console.log("FK cascades applied.");
await sql.end();

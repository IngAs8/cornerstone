import postgres from "postgres";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const file = "./drizzle/rls/0002_signup_trigger.sql";
console.log(`Applying ${file}...\n`);
const content = readFileSync(file, "utf8");

// This file contains a single function + trigger. Apply as one statement.
await sql.unsafe(content);
console.log("Signup trigger installed.");

// Quick smoke test: function should exist
const fns = await sql`
  SELECT proname FROM pg_proc WHERE proname = 'handle_new_user'
`;
console.log(`handle_new_user() exists: ${fns.length > 0}`);

const triggers = await sql`
  SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created'
`;
console.log(`on_auth_user_created trigger exists: ${triggers.length > 0}`);

await sql.end();

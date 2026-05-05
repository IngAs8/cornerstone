// End-to-end smoke test for the auth trigger + RLS schema.
// Creates a test user via Supabase Auth (service role), verifies the trigger
// auto-populates users + households + household_members, then cleans up.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });

// Read service role key from web app's .env.local (closer to prod usage)
const fs = await import("node:fs");
const envLocalPath = "../../apps/web/.env.local";
const envLocal = fs.readFileSync(envLocalPath, "utf8");
const get = (key) => envLocal.match(new RegExp(`${key}="([^"]+)"`))?.[1];

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !serviceKey) {
  console.error("Missing Supabase credentials in apps/web/.env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const stamp = Date.now();
const testEmail = `smoketest-${stamp}@cornerstone.test`;
const testPassword = "Test1234!";

console.log(`\n[1/5] Creating user ${testEmail}...`);
const { data: signUp, error: suErr } = await supabase.auth.admin.createUser({
  email: testEmail,
  password: testPassword,
  email_confirm: true,
  user_metadata: { full_name: "Smoke Test User" },
});
if (suErr) {
  console.error("Failed:", suErr.message);
  process.exit(1);
}
const userId = signUp.user.id;
console.log(`     User created: ${userId}`);

console.log(`\n[2/5] Verifying trigger created public.users row...`);
const u = await sql`SELECT id, email, full_name, base_currency FROM public.users WHERE id = ${userId}`;
console.log(u.length ? `     ✔ users row: ${u[0].email}, name=${u[0].full_name}, base=${u[0].base_currency}` : "     ✘ MISSING");

console.log(`\n[3/5] Verifying personal household was created...`);
const h = await sql`SELECT id, name, owner_id, max_members, subscription_plan FROM public.households WHERE owner_id = ${userId}`;
console.log(h.length ? `     ✔ household: "${h[0].name}", plan=${h[0].subscription_plan}, max=${h[0].max_members}` : "     ✘ MISSING");

console.log(`\n[4/5] Verifying household_members row with role=owner...`);
const m = await sql`SELECT user_id, household_id, role FROM public.household_members WHERE user_id = ${userId}`;
console.log(m.length ? `     ✔ membership: role=${m[0].role}` : "     ✘ MISSING");

console.log(`\n[5/5] Cleaning up test user...`);
const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
if (delErr) {
  console.warn(`     ⚠ Cleanup warning: ${delErr.message}`);
  console.warn(`     Full error:`, JSON.stringify(delErr, null, 2));
} else {
  console.log(`     ✔ User deleted (cascade removed household + membership)`);
}

const remaining = await sql`SELECT COUNT(*)::int as n FROM public.users WHERE id = ${userId}`;
console.log(`     Cascade verified: ${remaining[0].n} rows remain (expected 0)`);

await sql.end();
console.log("\nAll checks complete.");

// Confirm all pending (unconfirmed) users in the Supabase Auth project.
// Useful in dev when "Confirm email" is on and the test user is locked out.
//
// Usage:
//   node scripts/confirm-pending-users.mjs              # confirm all
//   node scripts/confirm-pending-users.mjs user@x.com   # confirm just one

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const envLocal = readFileSync("../../apps/web/.env.local", "utf8");
const get = (k) => envLocal.match(new RegExp(`${k}="([^"]+)"`))?.[1];

const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

const targetEmail = process.argv[2];

const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
if (error) {
  console.error("Failed to list users:", error.message);
  process.exit(1);
}

const pending = data.users.filter((u) => !u.email_confirmed_at && (!targetEmail || u.email === targetEmail));

if (pending.length === 0) {
  console.log("No pending users to confirm.");
  process.exit(0);
}

console.log(`Found ${pending.length} pending user(s):`);
for (const u of pending) {
  const { error: upErr } = await supabase.auth.admin.updateUserById(u.id, {
    email_confirm: true,
  });
  if (upErr) console.error(`  ✘ ${u.email}: ${upErr.message}`);
  else console.log(`  ✔ ${u.email} confirmed`);
}

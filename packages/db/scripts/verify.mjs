import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const tables = await sql`
  SELECT table_name,
         (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_schema='public' AND table_name=t.table_name) as cols,
         (SELECT relrowsecurity FROM pg_class
          WHERE oid = (quote_ident('public') || '.' || quote_ident(t.table_name))::regclass) as rls_enabled
  FROM information_schema.tables t
  WHERE table_schema = 'public'
  ORDER BY table_name
`;

console.log(`Found ${tables.length} tables in public schema:\n`);
console.log("Table".padEnd(28) + "Cols".padEnd(8) + "RLS");
console.log("─".repeat(45));
for (const t of tables) {
  console.log(
    t.table_name.padEnd(28) +
      String(t.cols).padEnd(8) +
      (t.rls_enabled ? "ON" : "OFF")
  );
}

const policies = await sql`
  SELECT COUNT(*) as count FROM pg_policies WHERE schemaname = 'public'
`;
console.log(`\nTotal policies active: ${policies[0].count}`);

await sql.end();

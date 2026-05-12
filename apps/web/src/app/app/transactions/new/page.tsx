import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "../transaction-form";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users").select("base_currency").eq("id", user.id).single();

  const { data: membership } = await supabase
    .from("household_members").select("household_id").eq("user_id", user.id).single();

  const [{ data: categories }, { data: accounts }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, type, bucket")
      .order("type").order("sort_order"),
    membership
      ? supabase
          .from("accounts")
          .select("id, name, type, currency, current_balance")
          .eq("household_id", membership.household_id)
          .eq("is_active", true)
          .order("name")
      : { data: [] },
  ]);

  return (
    <main className="flex-1 px-8 py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link href="/app/transactions" className="text-sm text-foreground/60 hover:text-foreground">
            ← Volver a transacciones
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Nueva transacción</h1>
        <p className="text-foreground/60 mb-6 text-sm">
          Base: {profile?.base_currency ?? "USD"}
        </p>
        <TransactionForm
          baseCurrency={profile?.base_currency ?? "USD"}
          categories={categories ?? []}
          accounts={accounts ?? []}
        />
      </div>
    </main>
  );
}

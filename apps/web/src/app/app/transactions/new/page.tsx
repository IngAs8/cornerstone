import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "../transaction-form";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users")
    .select("base_currency")
    .eq("id", user.id)
    .single();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type, bucket")
    .or(`household_id.is.null,household_id.eq.(${user.id})`)
    .order("type", { ascending: true })
    .order("sort_order", { ascending: true });

  return (
    <main className="flex-1 px-8 py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link
            href="/app/transactions"
            className="text-sm text-foreground/60 hover:text-foreground"
          >
            ← Back to transactions
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          New transaction
        </h1>
        <p className="text-foreground/60 mb-6 text-sm">
          Recorded in {profile?.base_currency ?? "USD"} as your base.
        </p>
        <TransactionForm
          baseCurrency={profile?.base_currency ?? "USD"}
          categories={categories ?? []}
        />
      </div>
    </main>
  );
}

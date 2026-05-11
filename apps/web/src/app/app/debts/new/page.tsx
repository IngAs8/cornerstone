import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DebtForm } from "../debt-form";

export default async function NewDebtPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users")
    .select("base_currency")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex-1 px-8 py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link href="/app/debts" className="text-sm text-foreground/60 hover:text-foreground">
            ← Back to debts
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Add a debt</h1>
        <p className="text-foreground/60 mb-6 text-sm">
          Track it, plan it, eliminate it.
        </p>
        <DebtForm baseCurrency={profile?.base_currency ?? "USD"} />
      </div>
    </main>
  );
}

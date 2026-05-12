import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DebtForm } from "../../debt-form";

export default async function EditDebtPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users")
    .select("base_currency")
    .eq("id", user.id)
    .single();

  const { data: debt } = await supabase
    .from("debts")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!debt) notFound();

  return (
    <main className="flex-1 px-8 py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link href={`/app/debts/${id}`} className="text-sm text-foreground/60 hover:text-foreground">
            ← Back to debt
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Edit debt</h1>
        <p className="text-foreground/60 mb-6 text-sm">{debt.name}</p>
        <DebtForm
          baseCurrency={profile?.base_currency ?? "USD"}
          initial={{
            id: debt.id,
            name: debt.name,
            type: debt.type,
            currentBalance: Number(debt.current_balance),
            currency: debt.currency,
            annualRate: Number(debt.annual_rate),
            rateType: debt.rate_type ?? "fixed",
            minimumPayment: Number(debt.minimum_payment),
            startDate: debt.start_date ?? new Date().toISOString().slice(0, 10),
            termMonths: debt.term_months ? Number(debt.term_months) : null,
            lender: debt.lender ?? null,
          }}
        />
      </div>
    </main>
  );
}

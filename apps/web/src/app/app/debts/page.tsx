import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { StrategySimulator } from "./strategy-simulator";
import { CloseDebtButton } from "./close-debt-button";
import type { Debt } from "@cornerstone/core";

const DEBT_TYPE_LABEL: Record<string, string> = {
  credit_card: "Credit Card",
  personal_loan: "Personal Loan",
  mortgage: "Mortgage",
  auto_loan: "Auto Loan",
  student_loan: "Student Loan",
  short_term: "Short-term",
  long_term: "Long-term",
  other: "Other",
};

export default async function DebtsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users")
    .select("base_currency")
    .eq("id", user.id)
    .single();

  const currency = profile?.base_currency ?? "USD";

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  const { data: rawDebts } = membership
    ? await supabase
        .from("debts")
        .select("id, name, type, current_balance, currency, annual_rate, minimum_payment, term_months, lender, start_date")
        .eq("household_id", membership.household_id)
        .eq("is_active", true)
        .order("current_balance", { ascending: false })
    : { data: null };

  const debts = rawDebts ?? [];
  const totalDebt = debts.reduce((s, d) => s + Number(d.current_balance), 0);
  const totalMinPayments = debts.reduce((s, d) => s + Number(d.minimum_payment), 0);

  // Shape debts for packages/core
  const coreDebts: Debt[] = debts.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type as Debt["type"],
    currentBalance: Number(d.current_balance),
    currency: d.currency,
    annualRate: Number(d.annual_rate),
    rateType: "fixed" as const,
    minimumPayment: Number(d.minimum_payment),
    paymentFrequency: "monthly" as const,
    termMonths: d.term_months ? Number(d.term_months) : undefined,
  }));

  return (
    <main className="flex-1 px-8 py-10 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Debts</h1>
          <p className="text-foreground/60 text-sm mt-0.5">
            Track and eliminate your liabilities.
          </p>
        </div>
        <Link href="/app/debts/new">
          <Button>+ Add debt</Button>
        </Link>
      </div>

      {debts.length === 0 ? (
        <div className="text-center py-20 text-foreground/50">
          <p className="text-lg font-medium mb-2">No active debts</p>
          <p className="text-sm mb-6">Add a debt to start tracking your payoff progress.</p>
          <Link href="/app/debts/new">
            <Button>Add your first debt</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="rounded-lg border border-foreground/10 p-4">
              <p className="text-xs uppercase tracking-widest text-foreground/40 mb-1">Total Debt</p>
              <p className="text-xl font-semibold text-red-400">
                {formatMoney(totalDebt, currency)}
              </p>
            </div>
            <div className="rounded-lg border border-foreground/10 p-4">
              <p className="text-xs uppercase tracking-widest text-foreground/40 mb-1">Min. Monthly Payments</p>
              <p className="text-xl font-semibold">{formatMoney(totalMinPayments, currency)}</p>
            </div>
          </div>

          {/* Debt cards */}
          <div className="space-y-3 mb-10">
            {debts.map((debt) => {
              const balance = Number(debt.current_balance);
              const rate = Number(debt.annual_rate) * 100;
              const progress = 0; // could track original vs current later

              return (
                <div
                  key={debt.id}
                  className="rounded-lg border border-foreground/10 p-4 hover:border-foreground/20 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Link
                        href={`/app/debts/${debt.id}`}
                        className="font-medium hover:underline"
                      >
                        {debt.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-foreground/40">
                          {DEBT_TYPE_LABEL[debt.type] ?? debt.type}
                        </span>
                        {debt.lender && (
                          <>
                            <span className="text-foreground/20">·</span>
                            <span className="text-xs text-foreground/40">{debt.lender}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-red-400">
                        {formatMoney(balance, debt.currency)}
                      </p>
                      <p className="text-xs text-foreground/40">{rate.toFixed(1)}% APR</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-foreground/50">
                    <span>Min: {formatMoney(Number(debt.minimum_payment), debt.currency)}/mo</span>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/app/debts/${debt.id}`}
                        className="hover:text-foreground transition-colors"
                      >
                        Details →
                      </Link>
                      <CloseDebtButton id={debt.id} name={debt.name} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Strategy simulator */}
          <div className="rounded-lg border border-foreground/10 p-6">
            <h2 className="text-base font-semibold mb-1">Payoff Strategy Simulator</h2>
            <p className="text-sm text-foreground/50 mb-6">
              Compare Avalanche vs. Snowball and find your optimal payoff plan.
            </p>
            <StrategySimulator debts={coreDebts} currency={currency} />
          </div>
        </>
      )}
    </main>
  );
}

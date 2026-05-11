import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import {
  calculateAmortizationTable,
  totalInterestPaid,
  totalAmountPaid,
} from "@cornerstone/core";
import type { Debt } from "@cornerstone/core";
import { StrategySimulator } from "../strategy-simulator";

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

export default async function DebtDetailPage({
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

  const currency = profile?.base_currency ?? "USD";

  const { data: debt } = await supabase
    .from("debts")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!debt) notFound();

  const balance = Number(debt.current_balance);
  const annualRate = Number(debt.annual_rate);
  const minPayment = Number(debt.minimum_payment);
  const termMonths = debt.term_months ? Number(debt.term_months) : 360;

  // Calculate amortization table
  let amortRows = calculateAmortizationTable(balance, annualRate, termMonths, {
    paymentAmount: minPayment > 0 ? minPayment : undefined,
  });

  const totalMonths = amortRows.length;
  const totalInterest = totalInterestPaid(amortRows);
  const totalPaid = totalAmountPaid(amortRows);

  // Show first 12 and last 3 rows if table is long
  const SHOW_FIRST = 12;
  const SHOW_LAST = 3;
  const truncated = totalMonths > SHOW_FIRST + SHOW_LAST;
  const displayRows = truncated
    ? [
        ...amortRows.slice(0, SHOW_FIRST),
        ...amortRows.slice(-SHOW_LAST),
      ]
    : amortRows;

  // Fetch recent payments
  const { data: payments } = await supabase
    .from("debt_payments")
    .select("id, amount, date, principal_portion, interest_portion")
    .eq("debt_id", id)
    .order("date", { ascending: false })
    .limit(10);

  // Shape for simulator (single debt)
  const coreDebt: Debt = {
    id: debt.id,
    name: debt.name,
    type: debt.type as Debt["type"],
    currentBalance: balance,
    currency: debt.currency,
    annualRate,
    rateType: "fixed",
    minimumPayment: minPayment,
    paymentFrequency: "monthly",
    termMonths: debt.term_months ? Number(debt.term_months) : undefined,
  };

  return (
    <main className="flex-1 px-8 py-10 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <Link href="/app/debts" className="text-sm text-foreground/60 hover:text-foreground">
          ← Back to debts
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{debt.name}</h1>
          <p className="text-foreground/50 text-sm mt-0.5">
            {DEBT_TYPE_LABEL[debt.type] ?? debt.type}
            {debt.lender ? ` · ${debt.lender}` : ""}
          </p>
        </div>
        <Link
          href={`/app/debts/${id}/edit`}
          className="text-sm text-foreground/50 hover:text-foreground transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <Stat
          label="Current Balance"
          value={formatMoney(balance, debt.currency)}
          valueClass="text-red-400"
        />
        <Stat
          label="Annual Rate"
          value={`${(annualRate * 100).toFixed(2)}%`}
        />
        <Stat
          label="Monthly Payment"
          value={formatMoney(minPayment, debt.currency)}
        />
        <Stat
          label="Payoff in"
          value={
            totalMonths >= 12
              ? `${Math.floor(totalMonths / 12)}y ${totalMonths % 12}m`
              : `${totalMonths}m`
          }
        />
      </div>

      {/* Amortization table */}
      <div className="mb-10">
        <h2 className="text-base font-semibold mb-1">Amortization Schedule</h2>
        <p className="text-sm text-foreground/50 mb-4">
          Total interest: {formatMoney(totalInterest, debt.currency)} ·
          Total paid: {formatMoney(totalPaid, debt.currency)}
        </p>

        <div className="rounded-lg border border-foreground/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 text-left">
                <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-foreground/40 font-medium">Mo.</th>
                <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-foreground/40 font-medium text-right">Payment</th>
                <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-foreground/40 font-medium text-right">Principal</th>
                <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-foreground/40 font-medium text-right">Interest</th>
                <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-foreground/40 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => {
                const isGap = truncated && i === SHOW_FIRST;
                return (
                  <>
                    {isGap && (
                      <tr key="gap" className="bg-foreground/3">
                        <td
                          colSpan={5}
                          className="px-4 py-2 text-xs text-center text-foreground/30"
                        >
                          ··· {totalMonths - SHOW_FIRST - SHOW_LAST} months omitted ···
                        </td>
                      </tr>
                    )}
                    <tr
                      key={row.month}
                      className="border-t border-foreground/5 hover:bg-foreground/3 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-foreground/50">{row.month}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatMoney(row.payment, debt.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-emerald-400">
                        {formatMoney(row.principal, debt.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-red-400/70">
                        {formatMoney(row.interest, debt.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                        {formatMoney(row.balance, debt.currency)}
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extra payment simulator (single debt) */}
      <div className="rounded-lg border border-foreground/10 p-6 mb-10">
        <h2 className="text-base font-semibold mb-1">Extra Payment Simulator</h2>
        <p className="text-sm text-foreground/50 mb-6">
          See how extra payments reduce your payoff time and interest.
        </p>
        <StrategySimulator debts={[coreDebt]} currency={currency} />
      </div>

      {/* Payment history */}
      {payments && payments.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-4">Payment History</h2>
          <div className="rounded-lg border border-foreground/10 divide-y divide-foreground/5">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-foreground/50">{p.date}</span>
                <div className="flex gap-6 text-right">
                  <span className="text-foreground/40 text-xs">
                    P: {formatMoney(Number(p.principal_portion ?? 0), debt.currency)}
                  </span>
                  <span className="text-foreground/40 text-xs">
                    I: {formatMoney(Number(p.interest_portion ?? 0), debt.currency)}
                  </span>
                  <span className="font-medium">{formatMoney(Number(p.amount), debt.currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-foreground/10 p-4">
      <p className="text-xs uppercase tracking-widest text-foreground/40 mb-1">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

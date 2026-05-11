import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { AccountsClient } from "./accounts-client";

const TYPE_LABEL: Record<string, string> = {
  checking: "Corriente",
  savings: "Ahorros",
  credit_card: "Tarjeta de crédito",
  cash: "Efectivo",
  other: "Otra",
};

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users").select("base_currency").eq("id", user.id).single();
  const currency = profile?.base_currency ?? "USD";

  const { data: membership } = await supabase
    .from("household_members").select("household_id").eq("user_id", user.id).single();

  const [{ data: banks }, { data: accounts }, { data: recurring }] = await Promise.all([
    membership
      ? supabase.from("banks").select("id, name, color").eq("household_id", membership.household_id).order("name")
      : { data: null },
    membership
      ? supabase.from("accounts")
          .select("id, bank_id, name, type, currency, current_balance, credit_limit, payment_due_day, minimum_payment, is_active")
          .eq("household_id", membership.household_id)
          .eq("is_active", true)
          .order("type").order("name")
      : { data: null },
    membership
      ? supabase.from("recurring_payments")
          .select("id, name, amount, currency, frequency, next_date, account_id")
          .eq("household_id", membership.household_id)
          .eq("is_active", true)
          .order("next_date")
      : { data: null },
  ]);

  const bankList = banks ?? [];
  const accountList = accounts ?? [];
  const recurringList = recurring ?? [];

  // Summary
  const totalAssets = accountList
    .filter((a) => a.type !== "credit_card")
    .reduce((s, a) => s + Number(a.current_balance), 0);

  const totalDebt = accountList
    .filter((a) => a.type === "credit_card")
    .reduce((s, a) => s + Number(a.current_balance), 0);

  // Group accounts by bank
  const grouped = bankList.map((bank) => ({
    bank,
    accounts: accountList.filter((a) => a.bank_id === bank.id),
  }));
  const ungrouped = accountList.filter((a) => !a.bank_id);

  // Next 7 days payments
  const today = new Date();
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = recurringList.filter((r) => {
    const d = new Date(r.next_date);
    return d >= today && d <= in7Days;
  });

  return (
    <main className="flex-1 px-8 py-10 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cuentas</h1>
          <p className="text-foreground/60 text-sm mt-0.5">Bancos, tarjetas y pagos recurrentes.</p>
        </div>
        <Link href="/app/accounts/new">
          <Button>+ Nueva cuenta</Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="rounded-lg border border-foreground/10 p-4">
          <p className="text-xs uppercase tracking-widest text-foreground/40 mb-1">Total activos</p>
          <p className="text-xl font-semibold text-emerald-400">{formatMoney(totalAssets, currency)}</p>
        </div>
        <div className="rounded-lg border border-foreground/10 p-4">
          <p className="text-xs uppercase tracking-widest text-foreground/40 mb-1">Deuda tarjetas</p>
          <p className="text-xl font-semibold text-red-400">{formatMoney(totalDebt, currency)}</p>
        </div>
      </div>

      {/* Upcoming payments alert */}
      {upcoming.length > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm font-medium text-yellow-400 mb-2">⚠ Próximos 7 días</p>
          <div className="space-y-1">
            {upcoming.map((r) => (
              <div key={r.id} className="flex justify-between text-sm">
                <span>{r.name}</span>
                <span className="text-foreground/60">{formatMoney(Number(r.amount), r.currency)} · {r.next_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AccountsClient
        bankList={bankList}
        grouped={grouped}
        ungrouped={ungrouped}
        recurringList={recurringList}
        accountList={accountList}
        currency={currency}
        typeLabel={TYPE_LABEL}
      />
    </main>
  );
}

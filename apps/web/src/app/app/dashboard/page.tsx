import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDate } from "@/lib/format";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const today = new Date();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().split("T")[0]!;
  const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).toISOString().split("T")[0]!;
  const sevenDaysLater = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 7)).toISOString().split("T")[0]!;
  const todayStr = today.toISOString().split("T")[0]!;

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  const [
    { data: profile },
    { data: txThisMonth },
    { data: recent },
    { data: accounts },
    { data: upcoming },
  ] = await Promise.all([
    supabase.from("users").select("full_name, base_currency").eq("id", user.id).single(),
    supabase
      .from("transactions")
      .select("id, type, amount, currency, amount_base, description, date, category:categories(name, color)")
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .is("deleted_at", null)
      .order("date", { ascending: false }),
    supabase
      .from("transactions")
      .select("id, type, amount, currency, description, date, category:categories(name, color)")
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    membership
      ? supabase.from("accounts").select("type, current_balance").eq("household_id", membership.household_id).eq("is_active", true)
      : Promise.resolve({ data: null }),
    membership
      ? supabase.from("recurring_payments")
          .select("id, name, amount, currency, next_date, frequency")
          .eq("household_id", membership.household_id)
          .eq("is_active", true)
          .gte("next_date", todayStr)
          .lte("next_date", sevenDaysLater)
          .order("next_date", { ascending: true })
      : Promise.resolve({ data: null }),
  ]);

  const baseCurrency = profile?.base_currency ?? "USD";
  const fullName =
    profile?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "amigo";

  type TxRow = {
    id: string; type: string; amount: string; currency: string;
    amount_base: string; description: string | null; date: string;
    category: { name: string; color: string | null } | null;
  };
  const txList = (txThisMonth ?? []).map((t: unknown) => {
    const r = t as { id: string; type: string; amount: string; currency: string; amount_base: string; description: string | null; date: string; category: { name: string; color: string | null }[] | null };
    return { ...r, category: Array.isArray(r.category) ? (r.category[0] ?? null) : r.category } as TxRow;
  });

  const monthlyIncome = txList.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount_base), 0);
  const monthlyExpenses = txList.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount_base), 0);
  const remaining = monthlyIncome - monthlyExpenses;

  const totalAssets = (accounts ?? []).filter((a) => a.type !== "credit_card").reduce((s, a) => s + Number(a.current_balance), 0);
  const totalCreditDebt = (accounts ?? []).filter((a) => a.type === "credit_card").reduce((s, a) => s + Number(a.current_balance), 0);
  const netWorth = totalAssets - totalCreditDebt;
  const hasAccounts = (accounts ?? []).length > 0;

  // Category breakdown for chart
  const categoryMap = new Map<string, { name: string; color: string; amount: number }>();
  for (const tx of txList) {
    if (tx.type !== "expense") continue;
    const key = tx.category?.name ?? "Sin categoría";
    const existing = categoryMap.get(key);
    if (existing) {
      existing.amount += Number(tx.amount_base);
    } else {
      categoryMap.set(key, { name: key, color: tx.category?.color ?? "", amount: Number(tx.amount_base) });
    }
  }
  const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount);

  // Shape transactions for client component
  const toTxSummary = (tx: typeof txList[0]) => ({
    id: tx.id,
    type: tx.type as "income" | "expense" | "transfer",
    amount: Number(tx.amount),
    currency: tx.currency,
    description: tx.description,
    date: tx.date,
    categoryName: tx.category?.name ?? null,
  });

  const incomeTxs = txList.filter((t) => t.type === "income").map(toTxSummary);
  const expenseTxs = txList.filter((t) => t.type === "expense").map(toTxSummary);

  const recentList = (recent ?? []).map((t: unknown) => {
    const r = t as { id: string; type: string; amount: string; currency: string; description: string | null; date: string; category: { name: string; color: string | null }[] | null };
    const cat = Array.isArray(r.category) ? (r.category[0] ?? null) : r.category;
    return { id: r.id, type: r.type as "income"|"expense"|"transfer", amount: Number(r.amount), currency: r.currency, description: r.description, date: r.date, categoryName: cat?.name ?? null };
  });

  return (
    <main className="flex-1 px-8 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          Hola, {fullName} 👋
        </h1>
        <p className="text-foreground/60 mb-10">
          Resumen financiero · {baseCurrency}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-6">
            <DashboardClient
              baseCurrency={baseCurrency}
              monthlyIncome={monthlyIncome}
              monthlyExpenses={monthlyExpenses}
              remaining={remaining}
              netWorth={netWorth}
              hasAccounts={hasAccounts}
              incomeTxs={incomeTxs}
              expenseTxs={expenseTxs}
              categoryBreakdown={categoryBreakdown}
              recent={recentList}
            />
          </div>

          {/* Right: sidebar */}
          <div className="space-y-4">
            {upcoming && upcoming.length > 0 && (
              <Card className="p-6">
                <h2 className="font-semibold mb-3">Próximos pagos</h2>
                <ul className="space-y-2">
                  {(upcoming as Array<{ id: string; name: string; amount: string; currency: string; next_date: string }>).map((r) => (
                    <li key={r.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-foreground/50">{formatDate(r.next_date)}</div>
                      </div>
                      <div className="font-medium tabular-nums">{formatMoney(Number(r.amount), r.currency)}</div>
                    </li>
                  ))}
                </ul>
                <Link href="/app/accounts" className="block mt-3 text-xs text-foreground/40 hover:text-foreground">
                  Administrar pagos →
                </Link>
              </Card>
            )}

            <Card className="p-6">
              <h2 className="font-semibold mb-3">Acciones rápidas</h2>
              <ul className="space-y-2 text-sm">
                {[
                  { href: "/app/transactions/new", label: "Agregar transacción" },
                  { href: "/app/accounts", label: "Cuentas" },
                  { href: "/app/debts", label: "Deudas" },
                  { href: "/app/investments", label: "Inversiones" },
                  { href: "/app/advisor", label: "Asesor IA" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="flex items-center justify-between hover:text-foreground transition-colors text-foreground/70">
                      <span>{item.label}</span>
                      <span>→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

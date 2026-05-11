import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/format";

interface RecentTx {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: string;
  currency: string;
  amount_base: string;
  base_currency: string;
  description: string | null;
  date: string;
  category: { name: string; color: string | null } | null;
}

interface AccountRow {
  type: string;
  current_balance: string;
}

interface RecurringRow {
  id: string;
  name: string;
  amount: string;
  currency: string;
  next_date: string;
  frequency: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const t = await getTranslations("dashboard");

  // Fetch profile + this month's totals in parallel
  const today = new Date();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0))
    .toISOString()
    .split("T")[0];
  const sevenDaysLater = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 7))
    .toISOString()
    .split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  // Get household membership for accounts/recurring queries
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  const [{ data: profile }, { data: txThisMonth }, { data: recent }, { data: accounts }, { data: upcoming }] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, base_currency, locale")
      .eq("id", user.id)
      .single<{ full_name: string | null; base_currency: string; locale: string }>(),
    supabase
      .from("transactions")
      .select("type, amount_base")
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .is("deleted_at", null)
      .returns<{ type: "income" | "expense" | "transfer"; amount_base: string }[]>(),
    supabase
      .from("transactions")
      .select(
        "id, type, amount, currency, amount_base, base_currency, description, date, category:categories(name, color)"
      )
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<RecentTx[]>(),
    membership
      ? supabase
          .from("accounts")
          .select("type, current_balance")
          .eq("household_id", membership.household_id)
          .eq("is_active", true)
          .returns<AccountRow[]>()
      : Promise.resolve({ data: null, error: null }),
    membership
      ? supabase
          .from("recurring_payments")
          .select("id, name, amount, currency, next_date, frequency")
          .eq("household_id", membership.household_id)
          .eq("is_active", true)
          .gte("next_date", todayStr)
          .lte("next_date", sevenDaysLater)
          .order("next_date", { ascending: true })
          .returns<RecurringRow[]>()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const baseCurrency = profile?.base_currency ?? "USD";
  const fullName =
    profile?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "friend";

  const monthlyIncome =
    txThisMonth
      ?.filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + Number(tx.amount_base), 0) ?? 0;

  const monthlyExpenses =
    txThisMonth
      ?.filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + Number(tx.amount_base), 0) ?? 0;

  const remaining = monthlyIncome - monthlyExpenses;

  // Net worth = non-credit assets - credit card balances
  const totalAssets = (accounts ?? [])
    .filter((a) => a.type !== "credit_card")
    .reduce((s, a) => s + Number(a.current_balance), 0);
  const totalCreditDebt = (accounts ?? [])
    .filter((a) => a.type === "credit_card")
    .reduce((s, a) => s + Number(a.current_balance), 0);
  const netWorth = totalAssets - totalCreditDebt;
  const hasAccounts = (accounts ?? []).length > 0;

  return (
    <main className="flex-1 px-8 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          {t("welcome", { name: fullName })}
        </h1>
        <p className="text-foreground/60 mb-10">
          {t("subtitle", { currency: baseCurrency })}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <SummaryCard title={t("monthlyIncome")} value={formatMoney(monthlyIncome, baseCurrency)} accent="emerald" />
          <SummaryCard title={t("monthlyExpenses")} value={formatMoney(monthlyExpenses, baseCurrency)} accent="red" />
          <SummaryCard title={t("remaining")} value={formatMoney(remaining, baseCurrency)} accent={remaining >= 0 ? "emerald" : "red"} />
          <SummaryCard
            title={t("netWorth")}
            value={hasAccounts ? formatMoney(netWorth, baseCurrency) : "—"}
            accent={hasAccounts ? (netWorth >= 0 ? "emerald" : "red") : undefined}
            hint={hasAccounts ? undefined : t("connectAccounts")}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{t("recentActivity")}</h2>
              <Link href="/app/transactions">
                <Button variant="ghost" size="sm">
                  {t("viewAll")} →
                </Button>
              </Link>
            </div>
            {!recent || recent.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-foreground/60 mb-4 text-sm">
                  {t("noActivity")}
                </p>
                <Link href="/app/transactions/new">
                  <Button>+ {t("addTransaction")}</Button>
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-foreground/10">
                {recent.map((tx) => {
                  const sign = tx.type === "expense" ? "-" : "+";
                  const cls = tx.type === "expense" ? "text-red-600" : "text-emerald-600";
                  return (
                    <li key={tx.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {tx.category?.color && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tx.category.color }}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {tx.category?.name ?? t("uncategorized")}
                          </div>
                          <div className="text-xs text-foreground/60 truncate">
                            {tx.description ?? formatDate(tx.date)}
                          </div>
                        </div>
                      </div>
                      <div className={`text-sm font-medium tabular-nums ${cls}`}>
                        {sign}
                        {formatMoney(Number(tx.amount), tx.currency)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <div className="space-y-4">
            {upcoming && upcoming.length > 0 && (
              <Card className="p-6">
                <h2 className="font-semibold mb-3">{t("upcomingPayments")}</h2>
                <ul className="space-y-2">
                  {upcoming.map((r) => (
                    <li key={r.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-foreground/50">{formatDate(r.next_date)}</div>
                      </div>
                      <div className="font-medium tabular-nums text-foreground/80">
                        {formatMoney(Number(r.amount), r.currency)}
                      </div>
                    </li>
                  ))}
                </ul>
                <Link href="/app/accounts" className="block mt-3 text-xs text-foreground/40 hover:text-foreground">
                  {t("managePayments")} →
                </Link>
              </Card>
            )}

            <Card className="p-6">
              <h2 className="font-semibold mb-2">{t("quickActions")}</h2>
              <ul className="space-y-2 text-sm">
                <ChecklistItem href="/app/transactions/new" label={t("addTransaction")} />
                <ChecklistItem href="/app/accounts" label={t("manageAccounts")} />
                <ChecklistItem href="/app/debts" label={t("manageDebts")} />
                <ChecklistItem href="/app/investments" label={t("trackInvestments")} />
                <ChecklistItem href="/app/advisor" label={t("askAdvisor")} />
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  accent,
  hint,
}: {
  title: string;
  value: string;
  accent?: "emerald" | "red";
  hint?: string;
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-600"
      : accent === "red"
        ? "text-red-600"
        : "text-foreground";
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wider text-foreground/50 mb-2">
        {title}
      </div>
      <div className={`text-2xl font-semibold tracking-tight tabular-nums ${accentClass}`}>
        {value}
      </div>
      {hint && <div className="text-xs text-foreground/40 mt-1">{hint}</div>}
    </Card>
  );
}

function ChecklistItem({
  href,
  label,
  disabled,
}: {
  href: string;
  label: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <li className="flex items-center gap-2 text-foreground/40 cursor-not-allowed">
        <span className="w-4 h-4 rounded-full border border-foreground/20" />
        <span className="line-through-disabled">{label}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-foreground/40">
          Soon
        </span>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 hover:text-foreground transition-colors"
      >
        <span className="w-4 h-4 rounded-full border border-foreground/30" />
        <span>{label}</span>
        <span className="ml-auto">→</span>
      </Link>
    </li>
  );
}

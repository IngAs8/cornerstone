import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatRelativeMonth } from "@/lib/format";
import { BudgetItemRow } from "./budget-item-row";

type Bucket = "needs" | "wants" | "savings";
const BUCKETS: Bucket[] = ["needs", "wants", "savings"];
const BUCKET_LABEL: Record<Bucket, string> = {
  needs: "Necesidades",
  wants: "Deseos",
  savings: "Ahorros",
};

interface BudgetItemDB {
  id: string;
  allocated_amount: string;
  category_id: string;
  categories: {
    name: string;
    bucket: string | null;
    color: string | null;
    type: string;
  } | null;
}

interface SpendingRow {
  category_id: string;
  total: number;
}

export default async function BudgetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users")
    .select("base_currency")
    .eq("id", user.id)
    .single();

  const currency = profile?.base_currency ?? "USD";

  // Current month boundaries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // Get household
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/app/onboarding");

  // Get budget for this month
  const { data: budget } = await supabase
    .from("budgets")
    .select("id, month, methodology, total_income_expected, currency")
    .eq("household_id", membership.household_id)
    .gte("month", monthStart)
    .lte("month", monthEnd)
    .order("month", { ascending: false })
    .limit(1)
    .single();

  // Get budget items with categories
  const { data: rawItems } = budget
    ? await supabase
        .from("budget_items")
        .select("id, allocated_amount, category_id, categories(name, bucket, color, type)")
        .eq("budget_id", budget.id)
    : { data: null };

  const items = (rawItems ?? []) as unknown as BudgetItemDB[];

  // Get actual spending per category for the month
  const { data: txRows } = await supabase
    .from("transactions")
    .select("category_id, amount_base")
    .eq("household_id", membership.household_id)
    .eq("type", "expense")
    .gte("date", monthStart)
    .lte("date", monthEnd)
    .is("deleted_at", null);

  // Aggregate spending by category
  const spendingMap = new Map<string, number>();
  for (const tx of txRows ?? []) {
    if (!tx.category_id) continue;
    spendingMap.set(
      tx.category_id,
      (spendingMap.get(tx.category_id) ?? 0) + Number(tx.amount_base)
    );
  }

  // Total actual income for the month
  const { data: incomeTxRows } = await supabase
    .from("transactions")
    .select("amount_base")
    .eq("household_id", membership.household_id)
    .eq("type", "income")
    .gte("date", monthStart)
    .lte("date", monthEnd)
    .is("deleted_at", null);

  const actualIncome = (incomeTxRows ?? []).reduce(
    (sum, tx) => sum + Number(tx.amount_base),
    0
  );

  const expectedIncome = Number(budget?.total_income_expected ?? 0);
  const totalAllocated = items.reduce((s, i) => s + Number(i.allocated_amount), 0);
  const totalSpent = Array.from(spendingMap.values()).reduce((s, v) => s + v, 0);
  const unallocated = expectedIncome - totalAllocated;

  // Group items by bucket
  const byBucket = new Map<string, BudgetItemDB[]>();
  for (const item of items) {
    const bucket = item.categories?.bucket ?? "other";
    if (!byBucket.has(bucket)) byBucket.set(bucket, []);
    byBucket.get(bucket)!.push(item);
  }

  // Items with no bucket (income categories or uncategorized)
  const uncategorized = items.filter(
    (i) => !i.categories?.bucket || !BUCKETS.includes(i.categories.bucket as Bucket)
  );

  return (
    <main className="flex-1 px-8 py-10 max-w-3xl mx-auto w-full">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Presupuesto</h1>
          <p className="text-foreground/60 text-sm mt-0.5">
            {budget
              ? formatRelativeMonth(budget.month)
              : "Sin presupuesto este mes"}
          </p>
        </div>
      </div>

      {!budget ? (
        <div className="text-center py-20 text-foreground/50">
          <p className="text-lg font-medium mb-2">Sin presupuesto este mes</p>
          <p className="text-sm">Completa el onboarding para crear tu primer presupuesto.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="rounded-lg border border-foreground/10 p-4">
              <p className="text-xs uppercase tracking-widest text-foreground/40 mb-1">
                Ingreso esperado
              </p>
              <p className="text-xl font-semibold text-emerald-400">
                {formatMoney(expectedIncome, currency)}
              </p>
            </div>
            <div className="rounded-lg border border-foreground/10 p-4">
              <p className="text-xs uppercase tracking-widest text-foreground/40 mb-1">
                Total asignado
              </p>
              <p className="text-xl font-semibold">
                {formatMoney(totalAllocated, currency)}
              </p>
            </div>
            <div className="rounded-lg border border-foreground/10 p-4">
              <p className="text-xs uppercase tracking-widest text-foreground/40 mb-1">
                Sin asignar
              </p>
              <p
                className={`text-xl font-semibold ${
                  unallocated < 0 ? "text-red-400" : "text-foreground"
                }`}
              >
                {formatMoney(unallocated, currency)}
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-xs text-foreground/40">
            <span>Categoría</span>
            <div className="ml-auto flex gap-6">
              <span>Asignado</span>
              <span>Gastado</span>
            </div>
          </div>

          {/* Buckets */}
          {BUCKETS.map((bucket) => {
            const bucketItems = byBucket.get(bucket) ?? [];
            if (bucketItems.length === 0) return null;

            const bucketAllocated = bucketItems.reduce(
              (s, i) => s + Number(i.allocated_amount),
              0
            );
            const bucketSpent = bucketItems.reduce(
              (s, i) => s + (spendingMap.get(i.category_id) ?? 0),
              0
            );
            const bucketPct =
              bucketAllocated > 0
                ? Math.min((bucketSpent / bucketAllocated) * 100, 100)
                : 0;

            return (
              <div key={bucket} className="mb-6">
                {/* Bucket header */}
                <div className="flex items-center justify-between px-4 py-2 mb-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground/40">
                      {BUCKET_LABEL[bucket]}
                    </h2>
                    <span className="text-xs text-foreground/30">
                      {Math.round(bucketPct)}%
                    </span>
                  </div>
                  <div className="flex gap-6 text-xs text-foreground/40">
                    <span>{formatMoney(bucketAllocated, currency)}</span>
                    <span
                      className={
                        bucketSpent > bucketAllocated ? "text-red-400" : ""
                      }
                    >
                      {formatMoney(bucketSpent, currency)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-foreground/10 divide-y divide-foreground/5">
                  {bucketItems.map((item) => (
                    <BudgetItemRow
                      key={item.id}
                      id={item.id}
                      categoryName={item.categories?.name ?? "Sin categoría"}
                      categoryColor={item.categories?.color ?? null}
                      allocated={Number(item.allocated_amount)}
                      spent={spendingMap.get(item.category_id) ?? 0}
                      currency={currency}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Methodology note */}
          {budget.methodology !== "custom" && (
            <p className="text-xs text-foreground/30 text-center mt-4">
              Presupuesto basado en metodología{" "}
              {budget.methodology === "50_30_20" ? "50/30/20" : "70/20/10"} ·
              Clic en cualquier monto para editar
            </p>
          )}
        </>
      )}
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/format";
import { DeleteTransactionButton } from "./delete-button";

interface CategoryRow {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

interface TransactionRow {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: string;
  currency: string;
  amount_base: string;
  base_currency: string;
  description: string | null;
  date: string;
  source: string;
  category: CategoryRow | null;
}

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: rows } = await supabase
    .from("transactions")
    .select(
      "id, type, amount, currency, amount_base, base_currency, description, date, source, category:categories(id, name, color, icon)"
    )
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<TransactionRow[]>();

  const transactions = rows ?? [];

  return (
    <main className="flex-1 px-8 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Transacciones</h1>
            <p className="text-foreground/60 mt-1">
              Registra cada ingreso y gasto, en cualquier moneda.
            </p>
          </div>
          <Link href="/app/transactions/new">
            <Button>+ Nueva transacción</Button>
          </Link>
        </div>

        {transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="rounded-lg border border-foreground/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-foreground/[0.02] text-left text-xs uppercase tracking-wider text-foreground/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium text-right">Monto</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {transactions.map((tx) => {
                  const isExpense = tx.type === "expense";
                  const sign = isExpense ? "-" : "+";
                  const amountStr = `${sign}${formatMoney(Number(tx.amount), tx.currency)}`;
                  const baseStr =
                    tx.currency !== tx.base_currency
                      ? `≈ ${formatMoney(Number(tx.amount_base), tx.base_currency)}`
                      : null;

                  return (
                    <tr key={tx.id} className="hover:bg-foreground/[0.02]">
                      <td className="px-4 py-3 text-foreground/70 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          {tx.category?.color && (
                            <span
                              aria-hidden="true"
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: tx.category.color }}
                            />
                          )}
                          {tx.category?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground/80">
                        {tx.description ?? <span className="text-foreground/40">—</span>}
                        {tx.source === "whatsapp" && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-foreground/10">
                            WA
                          </span>
                        )}
                      </td>
                      <td
                        className={
                          "px-4 py-3 text-right font-medium tabular-nums " +
                          (isExpense ? "text-red-600" : "text-emerald-600")
                        }
                      >
                        {amountStr}
                        {baseStr && (
                          <div className="text-xs font-normal text-foreground/50 mt-0.5">
                            {baseStr}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/app/transactions/${tx.id}/edit`}
                          className="text-foreground/60 hover:text-foreground text-xs px-2 py-1 rounded hover:bg-foreground/5"
                        >
                          Editar
                        </Link>
                        <DeleteTransactionButton id={tx.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-foreground/15 p-12 text-center">
      <h3 className="font-medium mb-1">Sin transacciones aún</h3>
      <p className="text-sm text-foreground/60 mb-6">
        Registra tu primer ingreso o gasto para comenzar.
      </p>
      <Link href="/app/transactions/new">
        <Button>+ Agregar primera transacción</Button>
      </Link>
    </div>
  );
}

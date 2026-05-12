"use client";

import { useState } from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDate } from "@/lib/format";

interface TxSummary {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  description: string | null;
  date: string;
  categoryName: string | null;
}

interface CategorySlice {
  name: string;
  color: string;
  amount: number;
}

interface Props {
  baseCurrency: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  remaining: number;
  netWorth: number;
  hasAccounts: boolean;
  incomeTxs: TxSummary[];
  expenseTxs: TxSummary[];
  categoryBreakdown: CategorySlice[];
  recent: TxSummary[];
}

type ActiveCard = "income" | "expenses" | "remaining" | "networth" | null;

const FALLBACK_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16"];

export function DashboardClient({
  baseCurrency, monthlyIncome, monthlyExpenses, remaining, netWorth,
  hasAccounts, incomeTxs, expenseTxs, categoryBreakdown, recent,
}: Props) {
  const [activeCard, setActiveCard] = useState<ActiveCard>(null);

  function toggleCard(card: ActiveCard) {
    setActiveCard((c) => (c === card ? null : card));
  }

  const pieData = categoryBreakdown.map((c, i) => ({
    name: c.name,
    value: c.amount,
    color: c.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]!,
  }));

  const detailTxs: TxSummary[] =
    activeCard === "income" ? incomeTxs
    : activeCard === "expenses" ? expenseTxs
    : activeCard === "remaining" ? [...incomeTxs, ...expenseTxs].sort((a, b) => b.date.localeCompare(a.date))
    : [];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Ingresos del mes"
          value={formatMoney(monthlyIncome, baseCurrency)}
          accent="emerald"
          active={activeCard === "income"}
          onClick={() => toggleCard("income")}
        />
        <SummaryCard
          title="Gastos del mes"
          value={formatMoney(monthlyExpenses, baseCurrency)}
          accent="red"
          active={activeCard === "expenses"}
          onClick={() => toggleCard("expenses")}
        />
        <SummaryCard
          title="Disponible"
          value={formatMoney(remaining, baseCurrency)}
          accent={remaining >= 0 ? "emerald" : "red"}
          active={activeCard === "remaining"}
          onClick={() => toggleCard("remaining")}
        />
        <SummaryCard
          title="Patrimonio neto"
          value={hasAccounts ? formatMoney(netWorth, baseCurrency) : "—"}
          accent={hasAccounts ? (netWorth >= 0 ? "emerald" : "red") : undefined}
          hint={hasAccounts ? undefined : "Agrega cuentas para ver"}
          active={activeCard === "networth"}
          onClick={hasAccounts ? () => toggleCard("networth") : undefined}
        />
      </div>

      {/* Drill-down panel */}
      {activeCard && activeCard !== "networth" && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">
              {activeCard === "income" ? "Ingresos este mes"
               : activeCard === "expenses" ? "Gastos este mes"
               : "Movimientos este mes"}
            </h3>
            <button onClick={() => setActiveCard(null)} className="text-foreground/40 hover:text-foreground text-xs">✕ Cerrar</button>
          </div>
          {detailTxs.length === 0 ? (
            <p className="text-sm text-foreground/40 py-4 text-center">Sin transacciones este mes</p>
          ) : (
            <ul className="divide-y divide-foreground/10 max-h-64 overflow-y-auto">
              {detailTxs.map((tx) => (
                <li key={tx.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{tx.categoryName ?? "Sin categoría"}</div>
                    <div className="text-xs text-foreground/50">{tx.description ? `${tx.description} · ` : ""}{formatDate(tx.date)}</div>
                  </div>
                  <div className={`tabular-nums font-medium ml-4 shrink-0 ${tx.type === "expense" ? "text-red-400" : "text-emerald-400"}`}>
                    {tx.type === "expense" ? "-" : "+"}{formatMoney(tx.amount, tx.currency)}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/app/transactions" className="block mt-3 text-xs text-foreground/40 hover:text-foreground">
            Ver todas →
          </Link>
        </Card>
      )}

      {/* Expense breakdown chart */}
      {pieData.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold mb-4">¿A dónde va tu dinero este mes?</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-48 h-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value), baseCurrency)}
                    contentStyle={{ background: "var(--background)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-2 w-full">
              {pieData
                .sort((a, b) => b.value - a.value)
                .map((item) => {
                  const pct = monthlyExpenses > 0 ? (item.value / monthlyExpenses) * 100 : 0;
                  return (
                    <li key={item.name} className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm flex-1 truncate">{item.name}</span>
                      <span className="text-xs text-foreground/50 tabular-nums">{pct.toFixed(0)}%</span>
                      <span className="text-sm font-medium tabular-nums">{formatMoney(item.value, baseCurrency)}</span>
                    </li>
                  );
                })}
            </ul>
          </div>
        </Card>
      )}

      {/* Recent transactions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Actividad reciente</h2>
          <Link href="/app/transactions" className="text-xs text-foreground/50 hover:text-foreground">
            Ver todas →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-foreground/60 mb-4 text-sm">Sin actividad aún</p>
            <Link href="/app/transactions/new" className="text-sm text-foreground underline">+ Agregar transacción</Link>
          </div>
        ) : (
          <ul className="divide-y divide-foreground/10">
            {recent.map((tx) => (
              <li key={tx.id} className="py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{tx.categoryName ?? "Sin categoría"}</div>
                  <div className="text-xs text-foreground/60 truncate">{tx.description ?? formatDate(tx.date)}</div>
                </div>
                <div className={`text-sm font-medium tabular-nums ${tx.type === "expense" ? "text-red-400" : "text-emerald-400"}`}>
                  {tx.type === "expense" ? "-" : "+"}{formatMoney(tx.amount, tx.currency)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SummaryCard({
  title, value, accent, hint, active, onClick,
}: {
  title: string;
  value: string;
  accent?: "emerald" | "red";
  hint?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const accentClass = accent === "emerald" ? "text-emerald-400" : accent === "red" ? "text-red-400" : "text-foreground";
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`w-full text-left p-5 rounded-xl border transition-all ${
        active
          ? "border-foreground/40 bg-foreground/8"
          : onClick
          ? "border-foreground/10 hover:border-foreground/30 hover:bg-foreground/5 cursor-pointer"
          : "border-foreground/10 cursor-default"
      }`}
    >
      <div className="text-xs uppercase tracking-wider text-foreground/50 mb-2">{title}</div>
      <div className={`text-2xl font-semibold tracking-tight tabular-nums ${accentClass}`}>{value}</div>
      {hint && <div className="text-xs text-foreground/40 mt-1">{hint}</div>}
      {onClick && <div className="text-xs text-foreground/30 mt-1">{active ? "▲ Ocultar" : "▼ Ver detalle"}</div>}
    </button>
  );
}

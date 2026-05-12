"use client";

import { useState, useMemo } from "react";
import { compareStrategies } from "@cornerstone/core";
import type { Debt } from "@cornerstone/core";

interface Props {
  debts: Debt[];
  currency: string;
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function months(n: number) {
  if (n >= 12) { const y = Math.floor(n / 12); const m = n % 12; return m > 0 ? `${y}a ${m}m` : `${y}a`; }
  return `${n}m`;
}

type Strategy = "avalanche" | "snowball";

export function StrategySimulator({ debts, currency }: Props) {
  const totalMinimums = debts.reduce((s, d) => s + d.minimumPayment, 0);
  const [extra, setExtra] = useState(0);
  const [chosen, setChosen] = useState<Strategy | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  const comparison = useMemo(
    () => (debts.length > 0 ? compareStrategies(debts, extra) : null),
    [debts, extra]
  );

  if (!comparison) return null;

  const { avalanche, snowball, savingsWithAvalanche, recommendation } = comparison;
  const useAvalanche = recommendation !== "snowball";
  const singleDebt = debts.length === 1;

  // Detect when both strategies are identical
  const strategiesIdentical =
    avalanche.monthsToDebtFree === snowball.monthsToDebtFree &&
    avalanche.totalInterestPaid === snowball.totalInterestPaid &&
    JSON.stringify(avalanche.payoffOrder) === JSON.stringify(snowball.payoffOrder);

  // Build payoff milestones for chosen strategy
  const activePlan = chosen === "snowball" ? snowball : avalanche;
  const milestones = useMemo(() => {
    if (!chosen) return [];
    const order = activePlan.payoffOrder;
    // Find approximate month for each payoff from steps
    const lastByDebt = new Map<string, number>();
    for (const step of activePlan.steps) {
      if (step.remainingBalance <= 0.01) {
        lastByDebt.set(step.debtId, step.month);
      }
    }
    return order.map((id, i) => {
      const debt = debts.find((d) => d.id === id);
      const month = lastByDebt.get(id) ?? activePlan.monthsToDebtFree;
      return { id, name: debt?.name ?? id, month, order: i + 1 };
    });
  }, [chosen, activePlan, debts]);

  // Monthly schedule preview (first 6 months + payoff months)
  const schedulePreview = useMemo(() => {
    if (!chosen || !showSchedule) return [];
    const byMonth = new Map<number, typeof activePlan.steps[0][]>();
    for (const step of activePlan.steps) {
      const arr = byMonth.get(step.month) ?? [];
      arr.push(step);
      byMonth.set(step.month, arr);
    }
    const allMonths = Array.from(byMonth.keys()).sort((a, b) => a - b);
    const payoffMonths = new Set(milestones.map((m) => m.month));
    const preview = allMonths.filter((m) => m <= 6 || payoffMonths.has(m));
    return preview.map((m) => ({ month: m, steps: byMonth.get(m)!, isPayoff: payoffMonths.has(m) }));
  }, [chosen, showSchedule, activePlan, milestones]);

  return (
    <div className="space-y-6">
      {/* Extra payment slider */}
      <div>
        <div className="flex justify-between mb-2">
          <p className="text-sm font-medium">Pago extra mensual</p>
          <span className="text-sm font-medium tabular-nums">{fmt(extra, currency)}/mes</span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(totalMinimums * 2, 500)}
          step={10}
          value={extra}
          onChange={(e) => setExtra(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-foreground/40 mt-1">
          <span>$0</span>
          <span>{fmt(Math.max(totalMinimums * 2, 500), currency)}</span>
        </div>
      </div>

      {/* Identical strategies note */}
      {singleDebt && (
        <p className="text-xs text-foreground/40 bg-foreground/5 rounded-md px-3 py-2">
          Con una sola deuda ambas estrategias son idénticas. Agrega más deudas para ver la diferencia.
        </p>
      )}
      {!singleDebt && strategiesIdentical && (
        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
          En tu caso ambas estrategias son idénticas porque la deuda con la tasa más alta también tiene el saldo más bajo — ambos métodos la atacan primero.
        </p>
      )}

      {/* Strategy cards */}
      <div className="grid grid-cols-2 gap-3">
        {(["avalanche", "snowball"] as Strategy[]).map((s) => {
          const plan = s === "avalanche" ? avalanche : snowball;
          const isRecommended = s === "avalanche" ? useAvalanche : !useAvalanche;
          const isChosen = chosen === s;
          return (
            <div
              key={s}
              className={`rounded-lg border p-4 transition-all ${
                isChosen
                  ? "border-emerald-500/60 bg-emerald-500/8"
                  : isRecommended && !strategiesIdentical
                  ? "border-foreground/30 bg-foreground/3"
                  : "border-foreground/10"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold">{s === "avalanche" ? "Avalancha" : "Bola de Nieve"}</h3>
                <div className="flex gap-1.5">
                  {isRecommended && !strategiesIdentical && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                      Recomendado
                    </span>
                  )}
                  {isChosen && (
                    <span className="text-xs bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                      ✓ Elegido
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-foreground/50 mb-3">
                {s === "avalanche" ? "Mayor tasa primero — menos interés" : "Menor saldo primero — victorias rápidas"}
              </p>
              <div className="space-y-2 mb-3">
                <Row label="Libre de deudas en" value={months(plan.monthsToDebtFree)} />
                <Row label="Total en intereses" value={fmt(plan.totalInterestPaid, currency)} />
                <Row label="Total pagado" value={fmt(plan.totalPaid, currency)} />
              </div>
              <button
                onClick={() => { setChosen(isChosen ? null : s); setShowSchedule(false); }}
                className={`w-full text-xs py-1.5 rounded-md font-medium transition-colors ${
                  isChosen
                    ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    : "bg-foreground/8 hover:bg-foreground/15 text-foreground/70"
                }`}
              >
                {isChosen ? "Deseleccionar" : "Usar esta estrategia"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Savings callout */}
      {Math.abs(savingsWithAvalanche) >= 10 && !strategiesIdentical && (
        <div className="rounded-md bg-foreground/5 px-4 py-3 text-sm">
          {savingsWithAvalanche > 0 ? (
            <><span className="text-emerald-400 font-medium">Avalancha ahorra {fmt(savingsWithAvalanche, currency)}</span> en intereses vs. Bola de Nieve.</>
          ) : (
            <><span className="text-emerald-400 font-medium">Bola de Nieve ahorra {fmt(Math.abs(savingsWithAvalanche), currency)}</span> en intereses vs. Avalancha.</>
          )}
          {extra === 0 && <span className="text-foreground/50"> Mueve el control — los pagos extra hacen gran diferencia.</span>}
        </div>
      )}

      {/* Chosen strategy details */}
      {chosen && (
        <div className="rounded-lg border border-foreground/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Plan: {chosen === "avalanche" ? "Avalancha" : "Bola de Nieve"}
            </h3>
            <button
              onClick={() => setShowSchedule((s) => !s)}
              className="text-xs text-foreground/50 hover:text-foreground"
            >
              {showSchedule ? "Ocultar cronograma" : "Ver cronograma mensual"}
            </button>
          </div>

          {/* Payoff order */}
          <div>
            <p className="text-xs uppercase tracking-widest text-foreground/40 mb-2">Orden de pago</p>
            <ol className="space-y-2">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                    {m.order}
                  </span>
                  <span className="flex-1">{m.name}</span>
                  <span className="text-foreground/40 text-xs">pagada en {months(m.month)}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Monthly schedule */}
          {showSchedule && schedulePreview.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-foreground/40 mb-2">Cronograma de pagos</p>
              <div className="space-y-1">
                {schedulePreview.map(({ month, steps, isPayoff }) => (
                  <div
                    key={month}
                    className={`flex items-start gap-3 text-xs py-1.5 px-2 rounded ${isPayoff ? "bg-emerald-500/10 border border-emerald-500/20" : ""}`}
                  >
                    <span className="text-foreground/40 w-14 shrink-0">Mes {month}</span>
                    <div className="flex-1 space-y-0.5">
                      {steps.map((step, i) => (
                        <div key={i} className="flex justify-between">
                          <span className={isPayoff ? "text-emerald-400 font-medium" : "text-foreground/70"}>
                            {isPayoff ? "🎉 " : ""}{step.debtName}
                          </span>
                          <span className="tabular-nums text-foreground/50">{fmt(step.paymentApplied, currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {activePlan.monthsToDebtFree > 6 && (
                  <p className="text-xs text-foreground/30 text-center py-1">
                    · · · meses intermedios omitidos · · ·
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payoff order for multi-debt without chosen */}
      {debts.length > 1 && !chosen && (
        <div>
          <p className="text-xs uppercase tracking-widest text-foreground/40 mb-2">
            Orden {useAvalanche ? "Avalancha" : "Bola de Nieve"}
          </p>
          <ol className="space-y-1">
            {(useAvalanche ? avalanche : snowball).payoffOrder.map((id, i) => {
              const debt = debts.find((d) => d.id === id);
              return (
                <li key={id} className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-medium shrink-0">{i + 1}</span>
                  <span>{debt?.name ?? id}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-foreground/50">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

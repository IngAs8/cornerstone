"use client";

import { useState, useMemo } from "react";
import { compareStrategies } from "@cornerstone/core";
import type { Debt } from "@cornerstone/core";

interface Props {
  debts: Debt[];
  currency: string;
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function months(n: number) {
  if (n >= 12) {
    const y = Math.floor(n / 12);
    const m = n % 12;
    return m > 0 ? `${y}y ${m}m` : `${y}y`;
  }
  return `${n}m`;
}

export function StrategySimulator({ debts, currency }: Props) {
  const totalMinimums = debts.reduce((s, d) => s + d.minimumPayment, 0);
  const [extra, setExtra] = useState(0);

  const comparison = useMemo(
    () => (debts.length > 0 ? compareStrategies(debts, extra) : null),
    [debts, extra]
  );

  if (!comparison) return null;

  const { avalanche, snowball, savingsWithAvalanche, recommendation } = comparison;
  const useAvalanche = recommendation !== "snowball";

  return (
    <div className="space-y-6">
      {/* Extra payment slider */}
      <div>
        <div className="flex justify-between mb-2">
          <Label>Extra monthly payment</Label>
          <span className="text-sm font-medium tabular-nums">
            {fmt(extra, currency)}/mo
          </span>
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

      {/* Strategy cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Avalanche */}
        <div
          className={`rounded-lg border p-4 ${
            useAvalanche
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-foreground/10"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold">Avalanche</h3>
            {useAvalanche && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                Recommended
              </span>
            )}
          </div>
          <p className="text-xs text-foreground/50 mb-3">Highest rate first</p>
          <div className="space-y-2">
            <Stat label="Debt-free in" value={months(avalanche.monthsToDebtFree)} />
            <Stat label="Total interest" value={fmt(avalanche.totalInterestPaid, currency)} />
            <Stat label="Total paid" value={fmt(avalanche.totalPaid, currency)} />
          </div>
        </div>

        {/* Snowball */}
        <div
          className={`rounded-lg border p-4 ${
            !useAvalanche
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-foreground/10"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold">Snowball</h3>
            {!useAvalanche && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                Recommended
              </span>
            )}
          </div>
          <p className="text-xs text-foreground/50 mb-3">Lowest balance first</p>
          <div className="space-y-2">
            <Stat label="Debt-free in" value={months(snowball.monthsToDebtFree)} />
            <Stat label="Total interest" value={fmt(snowball.totalInterestPaid, currency)} />
            <Stat label="Total paid" value={fmt(snowball.totalPaid, currency)} />
          </div>
        </div>
      </div>

      {/* Savings callout */}
      {Math.abs(savingsWithAvalanche) >= 10 && (
        <div className="rounded-md bg-foreground/5 px-4 py-3 text-sm">
          {savingsWithAvalanche > 0 ? (
            <>
              <span className="text-emerald-400 font-medium">
                Avalanche saves {fmt(savingsWithAvalanche, currency)}
              </span>{" "}
              in interest vs. Snowball.
            </>
          ) : (
            <>
              <span className="text-emerald-400 font-medium">
                Snowball saves {fmt(Math.abs(savingsWithAvalanche), currency)}
              </span>{" "}
              in interest vs. Avalanche.
            </>
          )}
          {extra === 0 && (
            <span className="text-foreground/50">
              {" "}Try moving the slider — extra payments make a big difference.
            </span>
          )}
        </div>
      )}

      {/* Payoff order */}
      {debts.length > 1 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-foreground/40 mb-2">
            {useAvalanche ? "Avalanche" : "Snowball"} payoff order
          </p>
          <ol className="space-y-1">
            {(useAvalanche ? avalanche : snowball).payoffOrder.map((id, i) => {
              const debt = debts.find((d) => d.id === id);
              return (
                <li key={id} className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {i + 1}
                  </span>
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

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children}</p>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-foreground/50">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

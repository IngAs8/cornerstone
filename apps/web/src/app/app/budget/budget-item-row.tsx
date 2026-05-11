"use client";

import { useState, useTransition } from "react";
import { updateBudgetItem, removeBudgetItem } from "./actions";

interface BudgetItemRowProps {
  id: string;
  categoryName: string;
  categoryColor: string | null;
  allocated: number;
  spent: number;
  currency: string;
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function BudgetItemRow({
  id,
  categoryName,
  categoryColor,
  allocated,
  spent,
  currency,
}: BudgetItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(allocated.toString());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pct = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : spent > 0 ? 100 : 0;
  const overBudget = spent > allocated;
  const barColor = overBudget
    ? "bg-red-500"
    : pct >= 75
    ? "bg-yellow-500"
    : "bg-emerald-500";

  function save() {
    const num = parseFloat(value.replace(/,/g, ""));
    if (!Number.isFinite(num) || num < 0) {
      setError("Enter a valid amount");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateBudgetItem(id, num);
      if (res.error) { setError(res.error); return; }
      setEditing(false);
    });
  }

  function discard() {
    setValue(allocated.toString());
    setError(null);
    setEditing(false);
  }

  return (
    <div className="py-3 px-4 rounded-md hover:bg-foreground/3 transition-colors group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: categoryColor ?? "#6b7280" }}
          />
          <span className="text-sm font-medium">{categoryName}</span>
        </div>

        <div className="flex items-center gap-3">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                className="w-28 text-right text-sm px-2 py-0.5 rounded border border-foreground/20 bg-background focus:outline-none focus:border-foreground/50"
                value={value}
                autoFocus
                onChange={(e) => setValue(e.target.value.replace(/[^\d.,]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") discard();
                }}
              />
              <button
                onClick={save}
                disabled={isPending}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                {isPending ? "…" : "Save"}
              </button>
              <button
                onClick={discard}
                className="text-xs text-foreground/40 hover:text-foreground/70"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setValue(allocated.toFixed(2)); setEditing(true); }}
              className="text-sm text-foreground/60 hover:text-foreground transition-colors group-hover:underline group-hover:decoration-dotted"
              title="Click to edit"
            >
              {fmt(allocated, currency)}
            </button>
          )}

          <span
            className={`text-sm font-medium tabular-nums ${
              overBudget ? "text-red-400" : "text-foreground/60"
            }`}
          >
            {fmt(spent, currency)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

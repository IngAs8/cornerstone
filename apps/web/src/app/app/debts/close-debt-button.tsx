"use client";

import { useTransition } from "react";
import { closeDebt } from "./actions";

export function CloseDebtButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (!confirm(`Mark "${name}" as paid off?`)) return;
        startTransition(async () => { await closeDebt(id); });
      }}
      disabled={isPending}
      className="text-xs text-foreground/40 hover:text-emerald-400 transition-colors disabled:opacity-50"
    >
      {isPending ? "…" : "Mark paid"}
    </button>
  );
}

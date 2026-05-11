"use client";

import { useTransition } from "react";
import { createBillingPortalSession } from "./stripe-actions";

export function BillingButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(async () => { await createBillingPortalSession(); })}
      disabled={isPending}
      className="text-sm px-4 py-2 rounded-md border border-foreground/20 hover:bg-foreground/5 transition-colors shrink-0"
    >
      {isPending ? "…" : "Administrar facturación"}
    </button>
  );
}

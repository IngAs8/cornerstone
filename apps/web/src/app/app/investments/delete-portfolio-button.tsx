"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePortfolio } from "./actions";

export function DeletePortfolioButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (!confirm(`Delete portfolio "${name}"? This will remove all assets.`)) return;
        startTransition(async () => {
          await deletePortfolio(id);
          router.push("/app/investments");
        });
      }}
      disabled={isPending}
      className="text-xs text-foreground/40 hover:text-red-400 transition-colors disabled:opacity-50"
    >
      {isPending ? "…" : "Delete"}
    </button>
  );
}

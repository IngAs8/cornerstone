"use client";

import { useTransition } from "react";
import { removeAsset } from "./actions";

export function RemoveAssetButton({
  assetId,
  portfolioId,
  symbol,
}: {
  assetId: string;
  portfolioId: string;
  symbol: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (!confirm(`Remove ${symbol} from this portfolio?`)) return;
        startTransition(async () => { await removeAsset(assetId, portfolioId); });
      }}
      disabled={isPending}
      className="text-xs text-foreground/30 hover:text-red-400 transition-colors disabled:opacity-50"
    >
      {isPending ? "…" : "Remove"}
    </button>
  );
}

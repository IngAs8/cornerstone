"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CurrencySelector } from "@/components/finance/currency-selector";
import { addAsset } from "./actions";

const ASSET_TYPES = [
  { value: "crypto", label: "Cryptocurrency" },
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
  { value: "bond", label: "Bond" },
  { value: "real_estate", label: "Real Estate" },
  { value: "cash", label: "Cash / Stablecoin" },
  { value: "other", label: "Other" },
];

export function AddAssetForm({ portfolioId }: { portfolioId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState("");
  const [type, setType] = useState("stock");
  const [quantity, setQuantity] = useState("");
  const [averageCost, setAverageCost] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [exchange, setExchange] = useState("");

  function submit() {
    setError(null);
    const qty = parseFloat(quantity.replace(/,/g, ""));
    const cost = parseFloat(averageCost.replace(/,/g, ""));

    if (!symbol.trim()) { setError("Symbol is required"); return; }
    if (!Number.isFinite(qty) || qty <= 0) { setError("Quantity must be greater than zero"); return; }
    if (!Number.isFinite(cost) || cost < 0) { setError("Enter a valid average cost"); return; }

    startTransition(async () => {
      const result = await addAsset({
        investmentId: portfolioId,
        symbol,
        type,
        quantity: qty,
        averageCost: cost,
        currency,
        exchange: exchange || undefined,
      });

      if (result.error) { setError(result.error); return; }
      router.push(`/app/investments/${portfolioId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="symbol">Symbol / Ticker</Label>
          <Input
            id="symbol"
            placeholder="e.g. BTC, AAPL"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="type">Asset type</Label>
          <Select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {ASSET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="quantity">Quantity / Shares</Label>
          <Input
            id="quantity"
            inputMode="decimal"
            placeholder="e.g. 0.5"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value.replace(/[^\d.,]/g, ""))}
          />
        </div>
        <div>
          <Label htmlFor="averageCost">Avg. cost per unit</Label>
          <Input
            id="averageCost"
            inputMode="decimal"
            placeholder="0.00"
            value={averageCost}
            onChange={(e) => setAverageCost(e.target.value.replace(/[^\d.,]/g, ""))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="currency">Currency</Label>
          <CurrencySelector
            id="currency"
            name="currency"
            value={currency}
            onValueChange={setCurrency}
          />
        </div>
        <div>
          <Label htmlFor="exchange">Exchange (optional)</Label>
          <Input
            id="exchange"
            placeholder="e.g. NYSE, Binance"
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-500/10 px-3 py-2 rounded-md">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add asset"}
        </Button>
      </div>
    </form>
  );
}

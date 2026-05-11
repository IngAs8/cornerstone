import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { fetchPrices } from "@/lib/investments/fetch-prices";
import { cachePrices, removeAsset, deletePortfolio } from "../actions";
import { calculatePortfolioMetrics } from "@cornerstone/core";
import type { Asset, ExchangeRate } from "@cornerstone/core";
import { RemoveAssetButton } from "../remove-asset-button";
import { DeletePortfolioButton } from "../delete-portfolio-button";

const ASSET_TYPE_LABEL: Record<string, string> = {
  crypto: "Crypto",
  stock: "Stock",
  etf: "ETF",
  bond: "Bond",
  real_estate: "Real Estate",
  cash: "Cash",
  other: "Other",
};

export default async function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users")
    .select("base_currency")
    .eq("id", user.id)
    .single();

  const currency = profile?.base_currency ?? "USD";

  const { data: portfolio } = await supabase
    .from("investments")
    .select("id, name, description, created_at")
    .eq("id", id)
    .single();

  if (!portfolio) notFound();

  const { data: rawAssets } = await supabase
    .from("investment_assets")
    .select("id, symbol, type, quantity, average_cost, currency, exchange")
    .eq("investment_id", id)
    .order("symbol");

  const rawList = rawAssets ?? [];

  // Fetch live prices
  const uniqueSymbols = [...new Map(rawList.map((a) => [a.symbol, { symbol: a.symbol, type: a.type }])).values()];

  let prices: Awaited<ReturnType<typeof fetchPrices>> = [];
  if (uniqueSymbols.length > 0) {
    prices = await fetchPrices(uniqueSymbols);

    // Fall back to cache for missing symbols
    const fetchedSymbols = new Set(prices.map((p) => p.symbol));
    const missing = uniqueSymbols.filter((s) => !fetchedSymbols.has(s.symbol));

    if (missing.length > 0) {
      const { data: cached } = await supabase
        .from("asset_prices")
        .select("symbol, price_usd, change_24h_percent")
        .in("symbol", missing.map((s) => s.symbol));

      if (cached) {
        prices.push(...cached.map((c) => ({
          symbol: c.symbol,
          price: c.price_usd,
          currency: "USD" as const,
          change24h: c.change_24h_percent ?? undefined,
        })));
      }
    }

    // Cache fresh prices
    if (prices.length > 0) {
      await cachePrices(prices.map((p) => ({
        symbol: p.symbol,
        type: uniqueSymbols.find((s) => s.symbol === p.symbol)?.type ?? "other",
        priceUsd: p.price,
        change24hPercent: p.change24h ?? null,
      })));
    }
  }

  const coreAssets: Asset[] = rawList.map((a) => ({
    id: a.id,
    symbol: a.symbol,
    type: a.type as Asset["type"],
    quantity: Number(a.quantity),
    averageCost: Number(a.average_cost),
    currency: a.currency,
  }));

  const rates: ExchangeRate[] = [];
  const metrics = coreAssets.length > 0
    ? calculatePortfolioMetrics(coreAssets, prices, rates, currency)
    : null;

  const totalValue = metrics?.totalCurrentValue ?? 0;
  const totalCost = metrics?.totalCostBasis ?? 0;
  const totalPnL = metrics?.totalPnL ?? 0;
  const totalPnLPct = metrics?.totalPnLPercent ?? 0;

  return (
    <main className="flex-1 px-8 py-10 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <Link href="/app/investments" className="text-sm text-foreground/60 hover:text-foreground">
          ← Back to investments
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{portfolio.name}</h1>
          {portfolio.description && (
            <p className="text-foreground/50 text-sm mt-0.5">{portfolio.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <DeletePortfolioButton id={id} name={portfolio.name} />
          <Link href={`/app/investments/${id}/add-asset`}>
            <Button size="sm">+ Add asset</Button>
          </Link>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <Stat label="Current Value" value={formatMoney(totalValue, currency)} />
        <Stat label="Cost Basis" value={formatMoney(totalCost, currency)} valueClass="text-foreground/70" />
        <Stat
          label="Total P&L"
          value={`${totalPnL >= 0 ? "+" : ""}${formatMoney(totalPnL, currency)}`}
          valueClass={totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <Stat
          label="Return"
          value={`${totalPnLPct >= 0 ? "+" : ""}${totalPnLPct.toFixed(2)}%`}
          valueClass={totalPnLPct >= 0 ? "text-emerald-400" : "text-red-400"}
        />
      </div>

      {/* Assets table */}
      {rawList.length === 0 ? (
        <div className="text-center py-16 text-foreground/50 border border-foreground/10 rounded-lg">
          <p className="text-base font-medium mb-2">No assets yet</p>
          <p className="text-sm mb-6">Add your first asset to start tracking performance.</p>
          <Link href={`/app/investments/${id}/add-asset`}>
            <Button>Add asset</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-foreground/10 overflow-hidden mb-10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 text-left">
                <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-foreground/40 font-medium">Asset</th>
                <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-foreground/40 font-medium text-right">Qty</th>
                <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-foreground/40 font-medium text-right">Avg Cost</th>
                <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-foreground/40 font-medium text-right">Price</th>
                <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-foreground/40 font-medium text-right">Value</th>
                <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-foreground/40 font-medium text-right">P&L</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rawList.map((asset) => {
                const assetMetrics = metrics?.byAsset.find((m) => m.symbol === asset.symbol);
                const priceData = prices.find((p) => p.symbol === asset.symbol);
                const currentPrice = assetMetrics?.currentPrice ?? null;
                const value = assetMetrics?.currentValue ?? null;
                const pnl = assetMetrics?.pnl ?? null;
                const pnlPct = assetMetrics?.pnlPercent ?? null;
                const change24h = priceData?.change24h;

                return (
                  <tr key={asset.id} className="border-t border-foreground/5 hover:bg-foreground/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{asset.symbol}</span>
                        <span className="text-xs text-foreground/40 bg-foreground/8 px-1.5 py-0.5 rounded">
                          {ASSET_TYPE_LABEL[asset.type] ?? asset.type}
                        </span>
                      </div>
                      {asset.exchange && (
                        <span className="text-xs text-foreground/30">{asset.exchange}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground/70">
                      {Number(asset.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground/60">
                      {formatMoney(Number(asset.average_cost), asset.currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {currentPrice !== null ? (
                        <div>
                          <div>{formatMoney(currentPrice, "USD")}</div>
                          {change24h !== undefined && (
                            <div className={`text-xs ${change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-foreground/30 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {value !== null ? formatMoney(value, currency) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {pnl !== null ? (
                        <div className={pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                          <div>{pnl >= 0 ? "+" : ""}{formatMoney(pnl, currency)}</div>
                          <div className="text-xs">{pnlPct !== null ? `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%` : ""}</div>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RemoveAssetButton assetId={asset.id} portfolioId={id} symbol={asset.symbol} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Allocation breakdown */}
      {metrics && rawList.length > 0 && (
        <div className="rounded-lg border border-foreground/10 p-6">
          <h2 className="text-base font-semibold mb-4">Allocation by Type</h2>
          <div className="space-y-3">
            {Object.entries(metrics.byType).map(([type, value]) => {
              const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{ASSET_TYPE_LABEL[type] ?? type}</span>
                    <span className="text-foreground/60">
                      {formatMoney(value, currency)} · {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-foreground/10 p-4">
      <p className="text-xs uppercase tracking-widest text-foreground/40 mb-1">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

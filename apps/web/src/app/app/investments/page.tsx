import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { fetchPrices } from "@/lib/investments/fetch-prices";
import { cachePrices } from "./actions";
import { calculatePortfolioMetrics } from "@cornerstone/core";
import type { Asset, ExchangeRate } from "@cornerstone/core";

export default async function InvestmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users")
    .select("base_currency")
    .eq("id", user.id)
    .single();

  const currency = profile?.base_currency ?? "USD";

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  const { data: portfolios } = membership
    ? await supabase
        .from("investments")
        .select("id, name, description, created_at")
        .eq("household_id", membership.household_id)
        .order("created_at", { ascending: false })
    : { data: null };

  const allPortfolios = portfolios ?? [];

  // Fetch all assets across all portfolios
  const portfolioIds = allPortfolios.map((p) => p.id);
  const { data: allAssets } = portfolioIds.length > 0
    ? await supabase
        .from("investment_assets")
        .select("id, investment_id, symbol, type, quantity, average_cost, currency")
        .in("investment_id", portfolioIds)
    : { data: null };

  const assets = allAssets ?? [];

  // Fetch prices for unique symbols
  const uniqueSymbols = [...new Map(assets.map((a) => [a.symbol, { symbol: a.symbol, type: a.type }])).values()];

  let prices: Awaited<ReturnType<typeof fetchPrices>> = [];
  if (uniqueSymbols.length > 0) {
    prices = await fetchPrices(uniqueSymbols);

    // Fall back to cached prices for any symbols not returned
    const fetchedSymbols = new Set(prices.map((p) => p.symbol));
    const missingSymbols = uniqueSymbols.filter((s) => !fetchedSymbols.has(s.symbol));

    if (missingSymbols.length > 0) {
      const { data: cached } = await supabase
        .from("asset_prices")
        .select("symbol, type, price_usd, change_24h_percent")
        .in("symbol", missingSymbols.map((s) => s.symbol));

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

  // Build per-portfolio totals
  const portfolioTotals = allPortfolios.map((portfolio) => {
    const portfolioAssets: Asset[] = assets
      .filter((a) => a.investment_id === portfolio.id)
      .map((a) => ({
        id: a.id,
        symbol: a.symbol,
        type: a.type as Asset["type"],
        quantity: Number(a.quantity),
        averageCost: Number(a.average_cost),
        currency: a.currency,
      }));

    if (portfolioAssets.length === 0) {
      return { portfolio, totalValue: 0, totalPnL: 0, assetCount: 0 };
    }

    const rates: ExchangeRate[] = []; // all prices are in USD
    const metrics = calculatePortfolioMetrics(portfolioAssets, prices, rates, currency === "USD" ? "USD" : currency);

    return {
      portfolio,
      totalValue: metrics.totalCurrentValue,
      totalPnL: metrics.totalPnL,
      assetCount: portfolioAssets.length,
    };
  });

  const grandTotal = portfolioTotals.reduce((s, p) => s + p.totalValue, 0);
  const grandPnL = portfolioTotals.reduce((s, p) => s + p.totalPnL, 0);

  return (
    <main className="flex-1 px-8 py-10 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inversiones</h1>
          <p className="text-foreground/60 text-sm mt-0.5">
            Rastrea tus portafolios y rendimiento de activos.
          </p>
        </div>
        <Link href="/app/investments/new">
          <Button>+ Nuevo portafolio</Button>
        </Link>
      </div>

      {allPortfolios.length === 0 ? (
        <div className="text-center py-20 text-foreground/50">
          <p className="text-lg font-medium mb-2">Sin portafolios aún</p>
          <p className="text-sm mb-6">Crea un portafolio para comenzar a rastrear tus inversiones.</p>
          <Link href="/app/investments/new">
            <Button>Crear primer portafolio</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="rounded-lg border border-foreground/10 p-4">
              <p className="text-xs uppercase tracking-widest text-foreground/40 mb-1">Valor total</p>
              <p className="text-xl font-semibold">{formatMoney(grandTotal, currency)}</p>
            </div>
            <div className="rounded-lg border border-foreground/10 p-4">
              <p className="text-xs uppercase tracking-widest text-foreground/40 mb-1">Total P&L</p>
              <p className={`text-xl font-semibold ${grandPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {grandPnL >= 0 ? "+" : ""}{formatMoney(grandPnL, currency)}
              </p>
            </div>
          </div>

          {/* Portfolio cards */}
          <div className="space-y-3">
            {portfolioTotals.map(({ portfolio, totalValue, totalPnL, assetCount }) => (
              <Link
                key={portfolio.id}
                href={`/app/investments/${portfolio.id}`}
                className="block rounded-lg border border-foreground/10 p-4 hover:border-foreground/20 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{portfolio.name}</p>
                    {portfolio.description && (
                      <p className="text-sm text-foreground/50 mt-0.5">{portfolio.description}</p>
                    )}
                    <p className="text-xs text-foreground/40 mt-1">
                      {assetCount} {assetCount === 1 ? "activo" : "activos"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatMoney(totalValue, currency)}</p>
                    {assetCount > 0 && (
                      <p className={`text-sm ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {totalPnL >= 0 ? "+" : ""}{formatMoney(totalPnL, currency)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

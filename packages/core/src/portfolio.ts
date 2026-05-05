import type { Asset, Currency, ExchangeRate, PriceData } from "./types";
import { convert } from "./currency";

export interface AssetMetrics {
  symbol: string;
  type: Asset["type"];
  quantity: number;
  averageCost: number;
  currentPrice: number;
  costBasis: number;       // total cost in base currency
  currentValue: number;    // current value in base currency
  pnl: number;             // profit/loss in base currency
  pnlPercent: number;      // profit/loss as %
  change24h?: number;      // 24h price change %
  currency: Currency;      // asset's native currency
}

export interface PortfolioMetrics {
  totalCostBasis: number;
  totalCurrentValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  byAsset: AssetMetrics[];
  byType: Record<string, number>;       // type → currentValue
  byCurrency: Record<string, number>;   // currency → currentValue
  baseCurrency: Currency;
}

/**
 * Calculate full portfolio metrics, converting everything to the base currency.
 */
export function calculatePortfolioMetrics(
  assets: Asset[],
  prices: PriceData[],
  rates: ExchangeRate[],
  baseCurrency: Currency
): PortfolioMetrics {
  const byAsset: AssetMetrics[] = [];
  const byType: Record<string, number> = {};
  const byCurrency: Record<string, number> = {};

  for (const asset of assets) {
    const priceData = prices.find((p) => p.symbol === asset.symbol);
    if (!priceData) continue; // skip if no price available

    const currentPrice = priceData.price;
    const costInAssetCurrency = asset.quantity * asset.averageCost;
    const valueInAssetCurrency = asset.quantity * currentPrice;

    const costBasis = convert(costInAssetCurrency, asset.currency, baseCurrency, rates);
    const currentValue = convert(valueInAssetCurrency, asset.currency, baseCurrency, rates);
    const pnl = round2(currentValue - costBasis);
    const pnlPercent = costBasis > 0 ? round2((pnl / costBasis) * 100) : 0;

    byAsset.push({
      symbol: asset.symbol,
      type: asset.type,
      quantity: asset.quantity,
      averageCost: asset.averageCost,
      currentPrice,
      costBasis: round2(costBasis),
      currentValue: round2(currentValue),
      pnl,
      pnlPercent,
      change24h: priceData.change24h,
      currency: asset.currency,
    });

    byType[asset.type] = round2((byType[asset.type] ?? 0) + currentValue);
    byCurrency[asset.currency] = round2((byCurrency[asset.currency] ?? 0) + currentValue);
  }

  const totalCostBasis = round2(byAsset.reduce((sum, a) => sum + a.costBasis, 0));
  const totalCurrentValue = round2(byAsset.reduce((sum, a) => sum + a.currentValue, 0));
  const totalPnL = round2(totalCurrentValue - totalCostBasis);
  const totalPnLPercent = totalCostBasis > 0 ? round2((totalPnL / totalCostBasis) * 100) : 0;

  return {
    totalCostBasis,
    totalCurrentValue,
    totalPnL,
    totalPnLPercent,
    byAsset,
    byType,
    byCurrency,
    baseCurrency,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

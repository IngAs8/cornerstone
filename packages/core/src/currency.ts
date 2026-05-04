import type { Currency, ExchangeRate } from "./types.js";

/**
 * Convert an amount from one currency to another using provided exchange rates.
 * Always uses the most recent rate available.
 */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: ExchangeRate[]
): number {
  if (from === to) return round2(amount);

  // Direct conversion
  const direct = findRate(rates, from, to);
  if (direct !== null) return round2(amount * direct);

  // Inverse conversion
  const inverse = findRate(rates, to, from);
  if (inverse !== null) return round2(amount / inverse);

  // Try via USD as bridge
  const fromToUsd = findRate(rates, from, "USD");
  const usdToTarget = findRate(rates, "USD", to);
  if (fromToUsd !== null && usdToTarget !== null) {
    return round2(amount * fromToUsd * usdToTarget);
  }

  throw new Error(`No exchange rate available: ${from} → ${to}`);
}

/**
 * Find the most recent rate for a currency pair.
 */
function findRate(rates: ExchangeRate[], base: Currency, target: Currency): number | null {
  const matching = rates
    .filter((r) => r.base === base && r.target === target)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  return matching.length > 0 ? matching[0]!.rate : null;
}

/**
 * Format an amount with currency symbol/code.
 * Uses the user's locale for number formatting.
 */
export function formatCurrency(
  amount: number,
  currency: Currency,
  locale: string = "en-US"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unknown currencies
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

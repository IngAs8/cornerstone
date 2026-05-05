/**
 * Locale-aware formatting helpers.
 */
import { findCurrency } from "./currencies";

export function formatMoney(
  amount: number,
  currency: string,
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
    const info = findCurrency(currency);
    const symbol = info?.symbol ?? currency;
    return `${symbol}${amount.toFixed(2)}`;
  }
}

export function formatDate(date: string | Date, locale: string = "en-US"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatRelativeMonth(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

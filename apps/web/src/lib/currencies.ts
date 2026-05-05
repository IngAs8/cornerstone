/**
 * Curated list of world currencies — name, code, and country flag.
 * Limited to the most relevant for personal finance globally.
 */

export interface CurrencyInfo {
  code: string;       // ISO 4217
  name: string;       // English name
  symbol: string;     // typical symbol
  flag: string;       // ISO 3166-1 alpha-2 (for emoji or icons)
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", name: "US Dollar",          symbol: "$",   flag: "US" },
  { code: "EUR", name: "Euro",               symbol: "€",   flag: "EU" },
  { code: "GBP", name: "British Pound",      symbol: "£",   flag: "GB" },
  { code: "JPY", name: "Japanese Yen",       symbol: "¥",   flag: "JP" },
  { code: "CHF", name: "Swiss Franc",        symbol: "CHF", flag: "CH" },
  { code: "CAD", name: "Canadian Dollar",    symbol: "C$",  flag: "CA" },
  { code: "AUD", name: "Australian Dollar",  symbol: "A$",  flag: "AU" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", flag: "NZ" },
  { code: "CNY", name: "Chinese Yuan",       symbol: "¥",   flag: "CN" },
  { code: "HKD", name: "Hong Kong Dollar",   symbol: "HK$", flag: "HK" },
  { code: "SGD", name: "Singapore Dollar",   symbol: "S$",  flag: "SG" },
  { code: "KRW", name: "South Korean Won",   symbol: "₩",   flag: "KR" },
  { code: "INR", name: "Indian Rupee",       symbol: "₹",   flag: "IN" },
  { code: "BRL", name: "Brazilian Real",     symbol: "R$",  flag: "BR" },
  { code: "MXN", name: "Mexican Peso",       symbol: "$",   flag: "MX" },
  { code: "ARS", name: "Argentine Peso",     symbol: "$",   flag: "AR" },
  { code: "CLP", name: "Chilean Peso",       symbol: "$",   flag: "CL" },
  { code: "COP", name: "Colombian Peso",     symbol: "$",   flag: "CO" },
  { code: "PEN", name: "Peruvian Sol",       symbol: "S/",  flag: "PE" },
  { code: "UYU", name: "Uruguayan Peso",     symbol: "$U",  flag: "UY" },
  { code: "VES", name: "Venezuelan Bolivar", symbol: "Bs.", flag: "VE" },
  { code: "ZAR", name: "South African Rand", symbol: "R",   flag: "ZA" },
  { code: "TRY", name: "Turkish Lira",       symbol: "₺",   flag: "TR" },
  { code: "RUB", name: "Russian Ruble",      symbol: "₽",   flag: "RU" },
  { code: "PLN", name: "Polish Zloty",       symbol: "zł",  flag: "PL" },
  { code: "SEK", name: "Swedish Krona",      symbol: "kr",  flag: "SE" },
  { code: "NOK", name: "Norwegian Krone",    symbol: "kr",  flag: "NO" },
  { code: "DKK", name: "Danish Krone",       symbol: "kr",  flag: "DK" },
  { code: "CZK", name: "Czech Koruna",       symbol: "Kč",  flag: "CZ" },
  { code: "HUF", name: "Hungarian Forint",   symbol: "Ft",  flag: "HU" },
  { code: "ILS", name: "Israeli Shekel",     symbol: "₪",   flag: "IL" },
  { code: "AED", name: "UAE Dirham",         symbol: "د.إ", flag: "AE" },
  { code: "SAR", name: "Saudi Riyal",        symbol: "﷼",   flag: "SA" },
  { code: "THB", name: "Thai Baht",          symbol: "฿",   flag: "TH" },
  { code: "MYR", name: "Malaysian Ringgit",  symbol: "RM",  flag: "MY" },
  { code: "IDR", name: "Indonesian Rupiah",  symbol: "Rp",  flag: "ID" },
  { code: "PHP", name: "Philippine Peso",    symbol: "₱",   flag: "PH" },
  { code: "VND", name: "Vietnamese Dong",    symbol: "₫",   flag: "VN" },
  { code: "EGP", name: "Egyptian Pound",     symbol: "E£",  flag: "EG" },
  { code: "NGN", name: "Nigerian Naira",     symbol: "₦",   flag: "NG" },
];

export function findCurrency(code: string): CurrencyInfo | undefined {
  return CURRENCIES.find((c) => c.code === code.toUpperCase());
}

/**
 * Convert ISO 3166-1 alpha-2 country code to a flag emoji.
 * "US" → 🇺🇸
 */
export function flagEmoji(countryCode: string): string {
  if (countryCode.length !== 2) return "🏳️";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 + (c.charCodeAt(0) - 0x41));
  return String.fromCodePoint(...codePoints);
}

import type { PriceData } from "@cornerstone/core";

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  DOGE: "dogecoin",
  LTC: "litecoin",
  ATOM: "cosmos",
  NEAR: "near",
};

export async function fetchPrices(
  symbols: { symbol: string; type: string }[]
): Promise<PriceData[]> {
  const cryptoSymbols = symbols.filter((s) => s.type === "crypto");
  const stockSymbols = symbols.filter((s) => s.type !== "crypto");

  const results: PriceData[] = [];

  if (cryptoSymbols.length > 0) {
    const cryptoPrices = await fetchCryptoPrices(cryptoSymbols.map((s) => s.symbol));
    results.push(...cryptoPrices);
  }

  if (stockSymbols.length > 0) {
    const stockPrices = await fetchStockPrices(stockSymbols.map((s) => s.symbol));
    results.push(...stockPrices);
  }

  return results;
}

async function fetchCryptoPrices(symbols: string[]): Promise<PriceData[]> {
  const ids = symbols
    .map((s) => COINGECKO_IDS[s.toUpperCase()])
    .filter(Boolean)
    .join(",");

  if (!ids) return [];

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];

    const data = await res.json() as Record<string, { usd: number; usd_24h_change?: number }>;

    return symbols.flatMap((symbol) => {
      const id = COINGECKO_IDS[symbol.toUpperCase()];
      if (!id || !data[id]) return [];
      return [{
        symbol: symbol.toUpperCase(),
        price: data[id]!.usd,
        currency: "USD",
        change24h: data[id]!.usd_24h_change ?? undefined,
      }];
    });
  } catch {
    return [];
  }
}

async function fetchStockPrices(symbols: string[]): Promise<PriceData[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return [];

  try {
    const list = symbols.join(",");
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${list}?apikey=${apiKey}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];

    const data = await res.json() as { symbol: string; price: number; changesPercentage: number }[];

    return data.map((q) => ({
      symbol: q.symbol,
      price: q.price,
      currency: "USD",
      change24h: q.changesPercentage,
    }));
  } catch {
    return [];
  }
}

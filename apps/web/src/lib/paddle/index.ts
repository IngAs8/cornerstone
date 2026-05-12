export { PLANS, getPlanByPriceId, formatPrice } from "./plans";
export type { PlanKey } from "./plans";

const PADDLE_API_BASE = process.env.PADDLE_ENVIRONMENT === "production"
  ? "https://api.paddle.com"
  : "https://sandbox-api.paddle.com";

function paddleHeaders() {
  if (!process.env.PADDLE_API_KEY) throw new Error("PADDLE_API_KEY is not set");
  return {
    "Authorization": `Bearer ${process.env.PADDLE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function createCheckoutUrl(params: {
  priceId: string;
  customData: Record<string, string>;
}): Promise<string> {
  const res = await fetch(`${PADDLE_API_BASE}/transactions`, {
    method: "POST",
    headers: paddleHeaders(),
    body: JSON.stringify({
      items: [{ price_id: params.priceId, quantity: 1 }],
      custom_data: params.customData,
    }),
  });
  const json = await res.json() as {
    data?: { checkout?: { url?: string } };
    error?: { type: string; code: string; detail: string };
  };

  if (!res.ok || json.error) {
    throw new Error(`Paddle error: ${json.error?.detail ?? JSON.stringify(json)}`);
  }

  const url = json.data?.checkout?.url;
  if (!url) throw new Error(`Paddle no devolvió URL de checkout. Respuesta: ${JSON.stringify(json)}`);

  return url;
}

export async function createPortalUrl(customerId: string): Promise<string> {
  const res = await fetch(`${PADDLE_API_BASE}/customers/${customerId}/portal-sessions`, {
    method: "POST",
    headers: paddleHeaders(),
    body: JSON.stringify({ subscription_ids: [] }),
  });
  const json = await res.json() as { data: { urls: { general: { overview: string } } } };
  return json.data.urls.general.overview;
}

export function verifyPaddleWebhook(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  // Paddle uses ts=timestamp;h1=hash format
  const parts = Object.fromEntries(
    signature.split(";").map((p) => p.split("=") as [string, string]),
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const { createHmac } = require("node:crypto") as typeof import("node:crypto");
  const expected = createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");

  return expected === h1;
}

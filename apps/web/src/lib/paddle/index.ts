import { createHmac, timingSafeEqual } from "node:crypto";

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

// Reject signatures older than this many seconds (replay protection).
const PADDLE_SIGNATURE_TOLERANCE_SEC = 5 * 60;

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

  // Replay protection: reject stale timestamps.
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > PADDLE_SIGNATURE_TOLERANCE_SEC) return false;

  const expected = createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks.
  try {
    const a = Buffer.from(h1, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

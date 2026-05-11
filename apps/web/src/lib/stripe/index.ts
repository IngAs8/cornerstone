export { PLANS, getPlanByPriceId, formatPrice } from "./plans";
export type { PlanKey } from "./plans";

import Stripe from "stripe";

// Lazy client — only instantiate when the key is present (server-side only)
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
  });
}

// Named export kept for backwards compat in server-only files
export const stripe: {
  readonly checkout: Stripe["checkout"];
  readonly billingPortal: Stripe["billingPortal"];
  readonly webhooks: Stripe["webhooks"];
  readonly subscriptions: Stripe["subscriptions"];
} = {
  get checkout() { return getStripe().checkout; },
  get billingPortal() { return getStripe().billingPortal; },
  get webhooks() { return getStripe().webhooks; },
  get subscriptions() { return getStripe().subscriptions; },
};

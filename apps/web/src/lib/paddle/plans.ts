export const PLANS = {
  free: {
    key: "free",
    name: "Gratis",
    priceMonthly: 0,
    priceYearly: 0,
    maxMembers: 1,
    features: [
      "1 usuario",
      "50 transacciones/mes",
      "Presupuesto básico",
      "Deudas ilimitadas",
    ],
    paddlePriceIdMonthly: null as string | null,
    paddlePriceIdYearly: null as string | null,
  },
  personal: {
    key: "personal",
    name: "Personal",
    priceMonthly: 799,
    priceYearly: 7199,
    maxMembers: 1,
    features: [
      "1 usuario",
      "Transacciones ilimitadas",
      "Bot de WhatsApp",
      "Asesor IA (BYOK)",
      "Portafolio de inversiones",
      "Cuentas bancarias",
    ],
    paddlePriceIdMonthly: process.env.PADDLE_PERSONAL_MONTHLY_PRICE_ID ?? null,
    paddlePriceIdYearly: process.env.PADDLE_PERSONAL_YEARLY_PRICE_ID ?? null,
  },
  family_s: {
    key: "family_s",
    name: "Familiar S",
    priceMonthly: 1299,
    priceYearly: 11999,
    maxMembers: 2,
    features: [
      "2 usuarios",
      "Dashboard compartido",
      "Bot de WhatsApp para ambos",
      "Asesor IA (BYOK)",
      "Portafolio de inversiones",
      "Todo lo de Personal",
    ],
    paddlePriceIdMonthly: process.env.PADDLE_FAMILY_S_MONTHLY_PRICE_ID ?? null,
    paddlePriceIdYearly: process.env.PADDLE_FAMILY_S_YEARLY_PRICE_ID ?? null,
  },
  family_m: {
    key: "family_m",
    name: "Familiar M",
    priceMonthly: 1699,
    priceYearly: 15599,
    maxMembers: 4,
    features: [
      "4 usuarios",
      "Dashboard compartido",
      "Bot de WhatsApp para todos",
      "Asesor IA (BYOK)",
      "Portafolio de inversiones",
      "Todo lo de Familiar S",
    ],
    paddlePriceIdMonthly: process.env.PADDLE_FAMILY_M_MONTHLY_PRICE_ID ?? null,
    paddlePriceIdYearly: process.env.PADDLE_FAMILY_M_YEARLY_PRICE_ID ?? null,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanByPriceId(priceId: string): PlanKey | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if ("paddlePriceIdMonthly" in plan) {
      const p = plan as { paddlePriceIdMonthly: string | null; paddlePriceIdYearly: string | null };
      if (p.paddlePriceIdMonthly === priceId || p.paddlePriceIdYearly === priceId) {
        return key as PlanKey;
      }
    }
  }
  return null;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

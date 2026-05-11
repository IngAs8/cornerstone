"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PLANS, type PlanKey } from "@/lib/stripe";
const stripe = getStripe();

export async function createCheckoutSession(planKey: PlanKey, billing: "monthly" | "yearly") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const plan = PLANS[planKey];
  if (planKey === "free") return { error: "El plan gratuito no requiere pago" };

  const priceId = billing === "monthly"
    ? (plan as { stripePriceIdMonthly: string }).stripePriceIdMonthly
    : (plan as { stripePriceIdYearly: string }).stripePriceIdYearly;

  if (!priceId) return { error: "Plan no configurado. Contacta soporte." };

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return { error: "No household found" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://cornerstonecapital.app";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${appUrl}/app/settings?upgraded=1`,
    cancel_url: `${appUrl}/pricing`,
    customer_email: user.email,
    metadata: {
      household_id: membership.household_id,
      user_id: user.id,
      plan: planKey,
    },
  });

  redirect(session.url!);
}

export async function createBillingPortalSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) return { error: "No hay suscripción activa" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://cornerstonecapital.app";

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/app/settings`,
  });

  redirect(session.url);
}

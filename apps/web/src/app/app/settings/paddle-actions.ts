"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutUrl, createPortalUrl, PLANS, type PlanKey } from "@/lib/paddle";

export async function createCheckoutSession(planKey: PlanKey, billing: "monthly" | "yearly") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (planKey === "free") return { error: "El plan gratuito no requiere pago" };

  const plan = PLANS[planKey] as typeof PLANS["personal"];
  const priceId = billing === "monthly" ? plan.paddlePriceIdMonthly : plan.paddlePriceIdYearly;
  if (!priceId) return { error: "Plan no configurado. Contacta soporte." };

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) return { error: "No household found" };

  const url = await createCheckoutUrl({
    priceId,
    customData: {
      household_id: membership.household_id,
      user_id: user.id,
      plan: planKey,
    },
  });

  redirect(url);
}

export async function createBillingPortalSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // paddle_customer_id stored in stripe_customer_id column (tech debt: rename column later)
  const { data: profile } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) return { error: "No hay suscripción activa" };

  const url = await createPortalUrl(profile.stripe_customer_id);
  redirect(url);
}

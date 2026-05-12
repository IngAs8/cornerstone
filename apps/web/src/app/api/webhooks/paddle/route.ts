import { NextRequest, NextResponse } from "next/server";
import { verifyPaddleWebhook, getPlanByPriceId } from "@/lib/paddle";
import { createServiceClient } from "@/lib/supabase/server";

const PLAN_MAX_MEMBERS: Record<string, number> = {
  personal: 1,
  family_s: 2,
  family_m: 4,
  free: 1,
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("paddle-signature") ?? "";

  if (!process.env.PADDLE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  if (!verifyPaddleWebhook(body, signature, process.env.PADDLE_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body) as {
    event_type: string;
    data: Record<string, unknown>;
  };

  const supabase = createServiceClient();

  switch (event.event_type) {
    case "transaction.completed": {
      const tx = event.data as {
        id: string;
        customer_id: string;
        subscription_id?: string;
        custom_data?: { household_id?: string; user_id?: string; plan?: string };
        items?: Array<{ price: { id: string } }>;
      };

      const householdId = tx.custom_data?.household_id;
      const userId = tx.custom_data?.user_id;
      const planKey = tx.custom_data?.plan ?? "personal";

      if (!householdId) break;

      await supabase
        .from("households")
        .update({
          subscription_plan: planKey,
          max_members: PLAN_MAX_MEMBERS[planKey] ?? 1,
        })
        .eq("id", householdId);

      if (userId && tx.customer_id) {
        await supabase
          .from("users")
          .update({ stripe_customer_id: tx.customer_id }) // column repurposed for Paddle
          .eq("id", userId);
      }

      if (tx.subscription_id) {
        const priceId = tx.items?.[0]?.price.id ?? "";
        await supabase.from("subscriptions").upsert({
          household_id: householdId,
          stripe_subscription_id: tx.subscription_id,
          stripe_customer_id: tx.customer_id,
          stripe_price_id: priceId,
          plan: planKey,
          status: "active",
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: "stripe_subscription_id" });
      }
      break;
    }

    case "subscription.updated": {
      const sub = event.data as {
        id: string;
        customer_id: string;
        status: string;
        items?: Array<{ price: { id: string } }>;
        current_billing_period?: { ends_at: string };
      };

      const priceId = sub.items?.[0]?.price.id ?? "";
      const planKey = getPlanByPriceId(priceId) ?? "free";

      await supabase
        .from("subscriptions")
        .update({
          status: sub.status as "active" | "canceled" | "past_due" | "trialing" | "unpaid",
          plan: planKey,
          current_period_end: sub.current_billing_period?.ends_at
            ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", sub.id);

      const { data: subscriptionRow } = await supabase
        .from("subscriptions")
        .select("household_id")
        .eq("stripe_subscription_id", sub.id)
        .single();

      if (subscriptionRow) {
        await supabase
          .from("households")
          .update({
            subscription_plan: planKey,
            max_members: PLAN_MAX_MEMBERS[planKey] ?? 1,
          })
          .eq("id", subscriptionRow.household_id);
      }
      break;
    }

    case "subscription.canceled": {
      const sub = event.data as { id: string };

      await supabase
        .from("subscriptions")
        .update({ status: "canceled", plan: "free" })
        .eq("stripe_subscription_id", sub.id);

      const { data: subscriptionRow } = await supabase
        .from("subscriptions")
        .select("household_id")
        .eq("stripe_subscription_id", sub.id)
        .single();

      if (subscriptionRow) {
        await supabase
          .from("households")
          .update({ subscription_plan: "free", max_members: 1 })
          .eq("id", subscriptionRow.household_id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

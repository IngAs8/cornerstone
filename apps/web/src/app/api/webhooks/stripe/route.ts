import { NextRequest, NextResponse } from "next/server";
import { getStripe, getPlanByPriceId } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: import("stripe").Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      const householdId = session.metadata?.household_id;
      const userId = session.metadata?.user_id;
      const planKey = session.metadata?.plan;

      if (!householdId || !planKey) break;

      const planMaxMembers: Record<string, number> = {
        personal: 1,
        family_s: 2,
        family_m: 3,
      };

      // Update household subscription
      await supabase
        .from("households")
        .update({
          subscription_plan: planKey,
          max_members: planMaxMembers[planKey] ?? 1,
        })
        .eq("id", householdId);

      // Store stripe customer id on user
      if (userId && session.customer) {
        await supabase
          .from("users")
          .update({ stripe_customer_id: String(session.customer) })
          .eq("id", userId);
      }

      // Upsert subscription record
      if (session.subscription) {
        const sub = await getStripe().subscriptions.retrieve(String(session.subscription));
        await supabase.from("subscriptions").upsert({
          household_id: householdId,
          stripe_subscription_id: String(session.subscription),
          stripe_customer_id: String(session.customer),
          plan: planKey,
          status: sub.status,
          current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
        }, { onConflict: "stripe_subscription_id" });
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as import("stripe").Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id;
      const planKey = priceId ? (getPlanByPriceId(priceId) ?? "free") : "free";

      await supabase
        .from("subscriptions")
        .update({
          status: sub.status,
          plan: planKey,
          current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", sub.id);

      // Also update household plan
      const { data: subscriptionRow } = await supabase
        .from("subscriptions")
        .select("household_id")
        .eq("stripe_subscription_id", sub.id)
        .single();

      if (subscriptionRow) {
        const planMaxMembers: Record<string, number> = { personal: 1, family_s: 2, family_m: 3, free: 1 };
        await supabase
          .from("households")
          .update({
            subscription_plan: planKey,
            max_members: planMaxMembers[planKey] ?? 1,
          })
          .eq("id", subscriptionRow.household_id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as import("stripe").Stripe.Subscription;

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

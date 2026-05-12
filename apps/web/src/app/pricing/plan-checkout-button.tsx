"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { Button } from "@/components/ui/button";

type PaidPlan = "personal" | "family_s" | "family_m";

let paddleInstance: Paddle | null = null;

async function getPaddle(): Promise<Paddle> {
  if (paddleInstance) return paddleInstance;
  const paddle = await initializePaddle({
    environment: (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as "sandbox" | "production") ?? "sandbox",
    token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
  });
  if (!paddle) throw new Error("Paddle no pudo inicializarse");
  paddleInstance = paddle;
  return paddle;
}

export function PlanCheckoutButton({
  planKey,
  priceId,
  isLoggedIn,
  userId,
  userEmail,
  householdId,
}: {
  planKey: PaidPlan;
  priceId: string | null;
  isLoggedIn: boolean;
  userId?: string;
  userEmail?: string;
  householdId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn && priceId) getPaddle().catch(console.error);
  }, [isLoggedIn, priceId]);

  function handleClick() {
    if (!isLoggedIn) {
      router.push(`/sign-up?plan=${planKey}`);
      return;
    }
    if (!priceId) return;

    startTransition(async () => {
      const paddle = await getPaddle();
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: userEmail ? { email: userEmail } : undefined,
        customData: {
          household_id: householdId ?? "",
          user_id: userId ?? "",
          plan: planKey,
        },
        settings: {
          successUrl: `${window.location.origin}/app/settings?upgraded=1`,
        },
      });
    });
  }

  return (
    <Button onClick={handleClick} disabled={isPending || !priceId} className="w-full">
      {isPending ? "Cargando…" : "Seleccionar plan"}
    </Button>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/app/app/settings/stripe-actions";

type PaidPlan = "personal" | "family_s" | "family_m";

export function PlanCheckoutButton({ planKey, isLoggedIn }: { planKey: PaidPlan; isLoggedIn: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!isLoggedIn) {
      router.push(`/sign-up?plan=${planKey}`);
      return;
    }
    startTransition(async () => {
      await createCheckoutSession(planKey, "monthly");
    });
  }

  return (
    <Button onClick={handleClick} disabled={isPending} className="w-full">
      {isPending ? "Redirigiendo…" : "Seleccionar plan"}
    </Button>
  );
}

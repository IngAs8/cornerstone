import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PLANS, formatPrice } from "@/lib/paddle/plans";
import { PlanCheckoutButton } from "./plan-checkout-button";

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let currentPlan = "free";
  let householdId: string | undefined;
  if (user) {
    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .single();
    if (membership) {
      householdId = membership.household_id;
      const { data: household } = await supabase
        .from("households")
        .select("subscription_plan")
        .eq("id", membership.household_id)
        .single();
      currentPlan = household?.subscription_plan ?? "free";
    }
  }

  const plans = Object.values(PLANS);

  return (
    <main className="min-h-screen">
      <header className="border-b border-foreground/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">Cornerstone Capital</Link>
          <div className="flex items-center gap-4 text-sm">
            {user ? (
              <Link href="/app/dashboard" className="px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity">
                Ir al app
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="px-3 py-1.5 rounded-md hover:bg-foreground/5 transition-colors">
                  Iniciar sesión
                </Link>
                <Link href="/sign-up" className="px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity">
                  Empezar gratis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight mb-3">Precios simples y transparentes</h1>
        <p className="text-foreground/60 text-lg mb-14">
          Empieza gratis. Sube de plan cuando necesites más.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const isPopular = plan.key === "family_s";
            return (
              <div
                key={plan.key}
                className={`rounded-xl border p-6 text-left flex flex-col ${
                  isPopular
                    ? "border-foreground/60 bg-foreground/3"
                    : "border-foreground/10"
                }`}
              >
                {isPopular && (
                  <span className="text-xs font-semibold uppercase tracking-widest text-foreground/60 mb-3">
                    Más popular
                  </span>
                )}
                <h2 className="text-lg font-semibold mb-1">{plan.name}</h2>
                <div className="mb-4">
                  {plan.priceMonthly === 0 ? (
                    <span className="text-3xl font-semibold">Gratis</span>
                  ) : (
                    <>
                      <span className="text-3xl font-semibold">{formatPrice(plan.priceMonthly)}</span>
                      <span className="text-foreground/50 text-sm">/mes</span>
                      <p className="text-xs text-foreground/40 mt-0.5">
                        o {formatPrice(plan.priceYearly)}/año (ahorra {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%)
                      </p>
                    </>
                  )}
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/70">
                      <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="text-center text-sm text-foreground/40 py-2 border border-foreground/10 rounded-md">
                    Plan actual
                  </div>
                ) : plan.key === "free" ? (
                  user ? (
                    <Link href="/app/dashboard" className="block text-center text-sm py-2 border border-foreground/20 rounded-md hover:bg-foreground/5 transition-colors">
                      Usar gratis
                    </Link>
                  ) : (
                    <Link href="/sign-up" className="block text-center text-sm py-2 border border-foreground/20 rounded-md hover:bg-foreground/5 transition-colors">
                      Empezar gratis
                    </Link>
                  )
                ) : (
                  <PlanCheckoutButton
                    planKey={plan.key as "personal" | "family_s" | "family_m"}
                    priceId={plan.paddlePriceIdMonthly ?? null}
                    isLoggedIn={!!user}
                    userId={user?.id}
                    userEmail={user?.email ?? undefined}
                    householdId={householdId}
                  />
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-foreground/30 mt-10">
          Todos los precios en USD. Cancela en cualquier momento. Sin contratos.
        </p>
      </section>
    </main>
  );
}

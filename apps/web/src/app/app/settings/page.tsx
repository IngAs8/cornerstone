import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WhatsAppForm } from "./whatsapp-form";
import { BillingButton } from "./billing-button";
import { PLANS } from "@/lib/paddle/plans";

const PLAN_LABEL: Record<string, string> = {
  free: "Gratis",
  personal: "Personal",
  family_s: "Familiar S",
  family_m: "Familiar M",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase
      .from("users")
      .select("whatsapp_number, base_currency, stripe_customer_id")
      .eq("id", user.id)
      .single(),
    supabase
      .from("household_members")
      .select("household_id, role")
      .eq("user_id", user.id)
      .single(),
  ]);

  let currentPlan = "free";
  if (membership) {
    const { data: household } = await supabase
      .from("households")
      .select("subscription_plan")
      .eq("id", membership.household_id)
      .single();
    currentPlan = household?.subscription_plan ?? "free";
  }

  const isOwner = membership?.role === "owner";
  const hasPaddle = !!profile?.stripe_customer_id; // column reused for Paddle customer ID

  return (
    <main className="flex-1 px-8 py-10 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-semibold tracking-tight mb-8">Configuración</h1>

      {/* Plan */}
      <section className="rounded-lg border border-foreground/10 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold mb-1">Plan actual</h2>
            <p className="text-2xl font-semibold">{PLAN_LABEL[currentPlan] ?? currentPlan}</p>
            <p className="text-sm text-foreground/50 mt-1">
              {PLANS[currentPlan as keyof typeof PLANS]?.features.slice(0, 2).join(" · ")}
            </p>
          </div>
          {isOwner && currentPlan === "free" && (
            <Link
              href="/pricing"
              className="text-sm px-4 py-2 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity shrink-0"
            >
              Mejorar plan
            </Link>
          )}
          {isOwner && currentPlan !== "free" && hasPaddle && (
            <BillingButton />
          )}
        </div>
        {currentPlan === "free" && (
          <div className="mt-4 p-3 rounded-lg bg-foreground/5 text-xs text-foreground/50">
            Plan gratuito: 1 usuario, 50 transacciones/mes.{" "}
            <Link href="/pricing" className="underline hover:text-foreground">
              Ver planes con más funciones →
            </Link>
          </div>
        )}
      </section>

      {/* WhatsApp */}
      <section className="rounded-lg border border-foreground/10 p-6 mb-6">
        <h2 className="text-base font-semibold mb-1">Bot de WhatsApp</h2>
        <p className="text-sm text-foreground/50 mb-5">
          Vincula tu número para registrar gastos enviando un mensaje de WhatsApp.
        </p>
        <WhatsAppForm current={profile?.whatsapp_number ?? null} />

        {profile?.whatsapp_number && (
          <div className="mt-5 p-4 bg-foreground/5 rounded-lg text-sm text-foreground/60">
            <p className="font-medium text-foreground mb-1">¿Cómo usarlo?</p>
            <p>Envía un mensaje a <span className="font-mono">+1 555-641-5743</span> con tu gasto:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>«Gasté $12 en almuerzo»</li>
              <li>«$8 taxi al aeropuerto»</li>
              <li>«Pagué 45 de supermercado ayer»</li>
            </ul>
          </div>
        )}
      </section>

      {/* Account info */}
      <section className="rounded-lg border border-foreground/10 p-6">
        <h2 className="text-base font-semibold mb-4">Cuenta</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground/60">Email</span>
            <span className="font-mono text-xs">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/60">Moneda base</span>
            <span>{profile?.base_currency ?? "USD"}</span>
          </div>
        </div>
      </section>
    </main>
  );
}

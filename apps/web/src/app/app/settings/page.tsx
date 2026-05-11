import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WhatsAppForm } from "./whatsapp-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users")
    .select("whatsapp_number, base_currency")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex-1 px-8 py-10 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-semibold tracking-tight mb-8">Configuración</h1>

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
    </main>
  );
}

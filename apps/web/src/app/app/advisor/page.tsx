import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdvisorClient } from "./advisor-client";

export default async function AdvisorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users")
    .select("base_currency, ai_provider, ai_api_key_encrypted")
    .eq("id", user.id)
    .single();

  const hasKey = !!profile?.ai_api_key_encrypted;

  return (
    <main className="flex-1 px-8 py-10 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Asesor AI</h1>
      <p className="text-foreground/50 text-sm mb-8">
        Conecta tu propia clave de API para obtener consejos financieros personalizados.
      </p>
      <AdvisorClient hasKey={hasKey} currency={profile?.base_currency ?? "USD"} />
    </main>
  );
}

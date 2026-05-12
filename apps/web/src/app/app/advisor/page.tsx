import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdvisorClient } from "./advisor-client";
import { getUsage } from "./actions";

export default async function AdvisorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users")
    .select("base_currency")
    .eq("id", user.id)
    .single();

  const { used, limit } = await getUsage();

  return (
    <main className="flex-1 px-8 py-10 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Asesor IA</h1>
      <p className="text-foreground/50 text-sm mb-8">
        Consejos financieros personalizados basados en tus datos reales.
      </p>
      <AdvisorClient
        currency={profile?.base_currency ?? "USD"}
        initialUsed={used}
        limit={limit}
      />
    </main>
  );
}

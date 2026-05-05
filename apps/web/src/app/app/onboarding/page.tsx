import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Read current user record to prefill values and skip if already done.
  const { data: profile } = await supabase
    .from("users")
    .select("base_currency, locale, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/app/dashboard");
  }

  return (
    <OnboardingWizard
      defaultCurrency={profile?.base_currency ?? "USD"}
      defaultLocale={profile?.locale ?? "en"}
    />
  );
}

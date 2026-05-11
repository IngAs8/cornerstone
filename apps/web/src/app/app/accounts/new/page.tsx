import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "../account-form";

export default async function NewAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users").select("base_currency").eq("id", user.id).single();

  const { data: membership } = await supabase
    .from("household_members").select("household_id").eq("user_id", user.id).single();

  const { data: banks } = membership
    ? await supabase.from("banks").select("id, name")
        .eq("household_id", membership.household_id).order("name")
    : { data: null };

  return (
    <main className="flex-1 px-8 py-10 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-semibold tracking-tight mb-8">Nueva cuenta</h1>
      <AccountForm baseCurrency={profile?.base_currency ?? "USD"} banks={banks ?? []} />
    </main>
  );
}

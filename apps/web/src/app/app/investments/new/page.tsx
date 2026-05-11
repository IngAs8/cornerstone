import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortfolioForm } from "../portfolio-form";

export default async function NewPortfolioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return (
    <main className="flex-1 px-8 py-10 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-semibold tracking-tight mb-8">New Portfolio</h1>
      <PortfolioForm />
    </main>
  );
}

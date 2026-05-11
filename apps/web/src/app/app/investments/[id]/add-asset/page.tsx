import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddAssetForm } from "../../add-asset-form";

export default async function AddAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: portfolio } = await supabase
    .from("investments")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!portfolio) notFound();

  return (
    <main className="flex-1 px-8 py-10 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Add Asset</h1>
      <p className="text-foreground/50 text-sm mb-8">{portfolio.name}</p>
      <AddAssetForm portfolioId={id} />
    </main>
  );
}

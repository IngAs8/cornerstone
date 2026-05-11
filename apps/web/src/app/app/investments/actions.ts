"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createPortfolio(name: string, description?: string) {
  if (!name?.trim()) return { error: "Name is required" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();
  if (!membership) return { error: "Household not found" };

  const { data, error } = await supabase
    .from("investments")
    .insert({
      household_id: membership.household_id,
      name: name.trim(),
      description: description?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/app/investments");
  return { ok: true, id: data.id };
}

export async function deletePortfolio(id: string) {
  if (!id) return { error: "Missing ID" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("investments").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/app/investments");
  return { ok: true };
}

export async function addAsset(input: {
  investmentId: string;
  symbol: string;
  type: string;
  quantity: number;
  averageCost: number;
  currency: string;
  exchange?: string;
}) {
  if (!input.symbol?.trim()) return { error: "Symbol is required" };
  if (!Number.isFinite(input.quantity) || input.quantity <= 0)
    return { error: "Quantity must be greater than zero" };
  if (!Number.isFinite(input.averageCost) || input.averageCost < 0)
    return { error: "Invalid average cost" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("investment_assets").insert({
    investment_id: input.investmentId,
    symbol: input.symbol.toUpperCase().trim(),
    type: input.type,
    quantity: input.quantity,
    average_cost: input.averageCost,
    currency: input.currency,
    exchange: input.exchange?.trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/app/investments/${input.investmentId}`);
  return { ok: true };
}

export async function removeAsset(assetId: string, portfolioId: string) {
  if (!assetId) return { error: "Missing ID" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("investment_assets")
    .delete()
    .eq("id", assetId);

  if (error) return { error: error.message };

  revalidatePath(`/app/investments/${portfolioId}`);
  return { ok: true };
}

export async function cachePrices(
  prices: { symbol: string; type: string; priceUsd: number; change24hPercent: number | null }[]
) {
  const supabase = await createClient();

  const rows = prices.map((p) => ({
    symbol: p.symbol,
    type: p.type,
    price_usd: p.priceUsd,
    change_24h_percent: p.change24hPercent,
    last_updated_at: new Date().toISOString(),
  }));

  await supabase
    .from("asset_prices")
    .upsert(rows, { onConflict: "symbol" });
}

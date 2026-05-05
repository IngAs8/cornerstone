"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface UpsertTransactionInput {
  id?: string; // present = update
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  categoryId: string | null;
  description: string;
  date: string; // YYYY-MM-DD
}

export async function upsertTransaction(input: UpsertTransactionInput) {
  // Validate
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "Amount must be greater than zero" };
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) {
    return { error: "Invalid currency code" };
  }
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { error: "Invalid date" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Find user's household + base currency
  const { data: profile } = await supabase
    .from("users")
    .select("base_currency")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found" };

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();
  if (!membership) return { error: "Household not found" };

  // Compute amount in base currency.
  // For now: use 1.0 if same currency, otherwise look up exchange_rates.
  // (We'll wire real-time conversion via the cron job in a later step.)
  let amountBase = input.amount;
  let exchangeRate = 1;
  if (input.currency !== profile.base_currency) {
    const { data: rate } = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("base_currency", input.currency)
      .eq("target_currency", profile.base_currency)
      .order("date", { ascending: false })
      .limit(1)
      .single();
    if (rate) {
      exchangeRate = Number(rate.rate);
      amountBase = input.amount * exchangeRate;
    }
    // If no rate available, fall back to 1.0 (transparent to the user; we'll
    // surface a warning UI in a later iteration).
  }

  const row = {
    household_id: membership.household_id,
    user_id: user.id,
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    amount_base: amountBase,
    base_currency: profile.base_currency,
    exchange_rate: exchangeRate,
    category_id: input.categoryId,
    description: input.description || null,
    date: input.date,
    source: "manual" as const,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase
      .from("transactions")
      .update(row)
      .eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("transactions").insert(row);
    if (error) return { error: error.message };
  }

  revalidatePath("/app/transactions");
  revalidatePath("/app/dashboard");
  return { ok: true };
}

export async function deleteTransaction(id: string) {
  if (!id) return { error: "Missing id" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Soft delete (RLS scopes the row to the user's household).
  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/app/transactions");
  revalidatePath("/app/dashboard");
  return { ok: true };
}

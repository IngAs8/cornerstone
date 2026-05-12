"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface UpsertTransactionInput {
  id?: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  categoryId: string | null;
  description: string;
  date: string;
  accountId?: string | null;
}

export async function upsertTransaction(input: UpsertTransactionInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    return { error: "Amount must be greater than zero" };
  if (!/^[A-Z]{3}$/.test(input.currency))
    return { error: "Invalid currency code" };
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    return { error: "Invalid date" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("users").select("base_currency").eq("id", user.id).single();
  if (!profile) return { error: "Profile not found" };

  const { data: membership } = await supabase
    .from("household_members").select("household_id").eq("user_id", user.id).single();
  if (!membership) return { error: "Household not found" };

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
    account_id: input.accountId ?? null,
    updated_at: new Date().toISOString(),
  };

  // If updating, get the old transaction to reverse its balance effect
  if (input.id) {
    const { data: old } = await supabase
      .from("transactions")
      .select("account_id, amount, type")
      .eq("id", input.id)
      .single();

    if (old?.account_id) {
      await adjustAccountBalance(supabase, old.account_id, old.type, -Number(old.amount));
    }

    const { error } = await supabase.from("transactions").update(row).eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("transactions").insert(row);
    if (error) return { error: error.message };
  }

  // Apply balance effect for the new/updated account
  if (input.accountId) {
    await adjustAccountBalance(supabase, input.accountId, input.type, input.amount);
  }

  revalidatePath("/app/transactions");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/accounts");
  return { ok: true };
}

async function adjustAccountBalance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  txType: string,
  amount: number,
) {
  const { data: account } = await supabase
    .from("accounts")
    .select("current_balance, type")
    .eq("id", accountId)
    .single();

  if (!account) return;

  const current = Number(account.current_balance);
  let delta = 0;

  if (account.type === "credit_card") {
    // Credit card balance = debt owed. Expense increases it, income/payment reduces it.
    if (txType === "expense") delta = amount;
    else if (txType === "income") delta = -amount;
    // transfer reduces the balance (e.g., paying the card from checking)
    else if (txType === "transfer") delta = -amount;
  } else {
    // checking / savings / cash: income adds, expense/transfer removes
    if (txType === "income") delta = amount;
    else if (txType === "expense") delta = -amount;
    else if (txType === "transfer") delta = -amount;
  }

  await supabase
    .from("accounts")
    .update({ current_balance: current + delta })
    .eq("id", accountId);
}

export async function deleteTransaction(id: string) {
  if (!id) return { error: "Missing id" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Reverse balance effect before soft-deleting
  const { data: tx } = await supabase
    .from("transactions")
    .select("account_id, amount, type")
    .eq("id", id)
    .single();

  if (tx?.account_id) {
    await adjustAccountBalance(supabase, tx.account_id, tx.type, -Number(tx.amount));
  }

  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/app/transactions");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/accounts");
  return { ok: true };
}

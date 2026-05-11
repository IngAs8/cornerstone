"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getHousehold() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const, supabase, user: null, householdId: null };

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  return { supabase, user, householdId: membership?.household_id ?? null, error: null };
}

// ─── Banks ────────────────────────────────────────────────────────────────────

export async function createBank(name: string, color?: string) {
  if (!name?.trim()) return { error: "Name is required" };
  const { supabase, householdId, error } = await getHousehold();
  if (error || !householdId) return { error: error ?? "Household not found" };

  const { data, error: err } = await supabase
    .from("banks")
    .insert({ household_id: householdId, name: name.trim(), color: color ?? null })
    .select("id")
    .single();

  if (err) return { error: err.message };
  revalidatePath("/app/accounts");
  return { ok: true, id: data.id };
}

export async function deleteBank(id: string) {
  const { supabase, error } = await getHousehold();
  if (error) return { error };
  const { error: err } = await supabase.from("banks").delete().eq("id", id);
  if (err) return { error: err.message };
  revalidatePath("/app/accounts");
  return { ok: true };
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function createAccount(input: {
  bankId?: string;
  name: string;
  type: string;
  currency: string;
  currentBalance: number;
  creditLimit?: number;
  paymentDueDay?: number;
  minimumPayment?: number;
}) {
  if (!input.name?.trim()) return { error: "Name is required" };
  const { supabase, householdId, error } = await getHousehold();
  if (error || !householdId) return { error: error ?? "Household not found" };

  const { data, error: err } = await supabase
    .from("accounts")
    .insert({
      household_id: householdId,
      bank_id: input.bankId ?? null,
      name: input.name.trim(),
      type: input.type,
      currency: input.currency,
      current_balance: input.currentBalance,
      credit_limit: input.creditLimit ?? null,
      payment_due_day: input.paymentDueDay ?? null,
      minimum_payment: input.minimumPayment ?? null,
    })
    .select("id")
    .single();

  if (err) return { error: err.message };
  revalidatePath("/app/accounts");
  return { ok: true, id: data.id };
}

export async function updateAccount(id: string, input: {
  name?: string;
  currentBalance?: number;
  creditLimit?: number;
  paymentDueDay?: number;
  minimumPayment?: number;
}) {
  const { supabase, error } = await getHousehold();
  if (error) return { error };

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.currentBalance !== undefined) patch.current_balance = input.currentBalance;
  if (input.creditLimit !== undefined) patch.credit_limit = input.creditLimit;
  if (input.paymentDueDay !== undefined) patch.payment_due_day = input.paymentDueDay;
  if (input.minimumPayment !== undefined) patch.minimum_payment = input.minimumPayment;

  const { error: err } = await supabase.from("accounts").update(patch).eq("id", id);
  if (err) return { error: err.message };
  revalidatePath("/app/accounts");
  return { ok: true };
}

export async function deleteAccount(id: string) {
  const { supabase, error } = await getHousehold();
  if (error) return { error };
  const { error: err } = await supabase.from("accounts").delete().eq("id", id);
  if (err) return { error: err.message };
  revalidatePath("/app/accounts");
  return { ok: true };
}

// ─── Recurring payments ───────────────────────────────────────────────────────

export async function createRecurringPayment(input: {
  name: string;
  amount: number;
  currency: string;
  frequency: string;
  nextDate: string;
  accountId?: string;
  categoryId?: string;
}) {
  if (!input.name?.trim()) return { error: "Name is required" };
  if (!input.amount || input.amount <= 0) return { error: "Amount must be greater than zero" };

  const { supabase, householdId, error } = await getHousehold();
  if (error || !householdId) return { error: error ?? "Household not found" };

  const { error: err } = await supabase.from("recurring_payments").insert({
    household_id: householdId,
    name: input.name.trim(),
    amount: input.amount,
    currency: input.currency,
    frequency: input.frequency,
    next_date: input.nextDate,
    account_id: input.accountId ?? null,
    category_id: input.categoryId ?? null,
  });

  if (err) return { error: err.message };
  revalidatePath("/app/accounts");
  return { ok: true };
}

export async function deleteRecurringPayment(id: string) {
  const { supabase, error } = await getHousehold();
  if (error) return { error };
  const { error: err } = await supabase.from("recurring_payments").delete().eq("id", id);
  if (err) return { error: err.message };
  revalidatePath("/app/accounts");
  return { ok: true };
}

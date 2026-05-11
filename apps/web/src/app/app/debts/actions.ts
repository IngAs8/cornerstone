"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface DebtInput {
  name: string;
  type: string;
  currentBalance: number;
  currency: string;
  annualRate: number;
  rateType: string;
  minimumPayment: number;
  startDate: string;
  termMonths?: number | null;
  lender?: string;
  notes?: string;
}

export async function createDebt(input: DebtInput) {
  if (!input.name?.trim()) return { error: "Name is required" };
  if (!Number.isFinite(input.currentBalance) || input.currentBalance <= 0)
    return { error: "Balance must be greater than zero" };
  if (!Number.isFinite(input.annualRate) || input.annualRate < 0)
    return { error: "Invalid interest rate" };
  if (!Number.isFinite(input.minimumPayment) || input.minimumPayment < 0)
    return { error: "Invalid minimum payment" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();
  if (!membership) return { error: "Household not found" };

  const { data, error } = await supabase.from("debts").insert({
    household_id: membership.household_id,
    name: input.name.trim(),
    type: input.type,
    original_amount: input.currentBalance,
    current_balance: input.currentBalance,
    currency: input.currency,
    annual_rate: input.annualRate / 100, // store as decimal (e.g. 0.15 for 15%)
    rate_type: input.rateType,
    minimum_payment: input.minimumPayment,
    payment_frequency: "monthly",
    start_date: input.startDate,
    term_months: input.termMonths ?? null,
    lender: input.lender?.trim() || null,
    notes: input.notes?.trim() || null,
    is_active: true,
  }).select("id").single();

  if (error) return { error: error.message };

  revalidatePath("/app/debts");
  return { ok: true, id: data.id };
}

export async function updateDebt(id: string, input: Partial<DebtInput> & { currentBalance?: number }) {
  if (!id) return { error: "Missing ID" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.currentBalance !== undefined) patch.current_balance = input.currentBalance;
  if (input.annualRate !== undefined) patch.annual_rate = input.annualRate / 100;
  if (input.minimumPayment !== undefined) patch.minimum_payment = input.minimumPayment;
  if (input.termMonths !== undefined) patch.term_months = input.termMonths;
  if (input.lender !== undefined) patch.lender = input.lender?.trim() || null;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;

  const { error } = await supabase.from("debts").update(patch).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/app/debts");
  revalidatePath(`/app/debts/${id}`);
  return { ok: true };
}

export async function closeDebt(id: string) {
  if (!id) return { error: "Missing ID" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("debts")
    .update({ is_active: false, current_balance: 0, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/app/debts");
  return { ok: true };
}

export async function deleteDebt(id: string) {
  if (!id) return { error: "Missing ID" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("debts").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/app/debts");
  return { ok: true };
}

export async function recordPayment(debtId: string, amount: number, date: string, notes?: string) {
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Invalid amount" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get current debt to update balance
  const { data: debt } = await supabase
    .from("debts")
    .select("current_balance, annual_rate")
    .eq("id", debtId)
    .single();
  if (!debt) return { error: "Debt not found" };

  const monthlyRate = Number(debt.annual_rate) / 12;
  const balance = Number(debt.current_balance);
  const interest = balance * monthlyRate;
  const principal = Math.min(amount - interest, balance);
  const newBalance = Math.max(balance - principal, 0);

  const [paymentRes] = await Promise.all([
    supabase.from("debt_payments").insert({
      debt_id: debtId,
      amount,
      date,
      principal_portion: round2(principal),
      interest_portion: round2(interest),
      notes: notes?.trim() || null,
    }),
    supabase.from("debts").update({
      current_balance: round2(newBalance),
      is_active: newBalance > 0.01,
      updated_at: new Date().toISOString(),
    }).eq("id", debtId),
  ]);

  if (paymentRes.error) return { error: paymentRes.error.message };

  revalidatePath("/app/debts");
  revalidatePath(`/app/debts/${debtId}`);
  return { ok: true };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

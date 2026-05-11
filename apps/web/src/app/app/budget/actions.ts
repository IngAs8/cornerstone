"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateBudgetItem(budgetItemId: string, allocatedAmount: number) {
  if (!budgetItemId) return { error: "Missing budget item ID" };
  if (!Number.isFinite(allocatedAmount) || allocatedAmount < 0) {
    return { error: "Amount must be zero or greater" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("budget_items")
    .update({ allocated_amount: allocatedAmount })
    .eq("id", budgetItemId);

  if (error) return { error: error.message };

  revalidatePath("/app/budget");
  return { ok: true };
}

export async function addBudgetItem(budgetId: string, categoryId: string, allocatedAmount: number) {
  if (!budgetId || !categoryId) return { error: "Missing required fields" };
  if (!Number.isFinite(allocatedAmount) || allocatedAmount < 0) {
    return { error: "Amount must be zero or greater" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("budget_items")
    .insert({ budget_id: budgetId, category_id: categoryId, allocated_amount: allocatedAmount });

  if (error) return { error: error.message };

  revalidatePath("/app/budget");
  return { ok: true };
}

export async function removeBudgetItem(budgetItemId: string) {
  if (!budgetItemId) return { error: "Missing ID" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("budget_items")
    .delete()
    .eq("id", budgetItemId);

  if (error) return { error: error.message };

  revalidatePath("/app/budget");
  return { ok: true };
}

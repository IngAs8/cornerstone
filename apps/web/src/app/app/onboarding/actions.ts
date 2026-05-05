"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { suggestBudget503020 } from "@cornerstone/core";

interface CompleteOnboardingInput {
  baseCurrency: string;
  locale: string;
  monthlyIncome: number;
  methodology: "50_30_20" | "70_20_10" | "custom";
}

export async function completeOnboarding(input: CompleteOnboardingInput) {
  // Validate
  if (!/^[A-Z]{3}$/.test(input.baseCurrency)) {
    return { error: "Invalid currency code" };
  }
  if (input.monthlyIncome <= 0) {
    return { error: "Monthly income must be positive" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // 1. Update users.base_currency, locale, onboarding_completed
  const { error: userErr } = await supabase
    .from("users")
    .update({
      base_currency: input.baseCurrency,
      locale: input.locale,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (userErr) return { error: `Failed to update profile: ${userErr.message}` };

  // 2. Get the user's household (created by the auth trigger)
  const { data: membership, error: membershipErr } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  if (membershipErr || !membership) {
    return { error: "Household not found. Please contact support." };
  }

  // 3. Update household base_currency
  await supabase
    .from("households")
    .update({ base_currency: input.baseCurrency })
    .eq("id", membership.household_id);

  // 4. Create the current month's budget
  const today = new Date();
  const firstOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    .toISOString()
    .split("T")[0];

  const { data: budget, error: budgetErr } = await supabase
    .from("budgets")
    .insert({
      household_id: membership.household_id,
      month: firstOfMonth,
      methodology: input.methodology,
      total_income_expected: input.monthlyIncome,
      currency: input.baseCurrency,
    })
    .select("id")
    .single();

  if (budgetErr) {
    // If a budget for this month already exists, that's fine — continue.
    if (!budgetErr.message.includes("duplicate") && !budgetErr.message.includes("uniq_")) {
      return { error: `Failed to create budget: ${budgetErr.message}` };
    }
  }

  // 5. For 50/30/20 method, prefill budget items with suggested allocations.
  if (budget && input.methodology === "50_30_20") {
    const suggestion = suggestBudget503020(input.monthlyIncome);

    // Match suggestion category names to system categories (case-insensitive)
    const catNameMap: Record<string, string> = {
      "Housing / Rent": "Housing",
      "Utilities": "Utilities",
      "Groceries": "Groceries",
      "Transportation": "Transportation",
      "Insurance": "Insurance",
      "Dining Out": "Dining Out",
      "Entertainment": "Entertainment",
      "Shopping": "Shopping",
      "Hobbies": "Hobbies",
      "Emergency Fund": "Emergency Fund",
      "Investments": "Investments",
      "Long-term Goals": "Long-term Goals",
    };

    // Use service client to bypass RLS for category lookup (system categories
    // have household_id NULL but user can read them). Actually authenticated
    // user can read NULL household_id categories per RLS, so regular client works.
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name")
      .is("household_id", null)
      .eq("type", "expense");

    if (cats && cats.length > 0) {
      const items: Array<{ budget_id: string; category_id: string; allocated_amount: number }> = [];
      const allSuggestions = [...suggestion.needs, ...suggestion.wants, ...suggestion.savings];
      for (const sug of allSuggestions) {
        const targetName = catNameMap[sug.name] ?? sug.name;
        const cat = cats.find((c) => c.name === targetName);
        if (cat) {
          items.push({
            budget_id: budget.id,
            category_id: cat.id,
            allocated_amount: sug.amount,
          });
        }
      }
      if (items.length > 0) {
        // Service client bypasses RLS. We're authenticated and writing for this
        // household, so the regular insert should also work. Use service client
        // only if we hit RLS edge cases.
        await supabase.from("budget_items").insert(items);
      }
    }
  }

  revalidatePath("/app/dashboard");
  redirect("/app/dashboard");
}

// Service client is exported here but currently unused — reserved for the rare
// case where RLS blocks something legitimate.
export async function _serviceClient() {
  return createServiceClient();
}

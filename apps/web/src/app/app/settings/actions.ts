"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateWhatsAppNumber(phone: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Normalize: strip non-digits, keep country code
  const normalized = phone.replace(/\D/g, "");
  if (normalized.length < 7) return { error: "Número inválido" };

  const { error } = await supabase
    .from("users")
    .update({ whatsapp_number: normalized })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/app/settings");
  return { ok: true };
}

export async function removeWhatsAppNumber() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("users")
    .update({ whatsapp_number: null })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/app/settings");
  return { ok: true };
}

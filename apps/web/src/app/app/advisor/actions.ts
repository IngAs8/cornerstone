"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveApiKey(provider: string, apiKey: string) {
  if (!apiKey?.trim()) return { error: "La clave no puede estar vacía" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Store key encrypted via Supabase (stored as-is for now; production should use vault)
  const { error } = await supabase
    .from("users")
    .update({
      ai_provider: provider,
      ai_api_key_encrypted: apiKey.trim(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/app/advisor");
  return { ok: true };
}

export async function removeApiKey() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("users")
    .update({ ai_provider: null, ai_api_key_encrypted: null })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/app/advisor");
  return { ok: true };
}

export async function askAdvisor(question: string) {
  if (!question?.trim()) return { error: "Escribe una pregunta" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("users")
    .select("ai_provider, ai_api_key_encrypted, base_currency")
    .eq("id", user.id)
    .single();

  if (!profile?.ai_api_key_encrypted) return { error: "Configura tu clave de API primero" };

  // Fetch financial context
  const { data: membership } = await supabase
    .from("household_members").select("household_id").eq("user_id", user.id).single();

  const today = new Date();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10);

  const [{ data: txMonth }, { data: debts }, { data: accounts }] = await Promise.all([
    membership
      ? supabase.from("transactions")
          .select("type, amount_base, description")
          .eq("household_id", membership.household_id)
          .gte("date", monthStart)
          .is("deleted_at", null)
      : { data: null },
    membership
      ? supabase.from("debts")
          .select("name, current_balance, annual_rate, minimum_payment, currency")
          .eq("household_id", membership.household_id)
          .eq("is_active", true)
      : { data: null },
    membership
      ? supabase.from("accounts")
          .select("name, type, current_balance, currency")
          .eq("household_id", membership.household_id)
          .eq("is_active", true)
      : { data: null },
  ]);

  const income = (txMonth ?? []).filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount_base), 0);
  const expenses = (txMonth ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount_base), 0);

  const context = `
Moneda base: ${profile.base_currency ?? "USD"}
Mes actual — Ingresos: ${income.toFixed(2)}, Gastos: ${expenses.toFixed(2)}
Deudas activas: ${(debts ?? []).map((d) => `${d.name} (saldo: ${d.current_balance} ${d.currency}, tasa: ${(Number(d.annual_rate) * 100).toFixed(1)}%)`).join("; ") || "ninguna"}
Cuentas: ${(accounts ?? []).map((a) => `${a.name} (${a.type}: ${a.current_balance} ${a.currency})`).join("; ") || "ninguna"}
  `.trim();

  const systemPrompt = `Eres un asesor financiero personal experto. Responde en español, de forma concisa y práctica. Usa los datos financieros del usuario como contexto para dar consejos personalizados.\n\nDatos del usuario:\n${context}`;

  try {
    // Support Anthropic and OpenAI
    const provider = profile.ai_provider ?? "anthropic";

    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": profile.ai_api_key_encrypted,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: question }],
        }),
      });
      const data = await res.json() as { content?: { text: string }[]; error?: { message: string } };
      if (data.error) return { error: data.error.message };
      return { answer: data.content?.[0]?.text ?? "" };
    }

    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${profile.ai_api_key_encrypted}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
        }),
      });
      const data = await res.json() as { choices?: { message: { content: string } }[]; error?: { message: string } };
      if (data.error) return { error: data.error.message };
      return { answer: data.choices?.[0]?.message.content ?? "" };
    }

    return { error: "Proveedor no soportado" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al conectar con la API" };
  }
}

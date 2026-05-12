"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MONTHLY_LIMITS: Record<string, number> = {
  free: 10,
  personal: 50,
  family_s: 100,
  family_m: 100,
};

export async function getUsage(): Promise<{ used: number; limit: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { used: 0, limit: 0 };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ count }, { data: membership }] = await Promise.all([
    supabase
      .from("ai_conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .single(),
  ]);

  let plan = "free";
  if (membership?.household_id) {
    const { data: household } = await supabase
      .from("households")
      .select("subscription_plan")
      .eq("id", membership.household_id)
      .single();
    plan = household?.subscription_plan ?? "free";
  }

  return {
    used: count ?? 0,
    limit: MONTHLY_LIMITS[plan] ?? 10,
  };
}

export async function askAdvisor(question: string) {
  if (!question?.trim()) return { error: "Escribe una pregunta" };
  if (question.length > 1000) return { error: "Pregunta demasiado larga (máx. 1000 caracteres)" };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "Servicio de IA no configurado" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Per-user rate limit: max 5 questions per minute
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("ai_conversations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneMinuteAgo);

  if ((recentCount ?? 0) >= 5) {
    return { error: "Vas muy rápido. Espera un momento antes de hacer otra pregunta." };
  }

  // Check monthly usage limit
  const { used, limit } = await getUsage();
  if (used >= limit) {
    return { error: `Alcanzaste el límite de ${limit} consultas este mes. Actualiza tu plan para más.` };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("base_currency")
    .eq("id", user.id)
    .single();

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

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
Moneda base: ${profile?.base_currency ?? "USD"}
Mes actual — Ingresos: ${income.toFixed(2)}, Gastos: ${expenses.toFixed(2)}
Deudas activas: ${(debts ?? []).map((d) => `${d.name} (saldo: ${d.current_balance} ${d.currency}, tasa: ${(Number(d.annual_rate) * 100).toFixed(1)}%)`).join("; ") || "ninguna"}
Cuentas: ${(accounts ?? []).map((a) => `${a.name} (${a.type}: ${a.current_balance} ${a.currency})`).join("; ") || "ninguna"}
  `.trim();

  const systemPrompt = `Eres un asesor financiero personal experto. Responde en español, de forma concisa y práctica. Usa los datos financieros del usuario como contexto para dar consejos personalizados.\n\nDatos del usuario:\n${context}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
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

    const answer = data.content?.[0]?.text ?? "";

    // Save to ai_conversations for usage tracking
    await supabase.from("ai_conversations").insert({
      user_id: user.id,
      title: question.slice(0, 80),
      messages: [
        { role: "user", content: question },
        { role: "assistant", content: answer },
      ],
      input_tokens_total: 0,
      output_tokens_total: 0,
      cached_tokens_total: 0,
    });

    revalidatePath("/app/advisor");
    return { answer, used: used + 1, limit };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al conectar con la IA" };
  }
}

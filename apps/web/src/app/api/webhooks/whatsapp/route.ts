import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Service-role Supabase client — bypasses RLS for webhook processing
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── GET: webhook verification ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ─── POST: incoming messages ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();

  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const message = change?.value?.messages?.[0];

  // Ignore non-text messages and status updates
  if (!message || message.type !== "text") {
    return NextResponse.json({ ok: true });
  }

  const fromNumber = message.from as string; // e.g. "593XXXXXXXXX"
  const text = (message.text?.body as string ?? "").trim();

  if (!text) return NextResponse.json({ ok: true });

  const supabase = getSupabase();

  // Find user by WhatsApp number
  const { data: user } = await supabase
    .from("users")
    .select("id, base_currency")
    .eq("whatsapp_number", fromNumber)
    .single();

  if (!user) {
    await sendWhatsAppMessage(fromNumber,
      "No encontré tu cuenta. Vincula tu número de WhatsApp en Cornerstone → Configuración."
    );
    return NextResponse.json({ ok: true });
  }

  // Get household
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ ok: true });
  }

  // Get categories for context
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type")
    .or(`household_id.is.null,household_id.eq.${membership.household_id}`)
    .eq("type", "expense")
    .order("sort_order");

  const categoryList = (categories ?? [])
    .map((c) => `${c.name} (id: ${c.id})`)
    .join(", ");

  // Parse with Claude Haiku
  let parsed: ParsedExpense | null = null;
  try {
    parsed = await parseExpenseWithClaude(text, user.base_currency ?? "USD", categoryList);
  } catch (err) {
    console.error("[WhatsApp] Claude parse error:", err);
    await sendWhatsAppMessage(fromNumber, "No pude entender ese mensaje. Intenta con: \"Gasté $12 en almuerzo\"");
    return NextResponse.json({ ok: true });
  }

  if (!parsed) {
    await sendWhatsAppMessage(fromNumber,
      "No detecté un gasto. Escribe algo como: \"Gasté $15 en taxi\" o \"$8 café\""
    );
    return NextResponse.json({ ok: true });
  }

  // Save transaction
  const { error } = await supabase.from("transactions").insert({
    household_id: membership.household_id,
    user_id: user.id,
    type: "expense",
    amount: parsed.amount,
    currency: parsed.currency,
    description: parsed.description,
    category_id: parsed.categoryId ?? null,
    date: parsed.date,
    source: "whatsapp",
  });

  if (error) {
    await sendWhatsAppMessage(fromNumber, "Error al guardar. Intenta de nuevo.");
    return NextResponse.json({ ok: true });
  }

  const categoryName = (categories ?? []).find((c) => c.id === parsed!.categoryId)?.name ?? "Sin categoría";
  const dateStr = parsed.date === new Date().toISOString().slice(0, 10) ? "hoy" : parsed.date;

  await sendWhatsAppMessage(fromNumber,
    `✅ Registrado: ${parsed.currency} ${parsed.amount.toFixed(2)} en ${categoryName} · ${dateStr}`
  );

  return NextResponse.json({ ok: true });
}

// ─── Claude Haiku parser ──────────────────────────────────────────────────────
interface ParsedExpense {
  amount: number;
  currency: string;
  description: string;
  categoryId: string | null;
  date: string; // YYYY-MM-DD
}

async function parseExpenseWithClaude(
  text: string,
  baseCurrency: string,
  categoryList: string
): Promise<ParsedExpense | null> {
  const today = new Date().toISOString().slice(0, 10);

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Extrae el gasto de este mensaje de WhatsApp. Responde SOLO con JSON válido o "null" si no es un gasto.

Mensaje: "${text}"
Fecha de hoy: ${today}
Moneda base del usuario: ${baseCurrency}
Categorías disponibles: ${categoryList}

JSON esperado:
{
  "amount": <número positivo>,
  "currency": "<código ISO, usa ${baseCurrency} si no se especifica>",
  "description": "<descripción corta del gasto>",
  "categoryId": "<id de la categoría más apropiada o null>",
  "date": "<YYYY-MM-DD, usa hoy si no se especifica>"
}

Responde SOLO con el JSON o con null.`,
      },
    ],
  });

  const content = response.content[0];
  if (content?.type !== "text") return null;

  const raw = content.text.trim();
  if (raw === "null") return null;

  const parsed = JSON.parse(raw) as ParsedExpense;
  if (!parsed.amount || parsed.amount <= 0) return null;

  return parsed;
}

// ─── Send WhatsApp message ────────────────────────────────────────────────────
async function sendWhatsAppMessage(to: string, text: string) {
  await fetch(
    `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    }
  );
}

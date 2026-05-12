"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAdvisor } from "./actions";

const SUGGESTED = [
  "¿Cómo puedo reducir mis gastos este mes?",
  "¿Cuál deuda debería pagar primero?",
  "¿Estoy ahorrando suficiente?",
  "Dame un plan para pagar mis deudas en 12 meses",
];

export function AdvisorClient({
  currency,
  initialUsed,
  limit,
}: {
  currency: string;
  initialUsed: number;
  limit: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState(initialUsed);

  const remaining = limit - used;
  const atLimit = remaining <= 0;

  function ask(q?: string) {
    const text = q ?? question;
    if (!text.trim()) return;
    setError(null);
    setAnswer(null);
    startTransition(async () => {
      const result = await askAdvisor(text);
      if (result.error) { setError(result.error); return; }
      setAnswer(result.answer ?? null);
      if (result.used !== undefined) setUsed(result.used);
    });
  }

  return (
    <div className="space-y-6">
      {/* Usage indicator */}
      <div className="flex items-center justify-between text-xs text-foreground/40">
        <span>Consultas este mes</span>
        <span className={remaining <= 3 ? "text-amber-400" : ""}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${remaining <= 3 ? "bg-amber-400" : "bg-emerald-500"}`}
          style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
        />
      </div>

      {atLimit && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-400">
          Alcanzaste el límite de {limit} consultas este mes. Actualiza tu plan para más.
        </div>
      )}

      {/* Suggested questions */}
      <div>
        <p className="text-xs text-foreground/40 uppercase tracking-widest mb-3">Preguntas frecuentes</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => { setQuestion(s); ask(s); }}
              disabled={isPending || atLimit}
              className="text-xs px-3 py-1.5 rounded-full border border-foreground/10 hover:border-foreground/30 text-foreground/60 hover:text-foreground transition-colors disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div>
        <div className="flex gap-2">
          <Input
            placeholder="Pregúntame sobre tus finanzas…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !isPending) ask(); }}
            disabled={atLimit}
          />
          <Button onClick={() => ask()} disabled={isPending || !question.trim() || atLimit}>
            {isPending ? "…" : "Preguntar"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-md">{error}</p>
      )}

      {answer && (
        <div className="rounded-lg border border-foreground/10 p-5 bg-foreground/3">
          <p className="text-xs text-foreground/40 mb-2 uppercase tracking-widest">Respuesta</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
        </div>
      )}
    </div>
  );
}

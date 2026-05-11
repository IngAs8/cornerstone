"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { saveApiKey, removeApiKey, askAdvisor } from "./actions";

const SUGGESTED = [
  "¿Cómo puedo reducir mis gastos este mes?",
  "¿Cuál deuda debería pagar primero?",
  "¿Estoy ahorrando suficiente?",
  "Dame un plan para pagar mis deudas en 12 meses",
];

export function AdvisorClient({ hasKey, currency }: { hasKey: boolean; currency: string }) {
  const [isPending, startTransition] = useTransition();
  const [showKeyForm, setShowKeyForm] = useState(!hasKey);
  const [provider, setProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  function saveKey() {
    setKeyError(null);
    if (!apiKey.trim()) { setKeyError("Ingresa tu clave de API"); return; }
    startTransition(async () => {
      const result = await saveApiKey(provider, apiKey);
      if (result.error) { setKeyError(result.error); return; }
      setShowKeyForm(false);
      setApiKey("");
    });
  }

  function ask(q?: string) {
    const text = q ?? question;
    setAskError(null);
    setAnswer(null);
    startTransition(async () => {
      const result = await askAdvisor(text);
      if (result.error) { setAskError(result.error); return; }
      setAnswer(result.answer ?? null);
    });
  }

  return (
    <div className="space-y-6">
      {/* API Key section */}
      <div className="rounded-lg border border-foreground/10 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold">Tu clave de API</h2>
            <p className="text-xs text-foreground/50 mt-0.5">
              {hasKey && !showKeyForm ? "✓ Clave configurada" : "Conecta tu propia cuenta — tú controlas el costo"}
            </p>
          </div>
          {hasKey && !showKeyForm && (
            <div className="flex gap-2">
              <button onClick={() => setShowKeyForm(true)} className="text-xs text-foreground/50 hover:text-foreground">Cambiar</button>
              <button
                onClick={() => { if (confirm("¿Eliminar clave?")) startTransition(async () => { await removeApiKey(); }); }}
                className="text-xs text-foreground/30 hover:text-red-400"
              >
                Eliminar
              </button>
            </div>
          )}
        </div>

        {showKeyForm && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="provider">Proveedor</Label>
              <Select id="provider" value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="anthropic">Anthropic (Claude) — recomendado</option>
                <option value="openai">OpenAI (GPT-4o mini)</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="apiKey">
                {provider === "anthropic" ? "Clave Anthropic (sk-ant-...)" : "Clave OpenAI (sk-...)"}
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={provider === "anthropic" ? "sk-ant-api03-..." : "sk-..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-foreground/40 mt-1">
                {provider === "anthropic"
                  ? "Obtén tu clave en console.anthropic.com → API Keys"
                  : "Obtén tu clave en platform.openai.com → API Keys"}
              </p>
            </div>
            {keyError && <p className="text-sm text-red-600">{keyError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={saveKey} disabled={isPending}>
                {isPending ? "Guardando…" : "Guardar clave"}
              </Button>
              {hasKey && (
                <Button size="sm" variant="ghost" onClick={() => setShowKeyForm(false)}>Cancelar</Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat section */}
      {(hasKey || !showKeyForm) && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="question">¿Qué quieres saber?</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="question"
                placeholder="Pregúntame sobre tus finanzas…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !isPending) ask(); }}
              />
              <Button onClick={() => ask()} disabled={isPending || !question.trim()}>
                {isPending ? "…" : "Preguntar"}
              </Button>
            </div>
          </div>

          {/* Suggested questions */}
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => { setQuestion(s); ask(s); }}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded-full border border-foreground/10 hover:border-foreground/30 text-foreground/60 hover:text-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {askError && (
            <p className="text-sm text-red-600 bg-red-500/10 px-3 py-2 rounded-md">{askError}</p>
          )}

          {answer && (
            <div className="rounded-lg border border-foreground/10 p-5 bg-foreground/3">
              <p className="text-xs text-foreground/40 mb-2 uppercase tracking-widest">Respuesta</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

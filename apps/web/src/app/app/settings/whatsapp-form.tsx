"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateWhatsAppNumber, removeWhatsAppNumber } from "./actions";

export function WhatsAppForm({ current }: { current: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [phone, setPhone] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function save() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateWhatsAppNumber(phone);
      if (result.error) { setError(result.error); return; }
      setSuccess(true);
    });
  }

  function remove() {
    if (!confirm("¿Desvincular número de WhatsApp?")) return;
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await removeWhatsAppNumber();
      if (result.error) { setError(result.error); return; }
      setPhone("");
      setSuccess(true);
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="phone">Número de WhatsApp</Label>
        <p className="text-xs text-foreground/50 mb-2">
          Incluye el código de país sin + (ej: 593XXXXXXXXX para Ecuador)
        </p>
        <div className="flex gap-2">
          <Input
            id="phone"
            inputMode="tel"
            placeholder="593XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            className="flex-1"
          />
          <Button onClick={save} disabled={isPending || !phone}>
            {isPending ? "Guardando…" : "Guardar"}
          </Button>
          {current && (
            <Button variant="ghost" onClick={remove} disabled={isPending}>
              Desvincular
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-500/10 px-3 py-2 rounded-md">{error}</p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 bg-emerald-500/10 px-3 py-2 rounded-md">
          ✓ Guardado correctamente
        </p>
      )}
    </div>
  );
}

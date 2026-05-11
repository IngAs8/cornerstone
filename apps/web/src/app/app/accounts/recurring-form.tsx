"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CurrencySelector } from "@/components/finance/currency-selector";
import { createRecurringPayment } from "./actions";

const FREQUENCIES = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
];

interface RecurringFormProps {
  baseCurrency: string;
  accounts: { id: string; name: string; type: string }[];
  onDone: () => void;
}

export function RecurringForm({ baseCurrency, accounts, onDone }: RecurringFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [frequency, setFrequency] = useState("monthly");
  const [nextDate, setNextDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState("");

  function submit() {
    setError(null);
    const amountNum = parseFloat(amount.replace(/,/g, ""));
    if (!name.trim()) { setError("El nombre es requerido"); return; }
    if (!Number.isFinite(amountNum) || amountNum <= 0) { setError("Monto inválido"); return; }

    startTransition(async () => {
      const result = await createRecurringPayment({
        name,
        amount: amountNum,
        currency,
        frequency,
        nextDate,
        accountId: accountId || undefined,
      });
      if (result.error) { setError(result.error); return; }
      onDone();
    });
  }

  return (
    <div className="space-y-4 p-4 rounded-lg border border-foreground/10 bg-foreground/3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="rName">Nombre del pago</Label>
          <Input
            id="rName"
            placeholder="ej. Netflix, arriendo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="rFreq">Frecuencia</Label>
          <Select id="rFreq" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="rAmount">Monto</Label>
          <Input
            id="rAmount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
          />
        </div>
        <div>
          <Label htmlFor="rCurrency">Moneda</Label>
          <CurrencySelector id="rCurrency" name="rCurrency" value={currency} onValueChange={setCurrency} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="rDate">Próximo pago</Label>
          <Input
            id="rDate"
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
          />
        </div>
        {accounts.length > 0 && (
          <div>
            <Label htmlFor="rAccount">Cuenta (opcional)</Label>
            <Select id="rAccount" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Sin cuenta</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={submit} disabled={isPending}>
          {isPending ? "Guardando…" : "Agregar pago"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancelar</Button>
      </div>
    </div>
  );
}

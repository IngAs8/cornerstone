"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CurrencySelector } from "@/components/finance/currency-selector";
import { createAccount } from "./actions";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Cuenta corriente" },
  { value: "savings", label: "Cuenta de ahorros" },
  { value: "credit_card", label: "Tarjeta de crédito" },
  { value: "cash", label: "Efectivo / Caja chica" },
  { value: "other", label: "Otra" },
];

interface AccountFormProps {
  baseCurrency: string;
  banks: { id: string; name: string }[];
}

export function AccountForm({ baseCurrency, banks }: AccountFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [bankId, setBankId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const [currency, setCurrency] = useState(baseCurrency);
  const [balance, setBalance] = useState("0");
  const [creditLimit, setCreditLimit] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("");
  const [minimumPayment, setMinimumPayment] = useState("");

  const isCreditCard = type === "credit_card";

  function submit() {
    setError(null);
    const balanceNum = parseFloat(balance.replace(/,/g, "")) || 0;

    if (!name.trim()) { setError("El nombre es requerido"); return; }

    startTransition(async () => {
      const result = await createAccount({
        bankId: bankId || undefined,
        name,
        type,
        currency,
        currentBalance: balanceNum,
        creditLimit: isCreditCard && creditLimit ? parseFloat(creditLimit.replace(/,/g, "")) : undefined,
        paymentDueDay: isCreditCard && paymentDueDay ? parseInt(paymentDueDay) : undefined,
        minimumPayment: isCreditCard && minimumPayment ? parseFloat(minimumPayment.replace(/,/g, "")) : undefined,
      });

      if (result.error) { setError(result.error); return; }
      router.push("/app/accounts");
      router.refresh();
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="name">Nombre de la cuenta</Label>
          <Input
            id="name"
            placeholder="ej. Cuenta nómina"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="type">Tipo</Label>
          <Select id="type" value={type} onChange={(e) => setType(e.target.value)}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {banks.length > 0 && type !== "cash" && (
        <div>
          <Label htmlFor="bank">Banco (opcional)</Label>
          <Select id="bank" value={bankId} onChange={(e) => setBankId(e.target.value)}>
            <option value="">Sin banco</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
        </div>
      )}
      {type === "cash" && (
        <p className="text-xs text-foreground/40 bg-foreground/5 px-3 py-2 rounded-md">
          Las cuentas de efectivo no necesitan banco — úsalas para dinero en mano, billetera o caja chica.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="balance">{isCreditCard ? "Deuda actual" : "Saldo actual"}</Label>
          <Input
            id="balance"
            inputMode="decimal"
            placeholder="0.00"
            value={balance}
            onChange={(e) => setBalance(e.target.value.replace(/[^\d.,]/g, ""))}
          />
        </div>
        <div>
          <Label htmlFor="currency">Moneda</Label>
          <CurrencySelector id="currency" name="currency" value={currency} onValueChange={setCurrency} />
        </div>
      </div>

      {isCreditCard && (
        <div className="rounded-lg border border-foreground/10 p-4 space-y-4">
          <p className="text-xs uppercase tracking-widest text-foreground/40">Tarjeta de crédito</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="creditLimit">Cupo total</Label>
              <Input
                id="creditLimit"
                inputMode="decimal"
                placeholder="0.00"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value.replace(/[^\d.,]/g, ""))}
              />
            </div>
            <div>
              <Label htmlFor="paymentDueDay">Día de pago (1-31)</Label>
              <Input
                id="paymentDueDay"
                inputMode="numeric"
                placeholder="ej. 15"
                value={paymentDueDay}
                onChange={(e) => setPaymentDueDay(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="minimumPayment">Pago mínimo mensual</Label>
            <Input
              id="minimumPayment"
              inputMode="decimal"
              placeholder="0.00"
              value={minimumPayment}
              onChange={(e) => setMinimumPayment(e.target.value.replace(/[^\d.,]/g, ""))}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-500/10 px-3 py-2 rounded-md">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Agregar cuenta"}
        </Button>
      </div>
    </form>
  );
}

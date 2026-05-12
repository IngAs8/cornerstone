"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CurrencySelector } from "@/components/finance/currency-selector";
import { upsertTransaction } from "./actions";

interface CategoryOption {
  id: string;
  name: string;
  type: "income" | "expense";
  bucket: "needs" | "wants" | "savings" | null;
}

interface AccountOption {
  id: string;
  name: string;
  type: string;
  currency: string;
  current_balance: number;
}

interface TransactionFormProps {
  baseCurrency: string;
  categories: CategoryOption[];
  accounts: AccountOption[];
  initial?: {
    id: string;
    type: "income" | "expense" | "transfer";
    amount: number;
    currency: string;
    categoryId: string | null;
    description: string;
    date: string;
    accountId: string | null;
  };
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  checking: "Corriente",
  savings: "Ahorros",
  credit_card: "Tarjeta de crédito",
  cash: "Efectivo",
  other: "Otra",
};

export function TransactionForm({ baseCurrency, categories, accounts, initial }: TransactionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<"income" | "expense" | "transfer">(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? baseCurrency);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().split("T")[0] as string);
  const [accountId, setAccountId] = useState(initial?.accountId ?? "" as string);

  const filteredCategories = useMemo(
    () => categories.filter((c) => (type === "transfer" ? true : c.type === type)),
    [categories, type]
  );

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isCreditCard = selectedAccount?.type === "credit_card";

  // Label hint for credit card transactions
  const creditCardHint = isCreditCard
    ? type === "expense"
      ? "Se cargará a la tarjeta (aumenta deuda)"
      : type === "income"
      ? "Pago a la tarjeta (reduce deuda)"
      : "Pago a la tarjeta"
    : null;

  function submit() {
    setError(null);
    const amountNum = Number(amount.replace(/,/g, ""));
    if (!amountNum || amountNum <= 0) {
      setError("Ingresa un monto mayor a cero");
      return;
    }
    startTransition(async () => {
      const result = await upsertTransaction({
        id: initial?.id,
        type,
        amount: amountNum,
        currency,
        categoryId: categoryId || null,
        description,
        date,
        accountId: accountId || null,
      });
      if (result.error) { setError(result.error); return; }
      router.push("/app/transactions");
      router.refresh();
    });
  }

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      {/* Type */}
      <div>
        <Label>Tipo</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["expense", "income", "transfer"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setCategoryId(""); }}
              className={
                "px-3 py-2 rounded-md text-sm font-medium transition-colors " +
                (type === t ? "bg-foreground text-background" : "bg-foreground/5 hover:bg-foreground/10")
              }
            >
              {t === "expense" ? "Gasto" : t === "income" ? "Ingreso" : "Transferencia"}
            </button>
          ))}
        </div>
      </div>

      {/* Amount + currency */}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <Label htmlFor="amount">Monto</Label>
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="currency">Moneda</Label>
          <CurrencySelector id="currency" name="currency" value={currency} onValueChange={setCurrency} />
        </div>
      </div>

      {/* Account */}
      <div>
        <Label htmlFor="account">Cuenta</Label>
        <Select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">— Sin cuenta específica —</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {ACCOUNT_TYPE_LABEL[a.type] ?? a.type}
            </option>
          ))}
        </Select>
        {creditCardHint && (
          <p className="text-xs text-amber-400 mt-1">{creditCardHint}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <Label htmlFor="category">Categoría</Label>
        <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">— Seleccionar categoría —</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.bucket ? ` · ${c.bucket}` : ""}
            </option>
          ))}
        </Select>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Input
          id="description"
          placeholder="ej. Almuerzo con el equipo"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Date */}
      <div>
        <Label htmlFor="date">Fecha</Label>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-md">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : initial ? "Guardar cambios" : "Agregar transacción"}
        </Button>
      </div>
    </form>
  );
}

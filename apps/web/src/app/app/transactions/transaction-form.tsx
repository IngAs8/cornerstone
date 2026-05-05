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

interface TransactionFormProps {
  baseCurrency: string;
  categories: CategoryOption[];
  initial?: {
    id: string;
    type: "income" | "expense" | "transfer";
    amount: number;
    currency: string;
    categoryId: string | null;
    description: string;
    date: string;
  };
}

export function TransactionForm({
  baseCurrency,
  categories,
  initial,
}: TransactionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<"income" | "expense" | "transfer">(
    initial?.type ?? "expense"
  );
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? baseCurrency);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(
    initial?.date ?? new Date().toISOString().split("T")[0]
  );

  const filteredCategories = useMemo(
    () =>
      categories.filter((c) => (type === "transfer" ? true : c.type === type)),
    [categories, type]
  );

  function submit() {
    setError(null);
    const amountNum = Number(amount.replace(/,/g, ""));
    if (!amountNum || amountNum <= 0) {
      setError("Enter an amount greater than zero");
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
        date: date as string,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/app/transactions");
      router.refresh();
    });
  }

  return (
    <form
      action={submit}
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {/* Type selector — buttons */}
      <div>
        <Label>Type</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["expense", "income", "transfer"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setCategoryId(""); // reset category when type changes
              }}
              className={
                "px-3 py-2 rounded-md text-sm font-medium transition-colors " +
                (type === t
                  ? "bg-foreground text-background"
                  : "bg-foreground/5 hover:bg-foreground/10")
              }
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Amount + currency */}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <Label htmlFor="amount">Amount</Label>
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
          <Label htmlFor="currency">Currency</Label>
          <CurrencySelector
            id="currency"
            name="currency"
            value={currency}
            onValueChange={setCurrency}
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <Label htmlFor="category">Category</Label>
        <Select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">— Select category —</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.bucket ? ` · ${c.bucket}` : ""}
            </option>
          ))}
        </Select>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Input
          id="description"
          placeholder="e.g., Lunch with team"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Date */}
      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-500/10 px-3 py-2 rounded-md">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : initial ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
}

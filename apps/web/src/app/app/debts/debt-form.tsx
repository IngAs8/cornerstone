"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CurrencySelector } from "@/components/finance/currency-selector";
import { createDebt, updateDebt } from "./actions";

const DEBT_TYPES = [
  { value: "credit_card", label: "Credit Card" },
  { value: "personal_loan", label: "Personal Loan" },
  { value: "mortgage", label: "Mortgage" },
  { value: "auto_loan", label: "Auto Loan" },
  { value: "student_loan", label: "Student Loan" },
  { value: "short_term", label: "Short-term Loan" },
  { value: "long_term", label: "Long-term Loan" },
  { value: "other", label: "Other" },
];

interface DebtFormProps {
  baseCurrency: string;
  initial?: {
    id: string;
    name: string;
    type: string;
    currentBalance: number;
    currency: string;
    annualRate: number; // stored as decimal, e.g. 0.15
    rateType: string;
    minimumPayment: number;
    startDate: string;
    termMonths: number | null;
    lender: string | null;
  };
}

export function DebtForm({ baseCurrency, initial }: DebtFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "credit_card");
  const [balance, setBalance] = useState(
    initial ? initial.currentBalance.toFixed(2) : ""
  );
  const [currency, setCurrency] = useState(initial?.currency ?? baseCurrency);
  const [annualRate, setAnnualRate] = useState(
    initial ? (initial.annualRate * 100).toFixed(2) : ""
  );
  const [rateType, setRateType] = useState(initial?.rateType ?? "fixed");
  const [minPayment, setMinPayment] = useState(
    initial ? initial.minimumPayment.toFixed(2) : ""
  );
  const [startDate, setStartDate] = useState<string>(
    initial?.startDate ?? new Date().toISOString().slice(0, 10)
  );
  const [termMonths, setTermMonths] = useState(
    initial?.termMonths?.toString() ?? ""
  );
  const [lender, setLender] = useState(initial?.lender ?? "");

  function submit() {
    setError(null);
    const balanceNum = parseFloat(balance.replace(/,/g, ""));
    const rateNum = parseFloat(annualRate.replace(/,/g, ""));
    const paymentNum = parseFloat(minPayment.replace(/,/g, ""));

    if (!name.trim()) { setError("Name is required"); return; }
    if (!Number.isFinite(balanceNum) || balanceNum <= 0) {
      setError("Enter a valid balance greater than zero");
      return;
    }
    if (!Number.isFinite(rateNum) || rateNum < 0) {
      setError("Enter a valid annual rate (0 or greater)");
      return;
    }
    if (!Number.isFinite(paymentNum) || paymentNum < 0) {
      setError("Enter a valid minimum payment");
      return;
    }

    const payload = {
      name,
      type,
      currentBalance: balanceNum,
      currency,
      annualRate: rateNum,
      rateType,
      minimumPayment: paymentNum,
      startDate: startDate ?? new Date().toISOString().split("T")[0],
      termMonths: termMonths ? parseInt(termMonths) : null,
      lender,
    };

    startTransition(async () => {
      const result = initial
        ? await updateDebt(initial.id, payload)
        : await createDebt(payload);

      if (result.error) { setError(result.error); return; }
      router.push("/app/debts");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      className="space-y-5"
    >
      <div>
        <Label htmlFor="name">Debt name</Label>
        <Input
          id="name"
          placeholder="e.g. Visa credit card"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <Label htmlFor="type">Type</Label>
        <Select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {DEBT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="balance">Current balance</Label>
          <Input
            id="balance"
            inputMode="decimal"
            placeholder="0.00"
            value={balance}
            onChange={(e) => setBalance(e.target.value.replace(/[^\d.,]/g, ""))}
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="rate">Annual interest rate (%)</Label>
          <Input
            id="rate"
            inputMode="decimal"
            placeholder="e.g. 18.5"
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value.replace(/[^\d.,]/g, ""))}
          />
        </div>
        <div>
          <Label htmlFor="rateType">Rate type</Label>
          <Select
            id="rateType"
            value={rateType}
            onChange={(e) => setRateType(e.target.value)}
          >
            <option value="fixed">Fixed</option>
            <option value="variable">Variable</option>
            <option value="mixed">Mixed</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="minPayment">Minimum monthly payment</Label>
          <Input
            id="minPayment"
            inputMode="decimal"
            placeholder="0.00"
            value={minPayment}
            onChange={(e) => setMinPayment(e.target.value.replace(/[^\d.,]/g, ""))}
          />
        </div>
        <div>
          <Label htmlFor="termMonths">Term (months, optional)</Label>
          <Input
            id="termMonths"
            inputMode="numeric"
            placeholder="e.g. 60"
            value={termMonths}
            onChange={(e) => setTermMonths(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="lender">Lender (optional)</Label>
          <Input
            id="lender"
            placeholder="e.g. Bank of America"
            value={lender}
            onChange={(e) => setLender(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-500/10 px-3 py-2 rounded-md">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : initial ? "Save changes" : "Add debt"}
        </Button>
      </div>
    </form>
  );
}

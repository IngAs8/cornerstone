"use client";

import { useState, useTransition } from "react";
import { CurrencySelector } from "@/components/finance/currency-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { completeOnboarding } from "./actions";

interface OnboardingWizardProps {
  defaultCurrency: string;
  defaultLocale: string;
}

type Methodology = "50_30_20" | "70_20_10" | "custom";

export function OnboardingWizard({ defaultCurrency, defaultLocale }: OnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [income, setIncome] = useState("");
  const [methodology, setMethodology] = useState<Methodology>("50_30_20");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const incomeNum = Number(income.replace(/,/g, ""));

  function next() {
    setError(null);
    if (step === 1) {
      if (!currency) return setError("Please select a currency");
      setStep(2);
    } else if (step === 2) {
      if (!incomeNum || incomeNum <= 0) return setError("Please enter a valid income");
      setStep(3);
    }
  }

  function back() {
    setError(null);
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding({
        baseCurrency: currency,
        locale: defaultLocale,
        monthlyIncome: incomeNum,
        methodology,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={
                "h-1.5 w-12 rounded-full transition-colors " +
                (n <= step ? "bg-foreground" : "bg-foreground/15")
              }
            />
          ))}
        </div>

        <Card className="p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  Pick your base currency
                </h2>
                <p className="text-sm text-foreground/60 mt-1">
                  This is the currency we use to convert and summarize all your
                  finances. You can still record transactions in any currency.
                </p>
              </div>
              <div>
                <Label htmlFor="currency-select">Currency</Label>
                <CurrencySelector
                  id="currency-select"
                  name="currency"
                  value={currency}
                  onValueChange={setCurrency}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  What&apos;s your monthly income?
                </h2>
                <p className="text-sm text-foreground/60 mt-1">
                  After taxes, in {currency}. We use this to build your starting
                  budget. You can change it anytime.
                </p>
              </div>
              <div>
                <Label htmlFor="income">Monthly income ({currency})</Label>
                <Input
                  id="income"
                  inputMode="decimal"
                  placeholder="3500"
                  value={income}
                  onChange={(e) => setIncome(e.target.value.replace(/[^\d.,]/g, ""))}
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  How do you want to budget?
                </h2>
                <p className="text-sm text-foreground/60 mt-1">
                  Pick a methodology — we&apos;ll prefill categories for you.
                  You can always customize later.
                </p>
              </div>
              <div className="space-y-2">
                <MethodologyOption
                  id="m-503020"
                  value="50_30_20"
                  selected={methodology}
                  onChange={setMethodology}
                  title="50 / 30 / 20"
                  description="50% needs · 30% wants · 20% savings. The classic."
                  recommended
                />
                <MethodologyOption
                  id="m-702010"
                  value="70_20_10"
                  selected={methodology}
                  onChange={setMethodology}
                  title="70 / 20 / 10"
                  description="70% living · 20% savings · 10% debt or giving. Simpler."
                />
                <MethodologyOption
                  id="m-custom"
                  value="custom"
                  selected={methodology}
                  onChange={setMethodology}
                  title="Custom"
                  description="Set up your own categories from scratch."
                />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-500/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between mt-8">
            {step > 1 ? (
              <Button variant="ghost" onClick={back} disabled={isPending}>
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <Button onClick={next}>Continue</Button>
            ) : (
              <Button onClick={submit} disabled={isPending}>
                {isPending ? "Setting up..." : "Finish"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}

function MethodologyOption({
  id,
  value,
  selected,
  onChange,
  title,
  description,
  recommended,
}: {
  id: string;
  value: Methodology;
  selected: Methodology;
  onChange: (v: Methodology) => void;
  title: string;
  description: string;
  recommended?: boolean;
}) {
  const isSelected = selected === value;
  return (
    <label
      htmlFor={id}
      className={
        "block cursor-pointer rounded-md border px-4 py-3 transition-colors " +
        (isSelected
          ? "border-foreground bg-foreground/5"
          : "border-foreground/15 hover:border-foreground/30")
      }
    >
      <input
        id={id}
        type="radio"
        name="methodology"
        value={value}
        checked={isSelected}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium flex items-center gap-2">
            {title}
            {recommended && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-foreground/10">
                Recommended
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/60 mt-0.5">{description}</p>
        </div>
        <div
          className={
            "mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 " +
            (isSelected ? "border-foreground bg-foreground" : "border-foreground/30")
          }
        />
      </div>
    </label>
  );
}

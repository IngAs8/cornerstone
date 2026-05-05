"use client";

import { useId, type ChangeEvent } from "react";
import { CURRENCIES, flagEmoji } from "@/lib/currencies";
import { Select } from "@/components/ui/select";

interface CurrencySelectorProps {
  name: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  id?: string;
}

export function CurrencySelector({
  name,
  value,
  defaultValue = "USD",
  onValueChange,
  required,
  id: idProp,
}: CurrencySelectorProps) {
  const fallbackId = useId();
  const id = idProp ?? `currency-${fallbackId}`;

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onValueChange?.(e.target.value);
  };

  return (
    <Select
      id={id}
      name={name}
      value={value}
      defaultValue={value === undefined ? defaultValue : undefined}
      onChange={handleChange}
      required={required}
    >
      {CURRENCIES.map((currency) => (
        <option key={currency.code} value={currency.code}>
          {flagEmoji(currency.flag)} {currency.code} — {currency.name}
        </option>
      ))}
    </Select>
  );
}

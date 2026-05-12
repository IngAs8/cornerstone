"use client";

import { useId, useState, useRef, useEffect } from "react";
import { CURRENCIES, flagEmoji } from "@/lib/currencies";

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

  const current = value ?? defaultValue;
  const currentInfo = CURRENCIES.find((c) => c.code === current);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(query.toLowerCase()) ||
          c.name.toLowerCase().includes(query.toLowerCase())
      )
    : CURRENCIES;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function select(code: string) {
    onValueChange?.(code);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" id={id} name={name} value={current} required={required} />

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 h-9 px-3 rounded-md border border-foreground/20 bg-background text-sm hover:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40 transition-colors"
      >
        <span>
          {currentInfo ? `${flagEmoji(currentInfo.flag)} ${currentInfo.code} — ${currentInfo.name}` : current}
        </span>
        <svg className="w-3.5 h-3.5 text-foreground/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-foreground/20 bg-background shadow-lg">
          <div className="p-2 border-b border-foreground/10">
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar moneda…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-2 py-1 text-sm bg-foreground/5 rounded border-0 outline-none placeholder:text-foreground/30"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-foreground/40">Sin resultados</li>
            )}
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => select(c.code)}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-foreground/8 transition-colors ${
                    c.code === current ? "bg-foreground/10 font-medium" : ""
                  }`}
                >
                  {flagEmoji(c.flag)} {c.code} — {c.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

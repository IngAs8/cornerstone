"use client";

import { useState, useTransition } from "react";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { BankForm } from "./bank-form";
import { RecurringForm } from "./recurring-form";
import { deleteAccount, deleteBank, deleteRecurringPayment } from "./actions";

const FREQ_LABEL: Record<string, string> = {
  weekly: "Semanal", biweekly: "Quincenal", monthly: "Mensual",
  quarterly: "Trimestral", yearly: "Anual",
};

interface Account {
  id: string; bank_id: string | null; name: string; type: string;
  currency: string; current_balance: string; credit_limit: string | null;
  payment_due_day: number | null; minimum_payment: string | null; is_active: boolean;
}

interface Bank { id: string; name: string; color: string | null; }
interface Recurring {
  id: string; name: string; amount: string; currency: string;
  frequency: string; next_date: string; account_id: string | null;
}

interface Props {
  bankList: Bank[];
  grouped: { bank: Bank; accounts: Account[] }[];
  ungrouped: Account[];
  recurringList: Recurring[];
  accountList: Account[];
  currency: string;
  typeLabel: Record<string, string>;
}

export function AccountsClient({
  bankList, grouped, ungrouped, recurringList, accountList, currency, typeLabel
}: Props) {
  const [showBankForm, setShowBankForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      {/* Banks section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Bancos</h2>
          {!showBankForm && (
            <button
              onClick={() => setShowBankForm(true)}
              className="text-sm text-foreground/50 hover:text-foreground transition-colors"
            >
              + Agregar banco
            </button>
          )}
        </div>

        {showBankForm && (
          <div className="mb-4">
            <BankForm onDone={() => setShowBankForm(false)} />
          </div>
        )}

        {bankList.length === 0 && !showBankForm && (
          <p className="text-sm text-foreground/40 py-4">No hay bancos registrados.</p>
        )}

        <div className="space-y-4">
          {grouped.map(({ bank, accounts }) => (
            <div key={bank.id} className="rounded-lg border border-foreground/10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10">
                <div className="flex items-center gap-2">
                  {bank.color && (
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: bank.color }} />
                  )}
                  <span className="font-medium text-sm">{bank.name}</span>
                  <span className="text-xs text-foreground/40">{accounts.length} cuenta{accounts.length !== 1 ? "s" : ""}</span>
                </div>
                <button
                  onClick={() => {
                    if (!confirm(`¿Eliminar banco "${bank.name}"?`)) return;
                    startTransition(async () => { await deleteBank(bank.id); });
                  }}
                  disabled={isPending}
                  className="text-xs text-foreground/30 hover:text-red-400 transition-colors"
                >
                  Eliminar
                </button>
              </div>
              {accounts.map((acc) => (
                <AccountRow key={acc.id} acc={acc} typeLabel={typeLabel} currency={currency} />
              ))}
              {accounts.length === 0 && (
                <p className="text-xs text-foreground/30 px-4 py-3">Sin cuentas en este banco.</p>
              )}
            </div>
          ))}
        </div>

        {/* Ungrouped accounts */}
        {ungrouped.length > 0 && (
          <div className="mt-4 rounded-lg border border-foreground/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-foreground/10">
              <span className="text-sm text-foreground/50">Sin banco asignado</span>
            </div>
            {ungrouped.map((acc) => (
              <AccountRow key={acc.id} acc={acc} typeLabel={typeLabel} currency={currency} />
            ))}
          </div>
        )}
      </div>

      {/* Recurring payments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Pagos recurrentes</h2>
          {!showRecurringForm && (
            <button
              onClick={() => setShowRecurringForm(true)}
              className="text-sm text-foreground/50 hover:text-foreground transition-colors"
            >
              + Agregar pago
            </button>
          )}
        </div>

        {showRecurringForm && (
          <div className="mb-4">
            <RecurringForm
              baseCurrency={currency}
              accounts={accountList.map((a) => ({ id: a.id, name: a.name, type: a.type }))}
              onDone={() => setShowRecurringForm(false)}
            />
          </div>
        )}

        {recurringList.length === 0 && !showRecurringForm && (
          <p className="text-sm text-foreground/40 py-4">No hay pagos recurrentes registrados.</p>
        )}

        {recurringList.length > 0 && (
          <div className="rounded-lg border border-foreground/10 divide-y divide-foreground/5">
            {recurringList.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-foreground/40">
                    {FREQ_LABEL[r.frequency] ?? r.frequency} · próximo {r.next_date}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium tabular-nums">{formatMoney(Number(r.amount), r.currency)}</span>
                  <button
                    onClick={() => {
                      if (!confirm(`¿Eliminar "${r.name}"?`)) return;
                      startTransition(async () => { await deleteRecurringPayment(r.id); });
                    }}
                    disabled={isPending}
                    className="text-xs text-foreground/30 hover:text-red-400 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AccountRow({ acc, typeLabel, currency }: { acc: Account; typeLabel: Record<string, string>; currency: string }) {
  const [isPending, startTransition] = useTransition();
  const isCreditCard = acc.type === "credit_card";
  const balance = Number(acc.current_balance);
  const limit = acc.credit_limit ? Number(acc.credit_limit) : null;
  const usedPct = limit && limit > 0 ? Math.min((balance / limit) * 100, 100) : null;

  return (
    <div className="px-4 py-3 border-t border-foreground/5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">{acc.name}</p>
          <p className="text-xs text-foreground/40">{typeLabel[acc.type] ?? acc.type}</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold tabular-nums ${isCreditCard ? "text-red-400" : "text-emerald-400"}`}>
            {formatMoney(balance, acc.currency)}
          </p>
          {limit && (
            <p className="text-xs text-foreground/40">Cupo: {formatMoney(limit, acc.currency)}</p>
          )}
        </div>
      </div>

      {usedPct !== null && (
        <div className="mt-2">
          <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usedPct > 80 ? "bg-red-500" : usedPct > 50 ? "bg-yellow-500" : "bg-emerald-500"}`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-foreground/30 mt-0.5">
            <span>{usedPct.toFixed(0)}% usado</span>
            {acc.payment_due_day && <span>Pago día {acc.payment_due_day}</span>}
          </div>
        </div>
      )}

      {isCreditCard && acc.minimum_payment && (
        <p className="text-xs text-foreground/40 mt-1">
          Pago mínimo: {formatMoney(Number(acc.minimum_payment), acc.currency)}
        </p>
      )}

      <div className="flex justify-end mt-1">
        <button
          onClick={() => {
            if (!confirm(`¿Eliminar cuenta "${acc.name}"?`)) return;
            startTransition(async () => { await deleteAccount(acc.id); });
          }}
          disabled={isPending}
          className="text-xs text-foreground/30 hover:text-red-400 transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

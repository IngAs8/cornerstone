"use client";

import { useTransition } from "react";
import { deleteTransaction } from "./actions";

export function DeleteTransactionButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!confirm("Delete this transaction? This action cannot be undone.")) return;
    startTransition(async () => {
      await deleteTransaction(id);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="text-red-600 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-500/10 disabled:opacity-50"
    >
      {isPending ? "..." : "Delete"}
    </button>
  );
}

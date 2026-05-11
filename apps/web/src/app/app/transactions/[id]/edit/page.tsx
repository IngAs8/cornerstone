import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "../../transaction-form";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

interface EditableTransaction {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: string;
  currency: string;
  category_id: string | null;
  description: string | null;
  date: string;
}

export default async function EditTransactionPage({ params }: EditPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: tx } = await supabase
    .from("transactions")
    .select("id, type, amount, currency, category_id, description, date")
    .eq("id", id)
    .is("deleted_at", null)
    .single<EditableTransaction>();

  if (!tx) notFound();

  const { data: profile } = await supabase
    .from("users")
    .select("base_currency")
    .eq("id", user.id)
    .single();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type, bucket")
    .order("type")
    .order("sort_order");

  return (
    <main className="flex-1 px-8 py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link
            href="/app/transactions"
            className="text-sm text-foreground/60 hover:text-foreground"
          >
            ← Back to transactions
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-6">
          Edit transaction
        </h1>
        <TransactionForm
          baseCurrency={profile?.base_currency ?? "USD"}
          categories={categories ?? []}
          initial={{
            id: tx.id,
            type: tx.type,
            amount: Number(tx.amount),
            currency: tx.currency,
            categoryId: tx.category_id,
            description: tx.description ?? "",
            date: tx.date,
          }}
        />
      </div>
    </main>
  );
}

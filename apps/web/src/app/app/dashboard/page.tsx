import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const t = await getTranslations("dashboard");
  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "friend";

  return (
    <main className="flex-1 px-8 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          {t("welcome", { name: fullName })}
        </h1>
        <p className="text-foreground/60 mb-10">
          Your foundation is ready. We&apos;re still building the core features —
          this dashboard will fill out as the app comes together.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card title={t("netWorth")} value="—" />
          <Card title={t("monthlyIncome")} value="—" />
          <Card title={t("monthlyExpenses")} value="—" />
          <Card title={t("remaining")} value="—" />
        </div>

        <div className="mt-10 p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
          <h2 className="font-medium mb-2">Status</h2>
          <ul className="text-sm text-foreground/70 space-y-1">
            <li>✔ Authentication is working</li>
            <li>✔ Database schema deployed (17 tables, RLS active)</li>
            <li>✔ Multi-language ready (11 locales)</li>
            <li>○ Onboarding wizard (next)</li>
            <li>○ Transaction CRUD</li>
            <li>○ Budget &amp; debt simulator</li>
            <li>○ AI advisor &amp; WhatsApp bot</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-5 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
      <div className="text-xs uppercase tracking-wider text-foreground/50 mb-2">
        {title}
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "./nav";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — proxy.ts already redirects, but verify here too.
  if (!user) {
    redirect("/sign-in");
  }

  // Redirect to onboarding if not completed (except when already on it).
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";
  const isOnboarding = pathname.includes("/app/onboarding");

  if (!isOnboarding) {
    const { data: profile } = await supabase
      .from("users")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    if (!profile?.onboarding_completed) {
      redirect("/app/onboarding");
    }
  }

  // Onboarding has its own minimal layout — no sidebar.
  if (isOnboarding) {
    return <>{children}</>;
  }

  const t = await getTranslations("nav");
  const tApp = await getTranslations("app");

  const navItems = [
    { href: "/app/dashboard", label: t("dashboard") },
    { href: "/app/transactions", label: t("transactions") },
    { href: "/app/budget", label: t("budget") },
    { href: "/app/accounts", label: t("accounts") },
    { href: "/app/debts", label: t("debts") },
    { href: "/app/investments", label: t("investments") },
    { href: "/app/advisor", label: t("advisor") },
    { href: "/app/household", label: t("household") },
    { href: "/app/settings", label: t("settings") },
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row">
      <AppNav items={navItems} appName={tApp("name")} signOutLabel={t("signOut")} />
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
}

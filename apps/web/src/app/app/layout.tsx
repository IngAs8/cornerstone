import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

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

  const t = await getTranslations("nav");
  const tApp = await getTranslations("app");

  const navItems = [
    { href: "/app/dashboard", label: t("dashboard") },
    { href: "/app/transactions", label: t("transactions") },
    { href: "/app/budget", label: t("budget") },
    { href: "/app/debts", label: t("debts") },
    { href: "/app/investments", label: t("investments") },
    { href: "/app/advisor", label: t("advisor") },
    { href: "/app/settings", label: t("settings") },
  ];

  return (
    <div className="flex-1 flex">
      <aside className="w-60 border-r border-foreground/10 hidden md:flex md:flex-col">
        <div className="px-5 py-5 border-b border-foreground/10">
          <Link href="/app/dashboard" className="font-semibold tracking-tight">
            {tApp("name")}
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-md text-sm hover:bg-foreground/5 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="px-3 py-4 border-t border-foreground/10">
          <button
            type="submit"
            className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-foreground/5 transition-colors text-foreground/70"
          >
            {t("signOut")}
          </button>
        </form>
      </aside>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}

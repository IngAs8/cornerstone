import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("marketing");
  const tApp = await getTranslations("app");

  return (
    <main className="flex-1">
      <header className="border-b border-foreground/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="font-semibold tracking-tight">{tApp("name")}</div>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/sign-in"
              className="px-3 py-1.5 rounded-md hover:bg-foreground/5 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              {t("ctaPrimary")}
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="text-sm uppercase tracking-widest text-foreground/60 mb-6">
          {tApp("tagline")}
        </p>
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-tight mb-6">
          {t("heroTitle")}
        </h1>
        <p className="text-lg text-foreground/70 mb-10 leading-relaxed">
          {t("heroSubtitle")}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/sign-up"
            className="px-6 py-3 rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
          >
            {t("ctaPrimary")}
          </Link>
          <Link
            href="#how-it-works"
            className="px-6 py-3 rounded-md border border-foreground/20 hover:bg-foreground/5 font-medium transition-colors"
          >
            {t("ctaSecondary")}
          </Link>
        </div>
      </section>
    </main>
  );
}

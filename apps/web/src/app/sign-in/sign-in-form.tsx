"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const supabase = createClient();
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message.includes("Invalid") ? t("errorInvalid") : t("errorGeneric"));
      return;
    }

    const redirect = searchParams.get("redirect") ?? "/app/dashboard";
    startTransition(() => {
      router.replace(redirect);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-medium block mb-1.5">
          {t("email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full px-3 py-2 rounded-md border border-foreground/15 bg-background focus:outline-none focus:border-foreground/40 transition-colors"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium block mb-1.5">
          {t("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-3 py-2 rounded-md border border-foreground/15 bg-background focus:outline-none focus:border-foreground/40 transition-colors"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-500/10 px-3 py-2 rounded-md">{error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full px-4 py-2 rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isPending ? "..." : t("submitSignIn")}
      </button>
    </form>
  );
}

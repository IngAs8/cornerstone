"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function SignUpForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const supabase = createClient();
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/app/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      return;
    }

    // If email confirmation is required, redirect to a confirmation page.
    // For dev (and Supabase projects with email confirmation off), session is set immediately.
    if (data.session) {
      startTransition(() => {
        router.replace("/app/dashboard");
        router.refresh();
      });
    } else {
      router.replace("/sign-in?confirmed=pending");
    }
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="text-sm font-medium block mb-1.5">
          {t("fullName")}
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          className="w-full px-3 py-2 rounded-md border border-foreground/15 bg-background focus:outline-none focus:border-foreground/40 transition-colors"
        />
      </div>
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
          autoComplete="new-password"
          minLength={8}
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
        {isPending ? "..." : t("submitSignUp")}
      </button>
    </form>
  );
}

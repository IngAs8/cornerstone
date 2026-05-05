import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage() {
  const t = await getTranslations("auth");
  const tApp = await getTranslations("app");

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-semibold tracking-tight">
            {tApp("name")}
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            {t("signUp")}
          </h1>
        </div>

        <SignUpForm />

        <p className="mt-6 text-sm text-center text-foreground/60">
          {t("haveAccount")}{" "}
          <Link href="/sign-in" className="font-medium underline">
            {t("signInLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}

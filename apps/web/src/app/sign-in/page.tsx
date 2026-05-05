import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
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
            {t("signIn")}
          </h1>
        </div>

        <SignInForm />

        <p className="mt-6 text-sm text-center text-foreground/60">
          {t("noAccount")}{" "}
          <Link href="/sign-up" className="font-medium underline">
            {t("createOne")}
          </Link>
        </p>
      </div>
    </main>
  );
}

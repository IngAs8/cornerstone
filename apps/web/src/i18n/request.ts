import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, isValidLocale, LOCALE_COOKIE, type Locale } from "./config";

/**
 * Per-request i18n config. Reads the user's locale from cookie first,
 * then falls back to Accept-Language header, then to the default.
 *
 * Authenticated users have their locale stored in `users.locale` and synced
 * to this cookie on login.
 */
export default getRequestConfig(async () => {
  const locale = await detectLocale();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

async function detectLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isValidLocale(cookieLocale)) return cookieLocale;

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language") ?? "";
  const preferred = acceptLanguage
    .split(",")
    .map((lang) => lang.split(";")[0]?.trim().split("-")[0])
    .find((lang) => isValidLocale(lang));

  if (preferred && isValidLocale(preferred)) return preferred;
  return defaultLocale;
}

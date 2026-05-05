import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh the Supabase session on every request and forward updated cookies.
 * Called from the root proxy.ts (Next.js 16 — formerly known as middleware).
 *
 * Returns the response to be sent back, with the latest auth cookies attached.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // IMPORTANT: getUser() refreshes the session if needed and returns a verified user.
  // Do NOT use getSession() here — it doesn't revalidate against Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define which routes require authentication.
  const path = request.nextUrl.pathname;
  const isAppRoute = path.startsWith("/app");
  const isAuthRoute = path.startsWith("/sign-in") || path.startsWith("/sign-up");

  // Not logged in trying to access app → redirect to sign-in
  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // Logged in trying to view auth pages → redirect to dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

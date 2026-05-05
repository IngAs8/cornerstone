import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 proxy (formerly known as middleware).
 * Runs on every request matching the matcher below.
 *
 * Responsibilities:
 * 1. Refresh Supabase auth session
 * 2. Redirect unauthenticated users away from /app/*
 * 3. Redirect authenticated users away from /sign-in, /sign-up
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (build assets)
     * - api/webhooks (signed by external providers, not our auth)
     * - static files (images, favicon, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieOptions } from "@/lib/supabase/cookie-options";

/**
 * Pages that need a signed-in student. The proxy only makes a quick check of
 * the login token here, so signed-out visitors get a real redirect before the
 * page starts streaming. Each page still calls requireUser() (the Data Access
 * Layer), which is the check that actually protects data.
 */
const SIGNED_IN_PREFIXES = ["/account"];

function needsSignIn(pathname: string) {
  return SIGNED_IN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Content-Security-Policy with a fresh nonce per request (Next.js CSP guide):
 * only scripts carrying the nonce run, so injected script can't. Next.js
 * reads the nonce from the request header and stamps its own scripts.
 * Development needs 'unsafe-eval' (React's debugging); production doesn't.
 * upgrade-insecure-requests only in production, so local http testing works.
 */
function contentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // challenges.cloudflare.com: the Turnstile bot check (Cloudflare's CSP guide).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
    "frame-src https://challenges.cloudflare.com",
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/**
 * Runs before matching requests (Next.js 16 renamed "middleware" to "proxy").
 * Its jobs: keep the Supabase login session fresh by refreshing the auth
 * cookies, and the optimistic redirect above. Access control itself belongs
 * in Row Level Security and in server code, not here.
 */
export async function proxy(request: NextRequest) {
  const csp = contentSecurityPolicy(Buffer.from(crypto.randomUUID()).toString("base64"));

  // Every response the proxy passes on carries the policy, including the ones
  // Supabase rebuilds after refreshing cookies. The request copy tells
  // Next.js which nonce to put on its scripts.
  const nextWithPolicy = () => {
    const headers = new Headers(request.headers);
    headers.set("Content-Security-Policy", csp);
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  let response = nextWithPolicy();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response; // Supabase not configured yet

  const supabase = createServerClient(url, key, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = nextWithPolicy();
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Refreshes the session if needed. Don't put code between creating the
  // client and this call. getClaims() verifies the token (locally when the
  // project uses asymmetric signing keys), as Supabase's Next.js guide
  // recommends; getSession() would trust the cookie unchecked.
  const { data } = await supabase.auth.getClaims();

  const { pathname, search } = request.nextUrl;
  if (!data && needsSignIn(pathname)) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(signIn);
    // Keep any cookie changes Supabase just made (such as clearing an expired session).
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  // Skip static files and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

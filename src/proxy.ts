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
 * Runs before matching requests (Next.js 16 renamed "middleware" to "proxy").
 * Its jobs: keep the Supabase login session fresh by refreshing the auth
 * cookies, and the optimistic redirect above. Access control itself belongs
 * in Row Level Security and in server code, not here.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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
        response = NextResponse.next({ request });
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

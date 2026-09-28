import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

export type PasswordCheck = "correct" | "wrong" | "captcha" | "error";

/**
 * Checks a signed-in student's password before a sensitive action (such as
 * deleting the account) without touching this browser's login cookies: a
 * throwaway client that keeps no session, signed straight back out.
 * Supabase still counts the attempt against its sign-in rate limits.
 */
export async function checkPassword(
  email: string,
  password: string,
  expectedUserId: string,
  captchaToken: string | undefined,
): Promise<PasswordCheck> {
  const env = getPublicEnv();
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password, options: { captchaToken } });
  if (error) {
    if (error.code === "invalid_credentials") return "wrong";
    if (error.code === "captcha_failed") return "captcha";
    console.error("Password check failed:", error.code ?? error.status);
    return "error";
  }

  // End the temporary session this check just created.
  await client.auth.signOut({ scope: "local" });
  return data.user?.id === expectedUserId ? "correct" : "wrong";
}

import { z } from "zod";

/**
 * Public settings the browser is allowed to see. Anything secret must NOT be
 * prefixed with NEXT_PUBLIC_ and must never be read here.
 *
 * Values come from .env.local (copy .env.example to create it).
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  // Supabase "publishable" key (older projects call it the "anon" key).
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  // Cloudflare Turnstile site key (public by design). Unset = Cloudflare's
  // always-pass TEST key, for local development. A real project's Supabase
  // secret rejects test tokens, so forgetting the real key breaks sign-up
  // loudly instead of silently turning the bot check off (docs/LAUNCH.md).
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).default("1x00000000000000000000AA"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `Missing or invalid public settings: ${missing}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return result.data;
}

// Next.js only inlines NEXT_PUBLIC_ variables when they're referenced directly.
export function getPublicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  });
}

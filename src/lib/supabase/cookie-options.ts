/**
 * Login cookie settings for every server-side Supabase client (server.ts and
 * proxy.ts). HttpOnly: page scripts can't read the session, so a script
 * injection bug couldn't steal it. That's safe because Stepwell never uses
 * Supabase from browser code (src/lib/supabase/client.ts stays unused; if a
 * Client Component ever needs it, this has to be revisited). Secure outside
 * development, where the site is only served over HTTPS.
 */
export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
} as const;

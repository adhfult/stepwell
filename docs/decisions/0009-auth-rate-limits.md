# 0009: Rate-limit sign-in at Vercel's firewall, keep Turnstile at Supabase

- Date: 2026-09-29
- Status: accepted (recommended after the security audit; the
  owner asked for everything that could be done to be done; revisit if
  Vercel's plan doesn't include rate-limit rules)

## Context
Sign-in, sign-up, password reset and the delete-account password check run
in Server Actions, so Supabase Auth sees Vercel's server addresses, not each
student's. Its per-IP limits (30 sign-ins or sign-ups per 5 minutes by
default) would then count every student together: one busy classroom could
lock everyone out, and a password-guessing script would share the budget
with real students instead of being singled out.

Supabase can use the real address if the server sends it in an
`Sb-Forwarded-For` header, but only with a **secret** API key and "IP
Address Forwarding" switched on in the dashboard
(https://supabase.com/docs/guides/auth/rate-limits). Supabase Auth skips
the captcha check for admin-level requests ("skip captcha validation if
authorization header contains an admin role", `internal/api/middleware.go`
in supabase/auth, read 2026-09-29), and a secret key is admin-level. So
that route would silently switch off Turnstile unless Stepwell verified
Turnstile itself.

## Decision
- Keep Turnstile enforced by Supabase Auth (no secret key in the sign-in path).
- At launch, add Vercel Firewall rate-limit rules keyed by the visitor's IP
  for POST requests to `/sign-in`, `/sign-up`, `/forgot-password` and
  `/account/delete` (Server Actions post to the page's own path): about 10
  requests a minute per IP, then block for 10 minutes.
- In the production Supabase dashboard (Authentication, Rate Limits), raise
  the sign-in and sign-up limit well above the default (for example 300 per
  5 minutes), since it now counts all students together and is only a
  backstop behind Vercel's per-IP rule and Turnstile.

## Alternatives considered
- `Sb-Forwarded-For` with a secret key: exact per-student limits inside
  Supabase, but puts an all-powerful key in the sign-in path and needs
  Stepwell to call Turnstile's siteverify itself (a second place to get
  wrong). Worth revisiting only if Vercel's rules aren't available.
- Leave the defaults: simplest, but a class signing up at once would hit
  the shared limit.

## Consequences
- LAUNCH.md step 5 (Vercel) gains the firewall rules; step 3 gains the
  Supabase limit.
- Local development is unchanged (no Vercel firewall locally).

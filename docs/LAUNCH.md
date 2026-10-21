# Launch checklist: Stepwell

Everything that must happen before a real student signs up, in order. Steps
marked **You** need your own accounts; **Claude** steps run only with your OK.
Details that change often (free-tier limits, prices) are marked "check".

## 1. Domain
- [ ] **You:** get a domain (GitHub Student Pack: Namecheap, .TECH or
      Name.com, free for a year; renewal is paid). Everything below uses it.

## 2. Email sending (Supabase's built-in email only reaches your own team)
- [ ] **You:** pick a sending provider Supabase documents for custom SMTP
      (for example Resend, Postmark, Amazon SES, Brevo; check free tiers).
- [ ] **You:** verify the domain with it (the SPF and DKIM DNS records it
      gives you), and create SMTP credentials.
- [ ] Sender: name "Stepwell", address such as `no-reply@<domain>`.
- [ ] The SMTP password is a secret: store it in your password manager and
      in the Supabase dashboard only, never in the repo or a chat.

## 3. Production Supabase project
- [ ] **You:** create a second project, "Stepwell production", on the free
      plan (check how many active free projects are allowed). Keep the
      current "Stepwell" project for development (SECURITY.md: previews use
      a separate development project).
- [ ] **You:** link it: `npx supabase link --project-ref <production ref>`.
- [ ] **Claude (with your OK):** `npx supabase db push` to create the tables,
      then `npx supabase db advisors --linked`.
- [ ] **You, in the production dashboard** (Authentication settings). These
      are set by hand, not with `supabase config push`, because the local
      config.toml points at localhost:
  - Site URL `https://<domain>`; Redirect URLs `https://<domain>/**` only.
  - Email confirmations on; minimum password length 8.
  - Email templates: confirmation and recovery from `supabase/templates/`,
    with the same subjects as `supabase/config.toml`.
  - SMTP: the credentials from step 2.
  - Bot protection: Turnstile, with the **real** secret from step 4.
  - Rate Limits: sign-ins and sign-ups raised to about 300 per 5 minutes
    (all students share Vercel's addresses here; decision 0009).
  - "Secure password change" on (see SECURITY.md "Sensitive actions").
    Supabase's stricter "require current password" would break Forgot
    password, so don't use it. Turn it on in the development project too.
- [ ] Check: does the free project pause when idle, and what wakes it?

### Data imports (`.github/workflows/import.yml`, decision 0008)
- [x] **You, in the SQL editor:** give the `importer` role a long random
      password: `alter role importer with password '<password>';`
- [x] **You, in GitHub** (Settings, Secrets and variables, Actions): secret
      `IMPORT_DATABASE_URL` = the **Session pooler** connection string from
      the dashboard's Connect button, with user `importer.<project-ref>` and
      that password, and no `?sslmode=` (the job verifies TLS against
      Supabase's root certificate in `src/jobs/`). Variable `IMPORT_CONTACT` = the Stepwell contact address.
- [x] Run "Import data" by hand once (Actions tab), then check the
      `occupations` count in the table editor.
- [x] Check (2026-09-30): GitHub turns off scheduled workflows after 60
      days without activity only in public repositories; Stepwell's is
      private. Minutes: the daily import mostly takes under a minute (the
      full first load took 11), and CI about 1 to 2 minutes a push, so
      well under the 2,000 free minutes a month for private repositories.

## 4. Cloudflare Turnstile (bot check)
- [ ] **You:** free Cloudflare account, Turnstile, add a widget for
      `<domain>` in "Managed" mode.
- [ ] Site key (public) goes into Vercel as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- [ ] Secret key goes into the production Supabase dashboard (step 3).
      Never the test keys: the app uses Cloudflare's always-pass test key
      when the site key is unset, and a real secret rejects its tokens, so
      a missing site key shows up as failed sign-ups, not silent weakness.

## 5. Hosting (Vercel)
- [ ] **You:** Vercel project from the GitHub repo; add the domain.
- [ ] Environment variables, **Production** only: `NEXT_PUBLIC_SUPABASE_URL`
      and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (production project),
      `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Preview deployments use the
      development project's values.
- [ ] **You, in Vercel (Firewall, rules):** rate limit by IP, about 10
      requests a minute then block for 10 minutes, for POST requests to
      `/sign-in`, `/sign-up`, `/forgot-password` and `/account/delete`
      (decision 0009). Check the plan includes rate-limit rules first.
- [ ] Two-factor sign-in on GitHub, Supabase, Vercel, Cloudflare and the
      domain registrar (SECURITY.md).

## 6. Before opening sign-up
- [ ] Terms and Privacy placeholders filled in: edit `LEGAL` in
      `src/lib/legal/details.ts` (contact email, email provider from step 2,
      law state, effective date) and the matching `docs/legal/*-draft.md`.
      `placeholdersLeft()` must return an empty list before launch. The
      pages and footer links are already live (`docs/specs/legal-pages.md`).
- [ ] Legal review of the age screen, Terms and Privacy (not legal advice here).
- [ ] **Claude:** pre-ship-security skill, then Cloudflare's security-audit
      skill (`npx skills add https://github.com/cloudflare/security-audit-skill
      --skill security-audit`), then fix what they find.
- [ ] Test as an untrusted user on production: two accounts; account A tries
      to read and change B's profile; every attempt fails (SECURITY.md).
- [ ] Decide the open questions in `docs/specs/accounts-and-profile.md`
      (unconfirmed accounts, login cookie lifetime; per-IP rate limits are
      decided in decision 0009).

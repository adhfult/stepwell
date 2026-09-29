# Spec: Terms and Privacy pages

- Status: built 2026-09-29, with placeholders. The owner chose to name only
  the project ("an independent project", no owner name); contact email,
  email provider, law state and effective date stay `[PLACEHOLDERS]` in
  `src/lib/legal/details.ts` until launch (`placeholdersLeft()` lists them).
- Launch blocker from `docs/specs/accounts-and-profile.md`. Not legal advice:
  a legal review is required before real students sign up (docs/LAUNCH.md).

## Goal
Tell students, in words a 13-year-old can follow, what Stepwell collects,
what it never does, and the few rules for using it; and link both pages from
every page, as AVOID.md and SECURITY.md require.

## User story
As a student (or a parent), I want to understand what happens to my
information before I create an account.

## Acceptance criteria
- [ ] `/privacy` and `/terms` show the approved text from
      `docs/legal/privacy-draft.md` and `docs/legal/terms-draft.md`, with
      every `[PLACEHOLDER]` filled in and a "Last updated" date. (Text and
      pages done; the placeholders wait for the owner, see docs/LAUNCH.md.)
- [x] A site footer on every page (DESIGN.md "Page frame": on `surface`,
      top `border-subtle` divider) links to Terms and Privacy. Other footer
      links (About the data, Contact) are added when those pages exist.
- [x] The sign-up page says, next to the button: "By creating an account,
      you agree to the Terms and the Privacy Policy." with both linked.
- [x] Reading pages (`<Page>`, reading width), `<PageTitle>`, section
      headings `text-lg`; works at 320px; AVOID.md check passes (no em dashes).
- [x] The Privacy page matches what the code does: any later change to what
      Stepwell collects (for example scholarship eligibility answers in the
      v1 expansion) updates the page first.
- [x] `npm run check` passes.

## Data
None stored. Static pages.

## Edge cases and errors
- Placeholders left in: the pages must not ship; a check can grep for `[`
  in the rendered text before launch.

## Out of scope
- A cookie banner: Stepwell sets only cookies needed to work (the login
  cookie and a session cookie for the age check), no tracking or analytics.
- Parent accounts, data requests by form (email works for now).

## Open questions (to fill the placeholders)
- ~~`[OWNER NAME]`~~: decided, the pages say "an independent project".
- `[CONTACT EMAIL]`: a Stepwell address (not a personal one), also used by
  the data pipeline's User-Agent (v1 expansion draft).
- `[EMAIL PROVIDER]`: from docs/LAUNCH.md step 2.
- `[STATE]`: whose laws apply to the Terms.
- `[EFFECTIVE DATE]`.

## Test plan
By hand at 320px and desktop: both pages readable, footer on every page,
sign-up sentence links work. Grep the rendered pages for `[` (no placeholders).

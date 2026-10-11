# Spec: Career summaries in plain words

- Status: draft (2026-10-11), waiting for owner approval

First AI use (decision 0016). Background job only: no AI runs when a page
is viewed, and no student data goes to the AI.

## Goal
O*NET's descriptions are written for workforce experts ("Plan, direct, or
coordinate the operations of..."). Give each career a short summary a 13-year-old
can follow, written ahead of time from the O*NET data we already store.

## User story
As a high school student, I want a plain explanation of what someone in a
career actually does all day, so I can tell quickly whether to read more.

## Decisions to confirm (owner)
- **Model:** `claude-haiku-5-5`, about $0.10 in / $0.50 out per million
  tokens (price page read 2026-10-10; check again before the full run).
  ~1,000 careers × ~1.5k tokens in, ~250 out ≈ **$0.30 for a full run**.
  A bigger model (`claude-sonnet-5`, $2 / $10) would cost ~$5 per run if Haiku's
  samples read badly.
- **Placement:** the summary sits right under the title band, above O*NET's
  own description, under a small heading "In plain words". The O*NET
  description, tasks and skills stay as they are.
- **Run by hand**, not in the daily import: `npm run summaries` after an
  O*NET release (about twice a year). It only rewrites careers whose O*NET
  text changed.

## Acceptance criteria
### Job (`src/jobs/summaries.ts`, `npm run summaries`)
- [ ] Reads, per career: title, description, top tasks, top skills, typical
      education and job zone, from our own tables. Nothing from the web.
- [ ] Sends one request per career through `@anthropic-ai/sdk` with
      structured output; the reply is checked with zod: `summary` 40 to 90
      words, plain text, no digits (pay and numbers stay with their sources),
      no em dashes. A reply that fails the check is retried once, then skipped
      and listed at the end; never saved.
- [ ] Stores a hash of the input text; a career whose input hasn't changed is
      skipped, so a rerun costs nothing.
- [ ] `--limit N` writes only the first N careers (for the sample review);
      `--dry-run` prints summaries without writing.
- [ ] Prints the token totals and the estimated cost at the end.
- [ ] `ANTHROPIC_API_KEY` is read only through `src/jobs/env.ts` (optional
      there; the summaries command stops with a clear message without it).
      Local runs only; not added to GitHub Actions.

### Page (`/careers/[code]`)
- [ ] When a summary exists, it shows under "In plain words", with the
      source line: "Written with AI by Stepwell from the O*NET data on this
      page, then checked." The O*NET source line stays at the bottom.
- [ ] No summary: the section doesn't render (no empty heading).
- [ ] A retired career keeps its summary.

### Review gate
- [ ] Owner reads 20 samples (`--limit 20`) across job zones 1 to 5 before
      the full run, and can rerun a single career after editing the prompt.

## Data
New table `public.occupation_summaries` (migration through the
supabase-migration skill): `onet_code` (primary key, references
`occupations`, cascade delete), `summary` text (check: 1 to 800 characters),
`input_hash` text, `model` text, `written_at` timestamptz. Public reference
data: anyone reads (`anon`, `authenticated` select), only the job writes.
No personal data.

## Edge cases and errors
- Career with no tasks or skills: written from title and description only.
- API down, rate-limited or out of credit: the SDK retries; after that the
  job stops, keeps what it saved and says how many are left. Rerunning
  continues where it stopped (hash check).
- The model invents facts: limited by sending only our data and asking for
  nothing beyond it; digits are rejected; the owner's sample review catches
  the rest. A bad summary can be deleted from the table and rerun.

## Out of scope
- Any AI call while a student views a page.
- Summaries for colleges, programs or scholarships (later specs if wanted).
- Translation, reading-level settings, student feedback buttons.

## Test plan
- Unit (Vitest): the zod check accepts a good reply and rejects digits,
  em dashes, too short and too long; the same input gives the same hash
  and a changed task changes it; the SDK client is a fake in tests, so
  `npm run check` makes no API calls and needs no key.
- pgTAP: anon can read summaries and can't insert, update or delete.
- By hand: `npm run summaries -- --limit 20` locally; owner reads them;
  career page at 320 and 1280px with and without a summary; checked against
  `docs/design/AVOID.md`.

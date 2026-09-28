# Spec: Career Explorer

- Status: built (steps 1 to 5, 2026-09-28); step 6 (pay and outlook) waits
  for an O*NET API key
- Build step 3 of the v1 expansion (`docs/specs/v1-expansion-draft.md`,
  Sections 1, 2.3 and 2.7). Builds on `docs/specs/data-pipeline.md`.

## Goal
Let anyone search careers and read a clear page about each one: what the
work is, what it takes, related careers, with sources. Signed-in students
can save careers.

## User story
As a student, I want to look up a career and quickly understand what the
work is and what it takes, so I can decide whether to explore it further.

## Decisions made without asking (push back on any)
1. **Pay and outlook wait** (step 6). O*NET's download has no pay data; its
   Web Services API does, and needs `ONET_API_KEY` from a free registration
   only the owner can do. Until then the page leaves the pay section out
   entirely rather than showing "Not reported" on every career.
2. **Search is a plain form** (`/careers?q=nurse`), results rendered on the
   server. It works without JavaScript, can be bookmarked and shared, and adds
   nothing to the content security policy. Results-as-you-type (the old
   draft) can come later if students ask.
3. **Retired careers are kept.** When a new O*NET release drops a code, the
   merge sets `retired_at` instead of deleting it, so a student's saved career
   never disappears. Retired careers leave search and their page says so.
   (The v1 plan's rule for listings: "gone rows kept for saved items".)
4. **"Typical education"** is the level the most workers in O*NET's survey
   reported, shown with its share ("Bachelor's degree (62% of workers)").
   When O*NET flags that share as imprecise, the level still counts but the
   share isn't shown (found building: skipping flagged shares made
   Registered Nurses show a certificate instead of a bachelor's degree).
   Levels get short plain names (e.g. "Certificate after high school").
5. **Top tasks** are the 8 most important core tasks (O*NET importance
   ratings); **top skills** are the 6 most important from O*NET 31.0's two
   skill files (essential and transferable), leaving out suppressed ratings.
6. **Also called:** up to 6 of O*NET's "reported job titles". Search also
   covers O*NET's 54,000 alternate titles (so "programmer" finds Computer
   Programmers, and "nurse" puts Registered Nurses first).
7. **Interest scores and knowledge ratings** are left for the specs that use
   them (Interest quiz; AP suggestions), per "build only what the page shows".

## Acceptance criteria
Data (O*NET adapter, same run as `occupation_data.csv`)
- [x] `occupations` gains job zone (1 to 5), typical education (level and
      share) and `retired_at`. Codes missing from a new release are retired,
      not deleted; a code that comes back is un-retired.
- [x] `occupation_titles`: reported and alternate titles (kind column), for
      "also called" and search.
- [x] `occupation_details`: top tasks and top skills (JSON arrays of text).
- [x] `occupation_related`: related careers with O*NET's tier and rank; a
      related code that isn't a current occupation is skipped.
- [x] Every file must parse into at least a minimum number of rows (for
      example 30,000 alternate titles); otherwise the run fails, so a renamed
      column can't quietly empty every career page.
- [x] All child rows are replaced in the same transaction as the merge.

Search (`/careers`)
- [x] Search form (label "Search careers"), `GET /careers?q=`. The query is
      validated with zod (1 to 100 characters after trimming).
- [x] `public.search_occupations(q)`: title and alternate-title matches,
      exact and prefix title matches first, then contains, then close
      spellings (`pg_trgm`); `%` and `_` in the query are matched literally;
      retired careers excluded; at most 30 results.
- [x] Results are a list with dividers: title link, and one line of facts
      (typical education, preparation), plus "Matched: <alternate title>"
      when the match came from one.
- [x] Empty query: short intro and the form. No results: "No careers match
      "x"" with one suggestion. Loading skeleton; error state with "Try again".
- [x] "nurse", "software" and "electrician" each put the obvious career in
      the top 3.

Career page (`/careers/[code]`, e.g. `/careers/29-1141.00`)
- [x] Title, description, also called, typical education, preparation (job
      zone in plain words), top tasks, top skills, related careers (links).
- [x] Source line under the data: O*NET release, retrieved month, CC BY 4.0
      link, and "Stepwell shows a selection of this data".
- [x] A bad or unknown code shows the not-found page (HTTP 200 plus
      `noindex`, because the page streams behind its loading skeleton). A retired code shows
      the page with a note that O*NET no longer lists it.
- [x] Save: signed in, "Save career" / "Remove from saved"; signed out,
      "Sign in to save this career" (returns here after sign-in).

Saved careers
- [x] `saved_items`: one row per saved thing, one link column per kind
      (only `onet_code` for now), exactly one set, unique per student.
      Owner-only RLS (select, insert, delete); `user_id` comes from
      `auth.uid()`, never the browser.
- [x] The save action validates the code with zod and uses the session's
      user. Account page lists saved careers (empty state links to search).

Site
- [x] Header shows "Careers"; still one line at 320px. Home page links to
      career search.
- [x] AVOID.md check passes; works at 320px and desktop.
- [x] `npm run check` and `npm run test:db` pass.

## Data
| Table | Read | Write |
|---|---|---|
| `occupations`, `occupation_titles`, `occupation_details`, `occupation_related` | everyone | `ingest.merge_occupations()` only |
| `saved_items` | own rows | own rows (insert, delete) |

## Edge cases and errors
- A query of only spaces: treated as empty. Over 100 characters: friendly error.
- Job zone or education missing for a career (about 90 careers): that line
  says "Not reported".
- Saving twice: the unique rule makes it a no-op. Saving a retired career:
  allowed (it's still a real row).
- Database down: the page's error state; never technical details.

## Out of scope
Pay and outlook (step 6), interest matching, programs and colleges, AP
suggestions, the year-by-year plan, results-as-you-type.

## Build steps (each: checks pass, one commit)
| # | Goal | Check |
|---|---|---|
| 1 | Migration: new columns and tables, retirement, `saved_items`, search function; pgTAP | Tests: RLS, grants, retire/un-retire, search ranking, saved-items ownership |
| 2 | O*NET adapter reads the extra files; per-file minimums | Unit tests on fixtures; `--force` re-import locally; counts in the database |
| 3 | `/careers` search | "nurse", "software", "electrician" by hand; 320px |
| 4 | Career page and save | A few careers by hand; save and remove; signed-out link |
| 5 | Header, home link, account list, docs | Full pass at 320px and desktop; AVOID.md |
| 6 | Pay and outlook (needs `ONET_API_KEY`) | Later |

## Test plan
Unit tests for parsing and joins on fixture excerpts; pgTAP for the database
rules; by hand in Chrome at 320px and desktop.

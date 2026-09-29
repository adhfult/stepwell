# Spec: Programs and colleges

- Status: built (2026-09-28; approved by the owner's go-ahead in chat:
  "continue with next on what's on the list")
- Build step 5 of the v1 expansion (`docs/specs/v1-expansion-draft.md`,
  Sections 1 and 2.4). Builds on `docs/specs/career-explorer.md`.

## Goal
From any career, show the programs of study that lead to it and the colleges
that offer them, with what graduates earn, what they owe, what the college
costs and how many students finish, from official U.S. data.

## User story
As a student who found a career I like, I want to see which colleges offer a
program for it, what it costs and what graduates earn, so I can compare real
options.

## Checked 2026-09-28
- **Crosswalk:** O*NET publishes "2020 CIP to O*NET-SOC 2019"
  (`https://www.onetcenter.org/crosswalks/cip/Education_CIP_to_ONET_SOC.xlsx`,
  about 8,500 rows) mapping 6-digit program codes straight to O*NET career
  codes. Excel only (the `.csv` address serves the same Excel file).
- **College Scorecard API** (`https://api.data.gov/ed/collegescorecard/v1/schools`):
  1,000 requests an hour per key, 100 schools per page. Operating schools
  that mainly award certificates or degrees: 5,787 (58 pages, about 2 MB
  each with only the fields below). Program ("field of study") data uses
  4-digit CIP codes with credential level, median earnings 1 and 4 years
  after completing, median federal loan debt, and graduates counted.
  api.data.gov accepts the key as an `X-Api-Key` header.
- **Size:** on the first page, 77% of programs had graduates or earnings;
  about 285,000 program rows estimated. Measured after the first import:
  164,316 programs (30 MB), 5,787 colleges, 8,501 crosswalk links; the whole
  local database 106 MB (24 MB of it staged records, cleaned after 30 days).

## Decisions made without asking (push back on any)
1. **O*NET's crosswalk, not NCES's** (a change to Section 2.4, which planned
   the NCES SOC-level file joined through `soc_code`). O*NET's file maps
   programs to O*NET codes directly, including specialties like Acute Care
   Nurses, so no second join is needed. It's the same federal crosswalk,
   carried to O*NET's codes by O*NET.
2. **One new dependency, `read-excel-file`** (2.5 million weekly downloads,
   updated August 2026), because the crosswalk is only published as Excel.
   Chosen over `exceljs` because Stepwell only reads one sheet.
3. **Only programs with graduates or earnings data** are stored; the rest
   add rows but nothing to show.
4. **All states, filtered** (PRODUCT.md open question "which states first"):
   every state is loaded; the list starts filtered to the student's profile
   state when they're signed in and have one, otherwise all states.
5. **Earnings 4 years after completing** when Scorecard has them, otherwise
   1 year after, labeled either way. Debt is the median federal loan debt at
   that college ("Stafford and Grad PLUS", `eval_inst`).
6. **The API key goes in a header**, never the URL, because the fetcher puts
   failing URLs in error messages and run logs.
7. **No college pages or saved colleges yet**: those come with the plan
   (build step 9). A college's website shows as its domain, so it's clear
   the link leaves Stepwell.

## Acceptance criteria
Data
- [x] Source `onet_cip` (dataset, refreshed every 12 months): the crosswalk
      into `occupation_programs` (O*NET code, 6-digit CIP and title,
      computed 4-digit CIP; public read). Codes for careers we don't have
      are skipped.
- [x] Source `scorecard` (api, refreshed every 3 months, 2 requests a
      second): `institutions` (Scorecard id, name, city, state, public /
      private nonprofit / for-profit, website, average net price, admission
      rate, graduation rate, students) and `programs` (id; unique college +
      4-digit CIP + credential level; title, credential, earnings at 1 and 4
      years, median debt, graduates). Public read.
- [x] Merges in one transaction; program ids stay stable (upsert on the
      natural key); colleges and programs missing from a new run are removed.
- [x] `public.colleges_for_career(onet_code, state, level)`: programs at
      colleges linked to the career, best earnings first (unknown last), at
      most 50; refuses a bad state or level.
- [x] Missing values stay empty, never 0 (DESIGN.md "Not reported").

Pages
- [x] Career page, "Where to study": up to 6 program names from the
      crosswalk in CIP code order (a family's general program comes first:
      51.3801 Registered Nursing) and a link "Find colleges for this career". Left out when
      the career has no linked programs.
- [x] `/careers/[code]/colleges`: filters (state, credential: certificate,
      associate's, bachelor's, graduate) as a GET form; a list with dividers:
      college name, program and credential, earnings and debt, then college
      type, place, net price and graduation rate, and its website's domain;
      "Not reported" for missing numbers; the program named once when every
      row shares it; the first 15, then "Show all"; empty state; source line (College
      Scorecard; O*NET crosswalk) with the note that earnings and debt
      describe students who got federal financial aid.
- [x] Loading skeleton and error state; works at 320px; AVOID.md check.
- [x] `npm run check` and `npm run test:db` pass.

## Data
| Table | Read | Write |
|---|---|---|
| `occupation_programs`, `institutions`, `programs` | everyone | import functions only |

## Edge cases and errors
- A career with programs but no colleges in the chosen state: empty state
  with a link to all states.
- Scorecard pages with an error: the run retries, then fails; students keep
  the last good data (circuit breaker).
- A college that closes drops out on the next run.

## Out of scope
College pages, comparing colleges, saving colleges or programs (step 9),
maps, distance search.

## Build steps (each: checks pass, one commit)
| # | Goal | Check |
|---|---|---|
| 1 | Migration: tables, merges, `colleges_for_career()`; pgTAP | RLS, grants, ordering, stable ids, refusals |
| 2 | Adapters: `onet_cip` (Excel) and `scorecard` (API); workflow key | Unit tests on saved excerpts; local imports; database size |
| 3 | Career page section and the colleges page | Chrome at 320px and 1280px |
| 4 | Docs | |

## Test plan
Unit tests for both parsers on saved excerpts; pgTAP for merges and the
query function; by hand in Chrome for nurse, electrician and software
developer, in a couple of states.

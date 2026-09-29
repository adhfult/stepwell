# Spec: Interest quiz

- Status: built (2026-09-28; approved by the owner's go-ahead in chat:
  "continue with next on what's on the list")
- Build step 4 of the v1 expansion (`docs/specs/v1-expansion-draft.md`,
  Sections 1, 2.3 and 2.7). Builds on `docs/specs/career-explorer.md`.

## Goal
Help a student who doesn't know what they want to do: answer 60 quick
"would you like this work?" questions, see which of six interest areas fit
them, and get a list of careers that match, without needing an account.

## User story
As a student with no idea what I want to do, I want to answer questions about
activities I'd enjoy and see careers that fit my interests, so I have a
starting point.

## Decisions made without asking (push back on any)
1. **60 questions, not the 30-question mobile version.** O*NET recommends the
   60 when possible. 5 pages of 12, so it never looks like a wall of
   questions.
7. **The site needs JavaScript** (found while building): pages with a
   loading skeleton stream in, and without JavaScript the content stays
   hidden behind the skeleton. Skeletons are required (AVOID.md) and sign-in
   already needs JavaScript for the bot check, so Stepwell keeps them rather
   than supporting browsers with JavaScript turned off.
2. **Optional, never at sign-up** (PRODUCT.md open question). Anyone can take
   it; an account is only needed to save results.
3. **Only scores are saved, never answers.** Saving is a button the student
   presses ("Save to my account"), not automatic, and "Remove my results"
   deletes them. Results live in the URL
   (`/interests/results?r=27&i=13&a=23&s=25&e=14&c=14`), so they can be
   bookmarked without an account.
4. **Scoring follows O*NET; matching is Stepwell's own.** Each answer counts
   0 to 4 (Strongly dislike to Strongly like), summed per area (0 to 40),
   checked against O*NET's documented example. Careers are ranked by how
   closely the student's six scores follow each career's six O*NET interest
   scores (Pearson correlation, done in the database). O*NET's own matching
   can differ, so the page doesn't call itself the "O*NET Interest
   Profiler"; the source line says the questions are O*NET's and the
   matching is Stepwell's.
5. **Area descriptions are Stepwell's own plain wording** of O*NET's six
   RIASEC definitions, in words a 13-year-old knows.
6. **No header link yet.** "Interests" doesn't fit next to "Careers" and
   "Sign in" at 320px; the phone "Menu" button (DESIGN.md) comes when the
   next section does. The home page and `/careers` link to the quiz.

## Acceptance criteria
Data
- [x] Source `onet_ip` (kind api, refreshed every 12 months): the 60
      questions from `/mnm/interestprofiler/questions` into
      `interest_questions` (index, area, text; public read).
- [x] `occupations` gains six interest scores (1 to 7) from
      `career_interest_types.csv` (scale "OI"), read by the O*NET adapter
      with a minimum row count like the other files.
- [x] `interest_results`: one row per student (latest result only), six
      scores 0 to 40, taken date; owner-only RLS; `user_id` from
      `auth.uid()`; deleted with the account.
- [x] `public.match_careers(r, i, a, s, e, c, zone)`: the 30 current careers
      whose interest scores correlate best with the student's, optionally
      only one preparation level; scores outside 0 to 40 are refused;
      identical scores in every area (no pattern to match) return nothing.

Quiz (`/interests`)
- [x] Intro: what it is, 60 questions, about 5 to 10 minutes, no account
      needed, nothing is saved unless you choose to.
- [x] Questions in 5 pages of 12 (a fieldset per question with the five
      choices as radio buttons); "Next" and "Back"; "Page 2 of 5"; a page
      can't be left with unanswered questions (error summary, as in other
      forms).
- [x] Submitting: the server checks all 60 answers with zod, works out the
      scores and sends the student to the results page. Answers aren't stored.

Results (`/interests/results`)
- [x] Scores validated with zod (bad values: a short "these results don't
      look right" message with a link to take the quiz).
- [x] The six areas, highest first, each with its score out of 40 as words
      and a simple bar (fill only, `primary`), and a one-sentence description;
      the top 3 highlighted in words ("Your top interests: Social,
      Investigative, Artistic").
- [x] Matching careers: a list with dividers (title link, facts line with
      education and median pay), the 10 closest first with "Show all 30
      matches" (a 30-row list was clutter at 320px), a preparation filter
      (all, or one of 5 levels) as a GET form, an empty state when nothing
      matches.
- [x] Save: signed in, "Save to my account" (or "Saved" and "Remove my
      results"); signed out, "Sign in to save your results" returning here.
- [x] Source line: questions from the O*NET Interest Profiler (USDOL/ETA)
      via O*NET Web Services, CC BY 4.0; career interest scores from the
      O*NET database; matching by Stepwell.

Elsewhere
- [x] Account page: "Your interests" (top 3 and a link to the matching
      careers, where "Remove my results" is), or an empty state linking to
      the quiz.
- [x] Home page and `/careers` link to the quiz.
- [x] Works at 320px and desktop; AVOID.md check; `npm run check` and
      `npm run test:db` pass.

## Data
| Table | Read | Write |
|---|---|---|
| `interest_questions`, occupations' interest scores | everyone | import functions only |
| `interest_results` | own row | own row (insert, update, delete) |

## Edge cases and errors
- Every answer the same (all "Unsure"): scores are equal, so there's
  nothing to match; the page says so and suggests answering again.
- Questions not imported yet: the quiz page says it isn't ready (error
  state), never a half-empty form.
- Tampered URLs or answers: zod refuses them; friendly messages.

## Out of scope
The 30-question version, O*NET's own matching API (it would be a call per
visit), saving answers, the phone "Menu" button.

## Build steps (each: checks pass, one commit)
| # | Goal | Check |
|---|---|---|
| 1 | Migration: interest columns, `interest_questions`, `interest_results`, `match_careers()`; pgTAP | RLS, grants, matching order, refusals |
| 2 | Adapters: interest scores in the O*NET import; `onet_ip` questions; scoring checked against O*NET's example | Unit tests; local imports |
| 3 | Quiz page and scoring action | By hand at 320px, with and without JavaScript |
| 4 | Results page, save and remove, account section, links | By hand; production build tour |

## Test plan
Unit tests for scoring and parsing; pgTAP for the database rules; Chrome at
320px and 1280px.

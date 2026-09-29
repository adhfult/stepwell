# Spec: Internships and programs (USAJOBS Pathways first)

- Status: approved (owner's go-ahead in chat, 2026-09-29: "All three");
  the live import waits for the owner's USAJOBS API key
- Build step 8 of the v1 expansion (`docs/specs/v1-expansion-draft.md`,
  Sections 1 and 2.6).

## Goal
Show students paid federal internships they can apply to now, with where,
what it pays and when it closes, linking to the official USAJOBS posting.

## User story
As a high school or college student, I want to find paid internships I can
apply for, so I can try a career before choosing it.

## Checked 2026-09-29 (developer.usajobs.gov)
- `GET https://data.usajobs.gov/api/search?HiringPath=student` finds jobs
  open to students (the Pathways Internship Program and other student
  hiring). Up to 500 results per page (`ResultsPerPage`, `Page`).
- Headers: `Host: data.usajobs.gov`, `User-Agent: <the email used to
  request the key>`, `Authorization-Key: <the key>`. Key requests:
  https://developer.usajobs.gov/apirequest/ (reachable from the owner's
  network, unlike CareerOneStop).
- Each job: `PositionTitle`, `OrganizationName`, `PositionLocation[]`,
  `ApplicationCloseDate`, `PositionURI`, `PositionRemuneration[]`
  (min, max, interval), `QualificationSummary`,
  `UserArea.Details.WhoMayApply`. The terms of use say nothing about
  storing data; the rate-limit guide gives no numbers, so one run a day
  with a few requests.

## Decisions (push back on any)
1. **USAJOBS only for now.** Summer and pre-college programs from other
   sites come later, only through the allowlist (decision 0007).
2. **Refreshed daily** (postings close fast); postings past their closing
   date are hidden, and ones that disappear are removed.
3. **Secrets:** `USAJOBS_API_KEY` and `USAJOBS_EMAIL` (the email the key was
   requested with, which USAJOBS wants as the User-Agent), in GitHub
   Actions secrets and `.env.local`.
4. **Page `/internships`**, in the Menu: filters by state (profile state
   first; "Anywhere" and "Remote" too); each posting shows title, agency,
   places, pay ("$18.50 to $24.00 an hour"), who may apply in plain words,
   the closing date with DESIGN.md's deadline rules, and "Apply on USAJOBS
   (usajobs.gov)". Details fold away like scholarships.
5. **Career pages** link to internships when a posting's title matches the
   career's family? Not in v1: USAJOBS job series don't map cleanly to
   O*NET codes, so the link would be guesswork.

## Acceptance criteria
- [ ] Source `usajobs` (api, 1 day): adapter pages through
      `HiringPath=student` results with the key in headers (never the URL),
      validates each posting with zod, and stages it.
- [ ] `opportunities` (public read): id (USAJOBS posting id), title,
      organization, locations (city, state, remote), pay min/max and
      interval, who may apply, close date, summary (at most 500 characters,
      plain text), URL (https, usajobs.gov), retrieved date. Merged in one
      transaction; missing postings removed.
- [ ] `/internships` page with filters, list, empty and error states,
      skeleton, source line ("Source: USAJOBS, U.S. Office of Personnel
      Management"); Menu link.
- [ ] Unit tests on a saved sample response; pgTAP for the merge and RLS;
      checked at 320px; `npm run check` and `npm run test:db`.

## Out of scope
Non-federal internships, summer and pre-college programs, saving
postings (the planner, step 9), matching to careers.

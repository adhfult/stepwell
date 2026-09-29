# Spec: Scholarships

- Status: approved 2026-09-28 (owner: official list first; skip the second
  question set; first batch = federal plus CA, TX, FL, NY, PA)
- Build step 7 of the v1 expansion (`docs/specs/v1-expansion-draft.md`,
  Sections 2.6, 2.8 and 4.1; decisions 0006 and 0007).

## Goal
Show students scholarships and grants they can actually get, starting with
the ones they qualify for, with deadlines that stand out, from official
sources only.

## User story
As a high school student, I want to see scholarships I qualify for and when
they're due, so I don't miss free money for college.

## What changed since the approved design (checked 2026-09-28)
- **CareerOneStop is out.** Its website returns 403 (CloudFront) for the
  owner on every network tried, including a phone on cellular data, so the
  API can't be registered for. Its API host answers, but without a key it's
  no use. Revisit later.
- **No open scholarship dataset exists.** Data.gov has reports about
  scholarships, not lists; Peterson's sells a licensed dataset; the big
  aggregators (BigFuture, Scholarships.com, Fastweb) forbid scraping and
  only appear through third-party scrapers, which decision 0007 rules out.
- **Official programs are public.** Every state's higher-education agency
  and several federal agencies publish their scholarship and grant programs
  on government pages (for example Georgia HOPE, Tennessee Promise, New
  York's Excelsior, NOAA Hollings, ROTC).

## Proposed decisions (please confirm or change)
1. **Source: a curated list of official programs** (source `official_list`,
   kind manual). Federal programs open to high school or college students,
   plus each state's main programs (about 2 to 6 per state, 50 states and
   DC): roughly 150 to 250 listings at first. Every entry comes from the
   program's official government page, with that link and the date checked.
   Private scholarships come later, only from sites whose terms allow it
   (decision 0007).
2. **Kept as a data file in the repo** (`data/scholarships/*.json`, one file
   per state plus `federal.json`), validated with zod and loaded by an
   import job like the other sources. Not in migrations, because deadlines
   change every year and a data file is easier to review and update.
3. **Freshness rule:** each entry has `checked_at`. Older than 12 months,
   the listing shows "Check the official page for this year's details"
   instead of a deadline, and the yearly re-check is a PROGRESS item.
4. **Less sensitive data than decision 0006 allows.** Official programs
   mostly depend on state, school stage, GPA, planned field, citizenship,
   FAFSA/financial need and military family. So v1 asks only: GPA,
   intended fields, first-generation, citizenship status, military family,
   and "I plan to file the FAFSA" (need-based programs say "Needs the FAFSA"
   instead of asking income). **The second opt-in step (heritage, gender,
   religion, disability, income band) is not built** until a source needs
   it. State and school stage come from the profile, which already exists.
5. **Everything else in decision 0006 stays:** a separate opt-in screen
   first, every question optional with "Prefer not to say", owner-only
   `eligibility_profiles`, "Remove my answers", deleted with the account and
   after 12 months without signing in (pg_cron), consent version stored,
   answers never logged or sent anywhere, matching inside the database.
6. **Matching labels** (Section 2.8): "You qualify" (every rule met by an
   answer), "You might qualify" (a rule depends on something you didn't
   answer), otherwise hidden. A blank answer never hides a listing.
   Signed-out visitors and students without answers see everything for
   their chosen state, with each listing's requirements in plain words.
7. **Phone "Menu" button now** (DESIGN.md "Page frame"): Careers,
   Interests, Scholarships and the account link no longer fit on one line
   at 320px.
8. **Legal:** the Privacy page draft must describe the eligibility answers
   before any real student can give them (legal-pages spec). In development
   that's fine; it stays a launch blocker.

## Acceptance criteria (once approved)
Data
- [ ] `data/scholarships/` files with a zod schema: id, title, sponsor,
      sponsor type (federal or state), official https link (government or
      the program's own domain), award (amount range and/or words such as
      "full tuition at public colleges"), deadline (date, "usually around
      <date>", "rolling" or unknown), who can apply (stages), rules (state
      residency, minimum GPA, fields as 2-digit CIP families, citizenship,
      first-generation, military family, needs FAFSA), a short description in
      Stepwell's own words (at most 500 characters), `checked_at`, source URL.
- [ ] Source `official_list`; import into `scholarships` and
      `scholarship_criteria` (public read); a file that fails validation
      fails the run.
- [ ] `eligibility_profiles` (owner-only; one row per student, created only
      by the opt-in; answer columns only; check constraints; `consent_version`,
      `consented_at`); cascade on account deletion; pg_cron deletes rows of
      students with no sign-in for 12 months.
- [ ] `public.match_scholarships(state, stage)` (security invoker) returns
      listings with a match level and the reasons, using the caller's own
      eligibility row if there is one.

Pages
- [ ] `/scholarships`: state filter (profile state first), stage filter,
      list with "You qualify" / "You might qualify" tags, amount, deadline
      rules from DESIGN.md ("Closes in 5 days (Mar 1)" in accent within 14
      days; "Closed Mar 1" muted; "Usually due around March 1"), official
      link labeled as leaving Stepwell, source line per listing.
- [ ] `/account/eligibility`: opt-in screen (what's asked, why, how it's
      used, how to remove it), then the questions, each with one sentence
      on why and "Prefer not to say"; "Remove my answers".
- [ ] Career pages: "Scholarships for this field" link when listings match
      the career's CIP families.
- [ ] Header "Menu" button on phones; account page links to eligibility.
- [ ] Loading, empty and error states; 320px; AVOID.md; SECURITY.md items
      listed; `npm run check` and `npm run test:db`.

## First research batch (before building)
Federal programs and 5 states (the owner's choice; for example the most
populous: CA, TX, FL, NY, PA) to test the file format and the matching on
real rules, then the remaining states in batches.

## Out of scope
Private scholarships (until an allowed source exists), the second opt-in
step, application tracking, essay help, the planner (step 9).

## Owner's answers (2026-09-28)
1. Start with the curated official list; private scholarships later, only
   through the allowlist.
2. Skip the sensitive second question set for now.
3. First batch: federal plus California, Texas, Florida, New York and
   Pennsylvania, then the other states in batches.

## Listing format (`data/scholarships/<state or federal>.json`)
An array of entries; unknown facts are `null`, never guessed:
```json
{
  "id": "ca-cal-grant-a",
  "title": "Cal Grant A",
  "sponsor": "California Student Aid Commission",
  "sponsor_type": "state",
  "url": "https://www.csac.ca.gov/cal-grants",
  "award": { "min": null, "max": 14226, "text": "Pays tuition at a University of California campus, up to $14,226" },
  "deadline": { "kind": "date", "date": "2027-03-02" },
  "stages": ["high_school", "college"],
  "rules": {
    "state": "CA",
    "min_gpa": 3.0,
    "fields": [],
    "citizenship": null,
    "first_generation": false,
    "military_family": false,
    "needs_fafsa": true,
    "other": "Must attend a qualifying California college"
  },
  "description": "Plain words, at most 500 characters.",
  "checked_at": "2026-09-28"
}
```
- `deadline.kind`: `date` (with `date`), `usually` (with `month_day`,
  "03-02"), `rolling`, or `unknown`.
- `stages`: any of `high_school` (apply as a high school student),
  `college` (current undergraduates), `graduate`, `adult` (returning or
  non-traditional students).
- `rules.citizenship`: `null` (no rule), `citizen`, or
  `citizen_or_eligible_noncitizen` (the federal aid definition).
- `rules.fields`: 2-digit CIP families (for example "51" health, "11"
  computing); empty means any field.
- `rules.other`: any requirement Stepwell doesn't ask about (heritage,
  county, specific college, service commitment, ...). A listing with
  `other` can be "You might qualify" at best, and says what to check.

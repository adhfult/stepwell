# Data sources: Stepwell

All data comes from free official U.S. government sources. It is **copied into
our Supabase tables on a schedule**; pages never call these APIs directly.
That keeps pages fast, stays within rate limits, and lets us join datasets.

## O*NET Web Services (careers)
- **What:** 900+ occupations: descriptions, tasks, skills, knowledge,
  education/training, related occupations, and the Interest Profiler.
- **Owner:** U.S. Department of Labor / National Center for O*NET Development.
- **Access:** the O*NET database is a free CC BY download (occupations, tasks,
  skills, knowledge ratings, alternate titles, related occupations, interest
  scores); Web Services API v2 (API key in an `X-API-Key` header, stored as
  `ONET_API_KEY`, server-side only) adds pay and outlook (My Next Move Job
  Outlook) and the Interest Profiler questions.
- **Rules:** attribution is required wherever O*NET data is shown; the API is
  rate-limited, so cache results. Check the current terms at sign-up.
- **Key:** occupations use O*NET-SOC codes (e.g. `29-1141.00` Registered Nurses).
- **Refresh:** the import (`src/jobs/sources/onet.ts`) runs monthly: it reads
  the current release from https://www.onetcenter.org/database.html and
  downloads that release's CSV files (e.g. `db_31_0_csv/occupation_data.csv`,
  no key). Same release as last time = unchanged; O*NET's ETags differ
  between its servers, so they aren't used. Release 31.0 loaded 2026-09-28
  (1,016 occupations, 62,458 titles).
- **Files used:** `occupation_data`, `job_titles` (search), `sample_of_reported_titles`
  ("also called"), `job_zones`, `education` (most common level; O*NET's
  "Recommend Suppress" shares are counted but not shown), `task_statements`
  and `task_ratings` (top core tasks), `essential_skills` and
  `transferable_skills` (top skills; 31.0 split the old skills file),
  `related_occupations`. Each has a minimum row count; about 65 MB per
  release, 2 to 3 minutes at O*NET's download speed.
- **Retired careers:** a code missing from a new release is marked
  `retired_at`, never deleted, so saved careers keep working.
- **Knowledge ratings** (`knowledge.csv`, scale "IM", 1 to 5): 33 areas per
  career, used for AP suggestions (areas rated 3.5 or more). The list of AP
  courses comes from College Board's course index (checked 2026-09-28, 42
  courses) and the area-to-course mapping is Stepwell's own, both entered by
  hand in `supabase/migrations/*_ap_suggestions.sql`. AP is a trademark of
  College Board; say so wherever AP courses are shown.
- **Pay and outlook** (source `onet_outlook`, `src/jobs/sources/onet-outlook.ts`):
  Web Services API v2, `https://api-v2.onetcenter.org/mnm/careers/` (923
  careers) then `/mnm/careers/{code}/job_outlook` for each, with the
  `X-API-Key` header. BLS wage estimates (10th percentile, median, 90th;
  annual or hourly; `_over` = above the BLS maximum) and 2024 to 2034
  projections. Terms (checked 2026-09-28): at most 5 requests a second and
  50,000 a day (we make 2 a second, about 8 minutes); link to O*NET Web
  Services near the data. A 422 means no data for that career. Refreshed
  every 3 months.
- **Interest Profiler questions** (source `onet_ip`, `src/jobs/sources/onet-ip.ts`):
  `/mnm/interestprofiler/questions` (60 questions, answers 1 to 5), cached
  once a year. The import stops if the answer scale changes, because scoring
  (answers count 0 to 4, summed per area) depends on it; that rule matches
  O*NET's documented example exactly. Career interest scores come from
  `career_interest_types.csv` in the database download (scale "OI", 1 to 7,
  923 careers). Matching is Stepwell's own (correlation in `match_careers()`).

## College Scorecard (colleges and programs)
- **What:** U.S. colleges: cost, admission rate, graduation rate, and
  field-of-study data (programs by CIP code, with debt and earnings of graduates).
- **Owner:** U.S. Department of Education.
- **Access:** free API key from api.data.gov (`SCORECARD_API_KEY`, server-side).
- **Rules:** the key is rate-limited per hour; request only the fields we use
  and page through results. Some values are suppressed (null) for privacy;
  show "not available", never 0.
- **Key:** colleges use `UNITID`; programs use 4-digit CIP codes.
- **Refresh:** every 3 months (source `scorecard`, `src/jobs/sources/scorecard.ts`).
- **What we read** (checked 2026-09-28): operating schools that mainly award
  certificates or degrees (5,787), 100 per page, with only the fields the
  Scorecard website shows: net price (public or private by ownership),
  admission rate, graduation rate (`outcome_percentage_suppressed.all_students.8yr.award_pooled`),
  and per program (4-digit CIP, credential) median earnings 4 and 1 years
  after finishing, median Stafford and Grad PLUS debt at that college, and
  graduates. Programs with neither graduates nor earnings are skipped. The
  key goes in the `X-Api-Key` header, never the URL. 1,000 requests an hour.

## Connecting careers to programs (the crosswalk)
- The CIP–SOC crosswalk (from the National Center for Education Statistics
  and BLS) links programs of study (CIP) to occupations (SOC).
- Stepwell uses O*NET's version, "2020 CIP to O*NET-SOC 2019"
  (`https://www.onetcenter.org/crosswalks/cip/Education_CIP_to_ONET_SOC.xlsx`,
  Excel only, CC BY 4.0), which maps programs straight to O*NET career codes
  (8,501 links). Stored in `occupation_programs` (source `onet_cip`,
  `src/jobs/sources/onet-cip.ts`), refreshed yearly.

## Scholarships and opportunities (v1)
- **CareerOneStop Web API** (U.S. Dept. of Labor). The owner got a token by
  email on 2026-10-04 (`CAREERONESTOP_USER_ID`, `CAREERONESTOP_API_TOKEN`;
  Bearer header, the ID in the path); a test call to
  `/v1/occupation/{userId}/nurse/N/0/3` returned 200. **No scholarships:**
  the API explorer (api.careeronestop.org/api-explorer) lists 37 endpoints
  and no Scholarship Finder, and `/v1/scholarshipfinder/...` and
  `/v1/scholarship/...` return 404. The Scholarship Finder seems to be on
  the website only; ask CareerOneStop whether its data is available.
  Used (built 2026-10-04, spec `docs/specs/careeronestop.md`):
  `cos_youth_programs` (youth service providers, monthly, 1 call),
  `cos_licenses` and `cos_certifications` (each career, every 3 months,
  0.5 s apart). Training returns 401 for this token (ask CareerOneStop).
  Terms: their data license asks for attribution to DOLETA and Minnesota
  DEED on every page showing the data (`CareerOneStopSource`). No
  robots.txt on api.careeronestop.org. Contacts and staff emails in the
  youth list are never stored.
- **Official list** (source `official_list`, built 2026-09-29): Stepwell's
  curated list of official state and federal programs in
  `data/scholarships/<state>.json` and `federal.json`, researched from
  government pages, each with its link and `checked_at`; loaded daily by
  `src/jobs/sources/official-list.ts` (no fetching). Re-check each entry
  yearly; older than 12 months, the page says to check the official page.
  Covers federal programs and all 50 states plus DC (264 programs,
  2026-09-29); the research rules are in `data/scholarships/README.md`.
- **USAJOBS Search API** (source `usajobs`, built and first run live
  2026-09-29): open federal postings on the student hiring path
  (`GET https://data.usajobs.gov/api/search?HiringPath=student`, 500 a page),
  read daily by `src/jobs/sources/usajobs.ts` into `opportunities`. Key in
  the `Authorization-Key` header and the key holder's email as the
  User-Agent, as USAJOBS requires. Unpaid ("without compensation") and
  closed postings are left out, and so are ordinary jobs that merely accept
  students: a student job lists at most 3 hiring paths or names itself in
  its title or offering type (`isStudentJob()`). Postings that leave
  USAJOBS are removed.
  - Terms (https://developer.usajobs.gov/guides/terms-of-use, checked
    2026-09-29): the standard federal-system notice, "to be used by
    authorized users only" (a key makes us one). The Search API reference
    says it "will be leveraged by Commercial Job Boards, Mobile Applications
    and Social Media sites who desire to provide employment opportunities on
    their site". Limits: 500 rows a page, 10,000 a query; no request rate given.
  - robots.txt on data.usajobs.gov is `Disallow: /` for all crawlers
    (checked 2026-09-29). The keyed API is the documented way in, so this
    adapter alone skips the robots.txt check (decision 0007); spacing,
    retries and the page cap still apply.
  - First live run (2026-09-29): 103 postings; 17 unpaid and 26 not
    student jobs left out, 60 kept, 0 rejected. Live data differs from the
    API reference: every value is a string, `WhoMayApply` is empty (the
    adapter uses `HiringPathDisplay`), some pay minimums are a $0.01
    placeholder (under $1 counts as not given), and remote places end in
    ", United States". The test fixture is four real postings, trimmed of
    long text and contact fields.
- **Official programs** (source `official_programs`, built 2026-09-29):
  Stepwell's curated list of free or paid summer programs, internships and
  research from federal agencies and national labs, state agencies and
  Governor's Schools, and public universities, in
  `data/programs/<state>.json` and `federal.json` (111 programs), read
  daily by `src/jobs/sources/official-programs.ts` into `student_programs`.
  Researched by agents from the official pages, 20 spot-checked (96 of 100
  facts matched; 4 wording fixes). Re-checked with the scholarships
  (`npm run scholarships:due`). Spec: `docs/specs/programs.md`.
- **Allowlisted sites:** only sites whose terms and robots.txt allow it; each
  gets an entry in "Allowlisted sites" below before its adapter is merged
  (process: v1 expansion draft, Section 3.9; decision 0007).

## Allowlisted sites
None yet.

## Later (not in the MVP)
- **BLS Employment Projections:** detailed 10-year growth by occupation.
- **CareerOneStop:** apprenticeships, certifications, training programs.

## Environment variables (server-only, never NEXT_PUBLIC_)
| Variable | Used by |
|---|---|
| `ONET_API_KEY` | O*NET import job |
| `USAJOBS_API_KEY`, `USAJOBS_EMAIL` | Internships import job (the email is the one the key was requested with; it goes only to USAJOBS, as the User-Agent) |
| `CONTEXT_DEV_API_KEY` | Import jobs, hard pages only |
| `SCORECARD_API_KEY` | Scorecard import job |
| `IMPORT_DATABASE_URL` | Import jobs: the `importer` role's pooler connection (decision 0008) |
| `IMPORT_CONTACT` | Import jobs: contact address in the User-Agent (GitHub variable, not secret) |

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
- **CareerOneStop Web API** (U.S. Dept. of Labor): Scholarship Finder, 9,500+
  awards; open data under USDOL's Open Data Policy. Confirm the endpoint and
  fields at registration.
- **USAJOBS API:** federal Pathways internships (open to high school students).
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
| CareerOneStop and USAJOBS keys (names set at registration) | Scholarship and internship import jobs |
| `CONTEXT_DEV_API_KEY` | Import jobs, hard pages only |
| `SCORECARD_API_KEY` | Scorecard import job |
| `IMPORT_DATABASE_URL` | Import jobs: the `importer` role's pooler connection (decision 0008) |
| `IMPORT_CONTACT` | Import jobs: contact address in the User-Agent (GitHub variable, not secret) |

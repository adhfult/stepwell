# Data sources: Stepwell

All data comes from free official U.S. government sources. It is **copied into
our Supabase tables on a schedule**; pages never call these APIs directly.
That keeps pages fast, stays within rate limits, and lets us join datasets.

## O*NET Web Services (careers)
- **What:** 900+ occupations: descriptions, tasks, skills, knowledge,
  education/training, related occupations, and the Interest Profiler.
- **Owner:** U.S. Department of Labor / National Center for O*NET Development.
- **Access:** free account at services.onetcenter.org (username + password,
  stored as `ONET_USERNAME` / `ONET_PASSWORD`, server-side only).
- **Rules:** attribution is required wherever O*NET data is shown; the API is
  rate-limited, so cache results. Check the current terms at sign-up.
- **Key:** occupations use O*NET-SOC codes (e.g. `29-1141.00` Registered Nurses).
- **Refresh:** monthly job (O*NET updates quarterly).

## College Scorecard (colleges and programs)
- **What:** U.S. colleges: cost, admission rate, graduation rate, and
  field-of-study data (programs by CIP code, with debt and earnings of graduates).
- **Owner:** U.S. Department of Education.
- **Access:** free API key from api.data.gov (`SCORECARD_API_KEY`, server-side).
- **Rules:** the key is rate-limited per hour; request only the fields we use
  and page through results. Some values are suppressed (null) for privacy;
  show "not available", never 0.
- **Key:** colleges use `UNITID`; programs use 4-digit CIP codes.
- **Refresh:** monthly job (Scorecard updates a few times a year).

## Connecting careers to programs (the crosswalk)
- The CIP–SOC crosswalk (from the National Center for Education Statistics
  and BLS) links programs of study (CIP) to occupations (SOC).
- Stored as a table `occupation_program_map (soc_code, cip_code)`, loaded
  from the official crosswalk file; re-check when either code set updates.

## Later (not in the MVP)
- **BLS Employment Projections:** 10-year growth outlook by occupation.
- **CareerOneStop:** apprenticeships, certifications, training programs.

## Environment variables (server-only, never NEXT_PUBLIC_)
| Variable | Used by |
|---|---|
| `ONET_USERNAME`, `ONET_PASSWORD` | O*NET import job |
| `SCORECARD_API_KEY` | Scorecard import job |
| `SUPABASE_SERVICE_ROLE_KEY` | Import jobs only (writes reference tables). Never in app code. |

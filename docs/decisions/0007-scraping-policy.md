# 0007: Scraping policy

- Date: 2026-09-28
- Status: accepted

## Context
Scholarships, internships and programs are spread over many websites. The
owner chose the largest legal set of sources. Stepwell needs a rule for which
sites it may read and how, so scraping stays legal, polite and easy to stop.

## Decision
- Official APIs and open data first (CareerOneStop, USAJOBS, O*NET, College
  Scorecard). Other sites only if their terms allow it and robots.txt permits
  the pages we read, each recorded in the "Allowlisted sites" section of
  `docs/DATA_SOURCES.md` with the terms sentence quoted and the date checked.
- Terms are re-checked every 12 months; the import runner refuses a source
  whose check is older.
- Polite fetching: a StepwellBot User-Agent with a contact address, at most
  one request every 5 seconds per host (slower if the site asks), conditional
  requests, a page cap per run.
- No logins, no CAPTCHAs, no getting around bot protection. A site that
  blocks Stepwell leaves the allowlist.
- Copy facts (title, sponsor, amount, deadline, rules, link). Descriptions
  only where terms allow reuse, at most 500 characters. Never images or
  people's names, emails or phone numbers.
- A takedown request is honored the same day (source hidden) and the adapter
  removed within 48 hours.

## Addendum (2026-09-29)
The robots.txt rule is for other sites. An official API from the list above
that its owner documents for programmatic use may skip the robots.txt check
when its host disallows all crawlers: data.usajobs.gov (`Disallow: /`) is the
first. The adapter opts out explicitly (`skipRobots` in `src/jobs/run.ts`);
the User-Agent, spacing, retries and page cap still apply.

## Alternatives considered
- APIs only: simplest and safest, but far fewer listings.
- Scrape any public page: more listings, but legal risk and an unfriendly
  bot, which is not what a student-facing project should be.

## Consequences
- Every new site is a pull request with its allowlist entry, `sources` row,
  adapter and saved test pages.
- Some well-known scholarship sites will never appear because their terms
  forbid scraping.

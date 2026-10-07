# Project tools

## Project facts
- Stack: Next.js + TypeScript; data jobs run as `node src/jobs/*.ts` (Node type stripping).
- Test command: `npm test` (vitest); `npm run check` = lint + typecheck + tests.
- Constraints: free only (no paid APIs); every fetch goes through the polite fetcher
  (`src/jobs/fetch/polite.ts`); never read `.env.local`; local scholarship files link, never copy.

## award-sites:gaps
Research worklist for one state's `data/award-sites/<st>.json`: counties with no foundation, the
biggest Scorecard colleges not yet listed (unitid, website), and listed unitids that aren't a
college in that state (exits 1). Reads the local database (`npm run db:start`).
`npm run award-sites:gaps -- TX`
check: `npx vitest run src/jobs/award-sites-gaps.test.ts`

## award-sites:check <url>
Vets one candidate link before adding it: status, where it lands, page title. Without a URL it
checks every link in `data/award-sites/` (the monthly job).
`npm run award-sites:check -- https://example.org/scholarships/`
check: `npx vitest run src/jobs/award-sites-check.test.ts`

## award-sites-research (skill)
Step-by-step routine for researching and adding one state's local scholarship file.
skill: `/award-sites-research`

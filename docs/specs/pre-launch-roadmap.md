# Pre-launch roadmap

- Status: approved order (2026-10-04)

The owner asked for six upgrades before launch. They are seven independent
pieces, each with its own spec, plan and build, in this order. Each later
item gets its own brainstorm when it starts.

1. **College directory** (`college-directory.md`): `/colleges` with filters,
   a page per college, SAT/ACT, test policy, cost by income, setting and type
   from College Scorecard. Replaces the earlier "college detail pages" item.
2. **GPA and test tools**: weighted GPA (regular, honors, AP, IB, dual
   enrollment), "what grade do I need in these classes to reach a Y GPA" and
   similar what-ifs, the official SAT/ACT concordance, a score matcher
   against the directory's ranges.
3. **NCAA athlete path**: colleges by sport and division (EADA, U.S.
   Department of Education), eligibility rules (core courses, GPA scale), a
   recruiting timeline by grade, athlete items in the plan, a sport filter
   on the directory. Every division.
4. **More data**: a context.dev fetcher for allowlisted sites only
   (decision 0007), plus a hand-curated source file for sites we can't
   scrape; more scholarships, AP data and internships.
   - Request: `POST https://api.context.dev/v1/web/scrape`, header
     `Authorization: Bearer <CONTEXT_DEV_API_KEY>` (server-side jobs only).
   - `formats: { json: true }` with `jsonParams.schema` describing the
     listing fields (title, sponsor, amount, deadline, eligibility, URL);
     the reply is validated with zod before staging. `formats.markdown` for
     PDFs and Word files, which it also reads.
   - `maxAgeMs` reuses cached copies to save credits; a budget guard stops
     the run on `key_metadata.credits_remaining`; each output has its own
     `success`, so partial failures are rejected and logged, never saved.
   - From 1 credit a page; free tier about 1,000 credits a month (check
     before relying on it).
5. **Course overviews**: AP and common intro college courses, summaries
   written by Stepwell, linking free sources (OpenStax, Khan Academy,
   College Board course pages). No copied course text.
6. **Interactive interest quiz**: card sorts, scenario choices, work values,
   results that explain themselves and lead to next steps.
7. **AI helper**: chat, helper and study guide on a free provider chosen for
   its data terms (no training on students' prompts), server-only, per-user
   daily limits, answers grounded in Stepwell's data. Needs a decision
   record: AGENTS.md says Anthropic API and PRODUCT.md says AI comes later.
   Research so far: `~/notes/stepwell-free-ai-hosting.md` (owner's machine).

Still queued from earlier: calmer, info-first app pages; pay by state (BLS
OEWS); what the work is like (O*NET work context). They slot in between the
items above where they fit.

# 0016: AI provider: Anthropic, first-party only

- Date: 2026-10-11
- Status: accepted

## Context
The owner now has API keys for several AI services (Anthropic, Google
Gemini, Groq, OpenRouter, and several reseller services) and wants AI in Stepwell, both in background data jobs and, later,
a student-facing helper. Replies being slow is fine. Users may be 13 to 17
(decision 0002), so where their words go matters more than price. The project
instructions already name the Anthropic API; the pre-launch roadmap (item 7) said "a free
provider", and PRODUCT.md listed an AI advisor as "not doing". Decision 0015
ruled out paid services for reading scholarship pages; the owner now accepts
small API costs (about $1 for a run over every career).

## Decision
- Stepwell calls AI through the **Anthropic API directly**, with the official
  `@anthropic-ai/sdk`, from server code and import jobs only. Never from the
  browser.
- **No resellers or proxies** (services that resell or relay other
  companies' models), not even for background jobs over public data. We can't know
  what they keep or for how long, reselling keys usually breaks the model
  maker's terms, and a proxy that disappears mid-run costs more than it saves.
- **No gateway in between** (Vercel AI Gateway, OpenRouter): each one is
  another company that handles requests.
- Each AI use gets its own spec. Background jobs come first: text written
  ahead of time, from public data, reviewed by the owner, so students never
  wait. A student-facing helper comes after the first round of real students,
  with per-user daily limits (roadmap item 7).
- The key is `ANTHROPIC_API_KEY`, a secret: import jobs read it through
  `src/jobs/env.ts`; the app reads it through `src/lib/env.ts` only once a
  feature in the app needs it.

## Alternatives considered
- Google Gemini: the free tier may use prompts to improve Google's products,
  which rules it out with teen users. The paid tier doesn't; it is the named
  fallback if Anthropic stops fitting.
- Groq (open models, fast): check its data terms before use; second fallback.
- Local Ollama (free): about 9 minutes a page on the owner's PC (decision
  0015), too slow for ~1,000 careers.
- Resellers: cheaper per token, unknown data handling (see Decision).

## Consequences
- One new dependency and one new secret.
- AI-written text must say so in its source line, alongside the attribution
  for the data it was written from (O*NET still asks for its own).
- Switching to a fallback means a new decision and a small code change; no
  provider-neutral wrapper is built ahead of time.

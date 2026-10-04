# 0012: Home is the intro page, with a live example and alternating bands

- Date: 2026-10-04
- Status: accepted (the owner asked for an introduction page holding most of
  the decoration; chose "home becomes the intro" and "walk one real example")

## Context
Home already had a hero, but below it sat four radio panels with static
screenshots. The owner wants a real front door for new visitors, with the
decorative side of Stepwell concentrated there, and calmer, info-first app
pages afterwards.

## Decision
- `/` stays home for everyone and becomes the intro.
- Below the hero, one fixed example (Registered Nurses in Ohio) walks the
  four steps with live numbers from our own tables, replacing the
  screenshots.
- The intro page is the one exception to "at most one band per page": its
  step sections alternate teal band and stone surface, separated by a
  stepped SVG edge. App pages keep one band at the top.

## Alternatives considered
- **A separate /welcome page:** two front doors, and search visitors would
  usually land on the wrong one.
- **A scroll-pinned stepwell:** the most decorative, but more motion code
  that must switch off for reduced motion.
- **Keep home, add sections:** smallest change, but still screenshots, not
  a real demo.

## Consequences
- Home reads Supabase on each view, so it renders dynamically.
- The screenshots leave the home page (files stay in `public/screenshots/`).
- The source list moves to `src/lib/sources/list.ts`, shared with
  /about-data.

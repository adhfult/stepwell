# 0010: Allow hard stone depth and a small motion budget

- Date: 2026-10-04
- Status: accepted (the owner asked for a more interactive, 3D, modern UI
  and chose this direction in brainstorming)

## Context
The first design rules (2026-09-27) banned drop shadows, hover movement and
all motion but one moment, because generated sites all reach for soft
shadows, glass, glow and fade-ups at once. The result was calm but flat, and
the owner wants Stepwell to feel more modern and interactive.

## Decision
- **Depth:** one kind of shadow, the hard "stone edge" (no blur, a solid
  token color), only on Primary, Secondary and Delete buttons. Panels and
  list rows stay flat, so depth still means "you can press this".
- **3D:** a drawn stepwell on the home page (CSS 3D transforms) and a
  terraced route line on the career page. Screenshots stay flat.
- **Motion budget:** page crossfades and the career title morph; the
  stepwell's entrance, tilt and rising landing; the button rise and press;
  the career route line drawing in. Nothing else moves, and reduce motion
  switches all of it off.
- **Type:** Bricolage Grotesque replaces Bitter for headings.
- Still banned: soft or blurred shadows, glass, gradients, glows, orbs, dot
  grids, hover movement on anything but buttons.

## Alternatives considered
- **Full rebrand with a WebGL scene (three.js / React Three Fiber):** the
  biggest wow, but heavy on school Chromebooks and phones, and it throws
  away a design system that already passes contrast checks.
- **Motion only, no depth:** smallest change, but not the "3D" the owner
  asked for.
- **A motion library:** CSS and React's built-in `<ViewTransition>` cover
  every effect, so it would be a dependency for nothing.

## Consequences
- AVOID.md now has exceptions, so reviews must check the motion budget in
  DESIGN.md, not just "does it move".
- The CSP blocks inline style attributes, so dynamic values (the tilt) must
  be set from JavaScript with `style.setProperty`, never rendered by the
  server.
- Every motion needs a reduce-motion check in the browser.

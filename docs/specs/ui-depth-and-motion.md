# Spec: Depth, motion and the 3D stepwell

- Status: approved by the owner ("Proceed with what you have planned", 2026-10-04); built 2026-10-04

## Goal
Make Stepwell look more modern and interactive, with real depth and better
type, while keeping the "Water and Stone" identity, the calm tone and the
accessibility rules. The owner's reference was a list of inspiration sites
(deck.gallery, animos.app, godly.design, transitions.dev,
backgrounds.supply); we take motion, page transitions and depth from them,
not a copied look.

Decisions the owner made:
- Evolve "Water and Stone". Same palette, same square stone shapes, no rebrand.
- Headings in **Bricolage Grotesque**; body stays Atkinson Hyperlegible Next.
- The centerpiece is an **interactive 3D stepwell** on the home page, built
  with CSS 3D transforms (no 3D library). A terraced route line appears on
  each career page.
- **Stone keycap buttons**: a hard 4px edge, a 2px rise on hover, sinking
  flush when pressed. List rows and panels stay flat.
- No new dependencies. Why: CSS covers every effect here, and a WebGL scene
  would be heavy on school Chromebooks and phones.

The rule changes are in `docs/decisions/0010-depth-and-motion.md`,
`docs/design/DESIGN.md` and `docs/design/AVOID.md`.

## User story
As a student opening Stepwell, I want a home page that shows the path
(career, programs and colleges, money and experience, plan) as something I
can explore, and pages that feel connected when I move between them, so the
site feels worth spending time in.

## Acceptance criteria
Fonts and depth
- [x] Headings render in Bricolage Grotesque, self-hosted by next/font (no
      request to fonts.googleapis.com). Bitter is gone.
- [x] Only hard shadows exist in Tailwind (`--shadow-*` reset); Primary,
      Secondary and Delete buttons have the stone edge; Quiet buttons, panels
      and list rows have none.
- [x] Buttons rise 2px on hover and sink flush when pressed; under reduce
      motion they only change color.

The 3D stepwell (home page)
- [x] Four stone slabs step down into water, one per stop, drawn with CSS 3D
      transforms using only DESIGN.md colors.
- [x] Choosing a slab (click, tap, or Tab then arrow keys) shows that stop's
      panel (text, links, real screenshot) and raises the slab, which gets the
      `highlight` "you are here" stone and the words "You are here".
- [x] Choosing works with JavaScript off: native radios plus CSS `:has()`.
- [x] The scene tilts toward the pointer by at most 6 degrees and settles
      back when the pointer leaves; the tilt is not attached under reduce
      motion.
- [x] A one-time entrance (slabs settle into place, 600ms); under reduce
      motion the scene appears in its final 3D state.
- [x] At 320 and 390px the heading, search and start of the scene fit without
      clutter; every slab's tap area is at least 44px tall.

Page transitions
- [x] Navigating between pages crossfades the content (200ms); header and
      footer stay still.
- [x] ~~Opening a career from search or quiz results morphs its title into
      the career page heading.~~ Dropped while building: the career page's
      `loading.tsx` skeleton makes one navigation several view transitions
      (results, then skeleton, then page), so the two titles are never in the
      same one. Morphing into the skeleton and back looked worse than the
      plain crossfade.
- [x] Browsers without View Transitions navigate normally (React skips the
      animation when the API is missing; not tried in such a browser).

Career page route line
- [x] A vertical route line under the title: This career (you are here),
      Colleges with this program, Money and experience, Your plan, each with a
      real link; terraced from 1024px; draws in once.
- [x] Screen readers hear each stop's position and state in words.

Everywhere
- [x] Zero CSP violations and zero console errors on home, careers search
      and a career page.
- [x] No layout shift from the hero (CLS under 0.1): 0 on the home page.
      Pages with a loading skeleton (career search, career, colleges,
      scholarships) score 0.12 to 0.29 because the footer moves when the
      content streams in; same scores with the crossfade removed, so it
      predates this work (see PROGRESS "Next up").
- [x] Every changed page checked against AVOID.md at 320, 390 and 1280px,
      and at 200% zoom.
- [x] `npm run check` passes, including a test for the tilt math.

## Data
None. No database changes, nothing stored. The tilt reads pointer position
only and keeps nothing.

## Edge cases and errors
- **Reduce motion:** no entrance, no tilt, no crossfade, no button movement;
  everything still works and looks finished.
- **No JavaScript:** radios and panels still work; no tilt.
- **Old browsers without View Transitions or `:has()`:** navigation works
  normally. Without `:has()`, all four panels show in order (the content is
  still complete).
- **Touch screens:** no hover tilt; tapping slabs works.
- **Tilted text hard to read, or 3D tap areas unreliable:** a plain list of
  labels becomes the selector and the slabs become decoration that shows the
  current step. Record the choice here when building. **Built (2026-10-04):
  the slabs are the selector.** Signs stay upright facing the viewer, so
  they read easily; every slab measured at least 44px tall at 320px. The
  scene's own plane caught all clicks at first (it sits in front of the
  lower slabs in 3D), fixed with `pointer-events: none` on the scene.

## Out of scope
Dark mode, tilting with the phone's motion sensor (iOS asks for permission
first), WebGL or a 3D library, illustrations, textured backgrounds,
animated slides between quiz pages.

## Result
Built 2026-10-04 in five commits on main (5949c4f docs, f830ad5 fonts and
keycaps, 900943b stepwell, 7b162c7 crossfade, d3e36a1 career path).
Verified on a production build with Playwright at 320, 390, 640 (200% zoom)
and 1280px: zero console errors or CSP violations on home, careers search,
a career page, colleges, scholarships and plan; no sideways scroll; slabs
chosen by click, arrow keys and with JavaScript off; tilt set through the
CSSOM and not attached under reduce motion; every animation duration 0
under reduce motion. `npm run check`: 189 tests pass. Dropped: the career
title morph (see above).

## Test plan
- Automated: `src/lib/tilt.test.ts` checks `tiltFromPointer` (0 at the
  center, plus or minus the maximum at the corners, clamped outside the box);
  `npm run check`.
- By hand in the browser (production build): home, careers search, a career
  page and the colleges page at 320, 390 and 1280px; keyboard through the
  slabs; reduce motion on; JavaScript off; console clear of CSP errors;
  layout shift measured with a `PerformanceObserver`.

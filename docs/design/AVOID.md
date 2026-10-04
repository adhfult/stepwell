# Stepwell design rules: what to never do, and what to always include

These are **hard rules** for all Stepwell UI and UI copy. They come from the
list of things that make a site look auto-generated ("vibe-coded"), plus
extra patterns found in current design guidance. `docs/design/DESIGN.md`
holds the chosen colors and fonts; this file says what's off-limits.

When reviewing any page, check it against every line below.

## Never use: color and surfaces
- Harsh gradients (any gradient used as decoration)
- Rainbow coloring
- Neon colors
- Basic pastel colors (flat, unchosen pastels)
- Purple and black as the color scheme
- Pure white (#FFFFFF) as the page background; use a chosen off-white or tinted neutral from DESIGN.md
- Liquid glass / glassmorphism (frosted, blurred translucent panels)
- Blurred or soft drop shadows (use borders, spacing, or tone changes for
  separation). The hard stone edge on buttons in DESIGN.md is the only shadow
- Radial orbs, glows, or blurry blobs behind content
- Dot grids or grid-paper backgrounds
- Also avoid: a warm cream background with a terracotta/clay accent, and a
  near-black background with one acid-green or vermilion accent (both are
  current "AI default" palettes)

## Never use: layout
- Three feature cards in a row
- Bento grids
- Three pricing tiers (Stepwell is free; no pricing section at all)
- A colored stripe down the left edge of cards or callouts
- A terminal/code window used as decoration
- Soft, uniform corner radius on everything; use one deliberate radius
  from DESIGN.md (small or none), varied by purpose, never "rounded-2xl everywhere"
- The same card with the same shadow repeated for every piece of content
- A mandatory "How it works" section with numbered steps (numbers only when
  the content really is a sequence)

## Never use: icons, type, and decoration
- Lucide icons (the default icon set of generated sites). Prefer no icon; if
  an icon truly helps, use a small custom SVG or one consistent, less common set
  recorded in DESIGN.md
- Sparkle icons (✨ or similar) to mean "AI" or "new"
- Emojis anywhere in the UI
- Checkmark bullets (✓ lists); use plain text or real structure
- Animated arrows, and "→" tacked onto links or buttons
- Inter, Geist, or Space Grotesk; choose typefaces with character in DESIGN.md
- ALL-CAPS tracked-out "eyebrow" labels above headings
- A monospace font for small labels or numbers as decoration
- Middle dots joining metadata ("Free · Fast · Private")
- Over-exaggerated italics to emphasize one word in a headline
- Highlighting one word of a headline in a different color

## Never use: motion
- Hover animations (lifting, scaling, sliding cards). Hover and focus may
  change color or underline instantly; the only movement is the 2px button
  rise in DESIGN.md
- Pulsing or pinging dots (`animate-ping`)
- Fade-and-slide-up on every section. Only the motion budget in DESIGN.md
  moves, and "reduce motion" switches all of it off

## Never use: copy
- Em dashes (—) in UI text. Use periods, commas, colons, or parentheses
- "It's not X, it's Y" and similar formula lines
- Vague hero lines ("Unlock your potential", "Supercharge your future")
- Schoolteacher or marketing tone; write like a helpful older student
- Fake testimonials, fake user counts, fake logos, fake reviews
- Stock photos of smiling students, AI-generated people, confetti

## Always include
- **Skeleton loaders** shaped like the real content for anything that loads
- **Empty states** that explain what goes here and what to do next
- **Error states** in plain language, with a way to recover
- **Real product demos**: real screenshots or a working example on the
  homepage, never mockups of features that don't exist
- **Terms of Service** and **Privacy Policy** pages, linked in the footer,
  in plain language a 13-year-old can follow
- **Sources** under any number from government data
- **Accessibility**: WCAG AA contrast, visible keyboard focus, labels on
  every form field, alt text on meaningful images, works at 200% zoom
- **Mobile first**: every page works at phone width
- **Specific copy**: say exactly what Stepwell does in the first sentence

## Before calling any UI work done
1. Screenshot or open the page at phone and desktop widths.
2. Go through this whole file line by line and fix any match.
3. Say which DESIGN.md tokens were used.

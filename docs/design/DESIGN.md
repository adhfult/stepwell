# Design system: Stepwell

**Status: chosen 2026-09-27.** Direction: **Water and Stone, with Wayfinding.**
This file is the source of truth for colors, type, spacing, shape and the
component patterns below. Every UI change uses only these tokens and patterns
and never anything in `docs/design/AVOID.md`. If a new token or pattern is
truly needed, add it here first (with a contrast check for any new color) and
say why.

Reference screenshots you like can go in `docs/design/references/`.

## The idea
A stepwell is a set of stone stairs leading down to water. Stepwell's path
(careers, then programs, then colleges, then a plan) is drawn as a route line
descending terraced steps; each stop is a landing a student can save. Water
and Stone gives the palette, the square shapes and the calm. Wayfinding gives
the legible body type, the "you are here" signal color, and direct,
scannable signage-style copy.

## Colors
Contrast is WCAG 2 contrast ratio, measured against `background` unless noted.
Text needs 4.5:1; borders and other UI parts need 3:1.

| Token | Value | Used for | Contrast |
|---|---|---|---|
| background | `#E8EEEC` | Page background (pale mineral; never pure white) | |
| surface | `#F3F6F5` | Panels, inputs, footer; set apart by tone instead of shadow | foreground on it 13.8:1 |
| foreground | `#132A2C` | Body text, headings, focus ring, hover state of buttons and links | 12.8:1 |
| muted | `#51615F` | Source lines, help text, secondary text | 5.5:1 (6.0:1 on surface) |
| primary | `#0B5D66` | Links, primary buttons, the route line, checkboxes | 6.4:1; surface-colored text on it 7.0:1 |
| accent | `#A8323E` | Needs attention: deadlines soon, errors, the delete button | 5.6:1; surface-colored text on it 6.1:1 |
| highlight | `#F2C12E` | Signal yellow: "you are here", "you qualify" | foreground on it 8.9:1 |
| border-strong | `#6E8380` | Form field and secondary button borders | 3.4:1 (3.7:1 on surface) |
| border-subtle | `#C5D1CE` | Dividers, panel edges, skeleton blocks | decorative only |

Rules:
- **highlight is fill only.** It is 1.4:1 against the page, so it always
  carries dark (`foreground`) text or a `foreground` outline. It never marks
  something by color alone.
- **accent always comes with words.** An error or deadline says what it is
  in text; color is never the only signal.
- **border-subtle never outlines a control.** Anything a student clicks or
  types into uses `border-strong` or a fill.
- Only these colors exist in Tailwind (the default palette is switched off in
  `globals.css`), so `bg-white`, `text-purple-500` and similar do not compile.
- Light theme only for now (see Open items).

## Typography
- Headings: **Bitter** (sturdy slab serif), weights 600 to 700.
- Body, labels, numbers, forms: **Atkinson Hyperlegible Next** (from the
  Braille Institute; letters like l, I and 1 are never confused), weights 400
  and 700. Used for every dollar amount and date.
- Both load once in `src/app/layout.tsx` through `next/font/google`, which
  self-hosts the files: students' browsers never contact Google. `globals.css`
  applies Atkinson to `body` and Bitter to `h1` to `h4` by default, so pages
  need no font classes (`font-heading` / `font-body` exist for exceptions).
- Scale (17px base, ratio 1.25):

| Class | Size | Line height | Use |
|---|---|---|---|
| `text-sm` | 14px | 1.55 | Source lines, help text, tags (minimum size) |
| `text-base` | 17px | 1.55 | Body, buttons, form fields |
| `text-lg` | 21px | 1.2 | Section headings, panel and list titles |
| `text-xl` | 27px | 1.2 | Page headings on phones, key numbers |
| `text-2xl` | 33px | 1.2 | Page headings from 640px |
| `text-3xl` | 42px | 1.2 | Page headings from 1024px |

- Page headings use `<PageTitle>` (`src/components/page.tsx`): 27px on
  phones, 33px from 640px, 42px from 1024px. Section headings inside a page
  are `text-lg`, so they never compete with the page title.

- Sentence case everywhere. No all-caps labels, no letter-spaced eyebrows.
- One `h1` per page; heading levels never skip (h2 after h1, h3 after h2).
- Body text lines stay under about 75 characters (the 672px reading width
  does this at 17px).

## Spacing and shape
- Spacing scale (4px steps): 4, 8, 12, 16, 24, 32, 48, 64, 96 px. In
  Tailwind: `1, 2, 3, 4, 6, 8, 12, 16, 24`. Use only these steps.
- Corner radius: **0** for panels, sections, tags and route stops (cut
  stone); **2px** (`rounded-control`) for inputs and buttons only. No other
  radii exist in Tailwind (the default radius scale is switched off).
- No shadows. Separation comes from `surface` vs `background`, borders and space.
- Tap targets are at least 44px tall and 44px wide.

## Layout
- Design at 320px wide first, then widen. Breakpoints are Tailwind's
  defaults: `sm` 640px, `md` 768px, `lg` 1024px.
- Side padding: 24px (`px-6`) on every page; 32px (`lg:px-8`) from 1024px.
- Content width: reading pages (career details, About the data, Terms,
  Privacy) at most 672px (`max-w-2xl`); short form pages (sign-up, sign-in,
  password) at most 448px (`max-w-md`); browsing pages (search results,
  college comparison, the plan) at most 1024px (`max-w-5xl`).
- Every page's content sits in `<Page>` (`src/components/page.tsx`, widths
  `reading`, `form`, `browse`), which sets the widths above and the top and
  bottom space: 32px on phones, 48px from 640px, 64px from 1024px.
- Vertical rhythm: 16px between paragraphs, 40 to 48px between sections.
- Phones are judged at 320 to 390px wide, not only "no sideways scrolling":
  a page should show its heading and the start of its content without
  clutter (added after the 2026-09-28 mobile pass).
- One column on phones. From 1024px a browsing page may add one side column
  (filters, or the route line), never more than two columns.

### Page frame
- **Skip link**: the first thing on every page is "Skip to main content",
  hidden until focused with the keyboard, jumping to the single `<main>`
  landmark (in `layout.tsx`; pages render inside it, never their own `<main>`).
- **Header** (on `background`, bottom `border-subtle` divider): the word
  "Stepwell" in Bitter bold `text-lg`, linking home, on the left. Main links
  on the right: Careers, Colleges, Scholarships, Opportunities, My plan. On
  phones these collapse behind a text button labeled "Menu" (no hamburger
  icon). The signed-in student's account link is last. Until those pages
  exist, phones show only "Sign in" (or "Account"), so the header stays on
  one line at 320px; "Create account" joins from 640px (the sign-in page
  links to it).
- **Footer** (on `surface`, top `border-subtle` divider): About the data,
  Terms, Privacy, Contact, and one attribution line naming the government
  sources. Required before launch; links are added only when their pages exist.

## Components

### Links
- `primary` text, always underlined (color alone does not mark a link),
  underline 1px, offset 0.15em.
- Hover: `foreground` text, 2px underline, instantly (no transition).
- Link text says where it goes: "See colleges with this program", never
  "Learn more" or "Click here", and never a "→" added to the end.
- Links to other sites say so in the text: "Apply on the sponsor's site".
  They open in the same tab.
- Base styles for links live in `globals.css`; components only override
  them for the header wordmark and navigation. Header navigation links are
  not underlined at rest (everything there is a link, so underlines only add
  noise); they underline on hover and keyboard focus.
- Long email addresses use `break-words`, so they wrap at a hyphen or move
  to the next line instead of breaking mid-word.

### Buttons
All buttons: at least 44px tall, `px-4`, `rounded-control`, `text-base`
bold, sentence case, a verb that names the action ("Save career", not
"Submit"). No icons by default.

| Kind | At rest | Hover | Use |
|---|---|---|---|
| Primary | `primary` fill, `surface` text (7.0:1) | `foreground` fill, `surface` text (13.8:1) | The one main action on a view |
| Secondary | `surface` fill, 1px `border-strong`, `foreground` text | 1px `foreground` border | Other actions |
| Quiet | No fill, looks like a link | Same as links | Cancel, Back, low-stakes actions |
| Delete | `accent` fill, `surface` text (6.1:1) | `foreground` fill | Deleting data; always followed by a confirmation step |

- Focus: the global 3px `foreground` outline, 2px away from the button.
- Disabled: `surface` fill, 1px `border-subtle`, `muted` text. Prefer
  leaving a button enabled and explaining the problem after it is pressed.
- Working: the label changes ("Saving"), the button keeps its width and
  gets `aria-busy="true"`. No spinner (see motion).

### Form fields
- Label above the field, always visible, `text-base` bold. Placeholder text
  is never the label.
- Fields are required unless the label ends with "(optional)".
- Help text sits between label and field, `text-sm muted`, linked with
  `aria-describedby`.
- Inputs and selects: at least 44px tall, `text-base` (17px; anything
  under 16px makes iPhones zoom in), `surface` fill, 1px `border-strong`,
  `rounded-control`, `px-3`.
- Checkboxes and radio buttons: the browser's own controls colored with
  `primary` (`accent-color` in `globals.css`), 24px, with the whole label
  clickable.
- Errors: the field gets a 2px `accent` border and `aria-invalid="true"`;
  the message sits below it in `accent` text and starts with "Error:". When
  a form is submitted with problems, a panel at the top (2px `accent`
  border, heading "There’s a problem" in bold body text, not a big serif
  heading) lists each one as a link to its field and receives focus.
- A form's intro sentence and its footer links ("Already have an account?")
  belong to the form: when a result panel replaces the form, they go too,
  so only the result is on screen.
- Result panels take focus only when they replace a form after an action,
  never on page load. Panels that take focus programmatically draw no
  focus outline (they aren't controls; the outline doubled their border).
- Sensitive questions (scholarship eligibility): each explains in one
  sentence why it is asked and offers "Prefer not to say" as a real choice.

### Route line (the signature component)
Shows a student's path: career, program, college, plan.
- An ordered list (`<ol>`) running top to bottom on every screen size, like
  steps going down. The line is 4px wide, in `primary`.
- Stops are 16px squares (stone, not dots):
  - not chosen yet: `surface` fill, 2px `primary` border;
  - chosen or saved: `primary` fill;
  - you are here: `highlight` fill, 2px `foreground` border, with the words
    "You are here" beside it.
- Each stop has a label (Bitter `text-lg`), one line saying what is chosen
  (or what to choose), and one link.
- Terracing: from 1024px, each stop's text block is indented 24px more
  than the one above (at most 72px), so the path visibly steps down. On
  phones there is no indent.
- Screen readers hear each stop's state in words: "Step 2 of 4, Program:
  saved, Nursing (RN)".
- This is the one place motion is allowed (see Icons and motion).

### Panels and lists
- Plain sections on `background` are the default. A panel (`surface` fill,
  1px `border-subtle`, radius 0, padding 16px, 24px from 1024px) groups one
  thing: a college summary, a scholarship, a form.
- Search results and saved items are **lists with dividers**, not grids of
  cards: each row has a title link (Bitter `text-lg`), one line of key facts,
  and at most two tags.
- Never a row of identical cards, never a bento grid (AVOID.md).

### Tags
Short status labels: `text-sm` bold, `px-2 py-1`, radius 0, sentence case,
always words.

| Tag | Style | Contrast |
|---|---|---|
| You qualify | `highlight` fill, `foreground` text | 8.9:1 |
| You might qualify | `surface` fill, 1px `border-strong`, `foreground` text | 13.8:1 |
| Closes in 5 days (14 days or fewer) | `accent` text, no fill | 5.6:1 |
| Saved | `primary` text, no fill | 6.4:1 |

## Showing data
### Numbers and money
- Whole dollars with commas and a unit: "$48,200 a year". Ranges: "$35,000
  to $61,000". Never "$48.2K".
- Percentages as whole numbers: "Graduation rate: 64%".
- Missing or suppressed values show "Not reported" in `muted` text: never 0,
  never a lone dash.
- A key number: label in `text-sm muted` above, value in `text-xl` bold
  below ("Median pay" / "$81,220 a year").
- Comparison tables are real tables (`<th scope>`), numbers right-aligned
  with `tabular-nums` so digits line up.

### Dates and deadlines
- Short form "Mar 1, 2027"; in sentences "March 1, 2027". No times (sponsors
  publish dates); add "Submit at least a day early" near deadlines.
- 14 days or fewer: "Closes in 5 days (Mar 1)" in `accent`.
- Passed: "Closed Mar 1" in `muted`. Repeats yearly: "Usually due around
  March 1". Unknown: "Check the sponsor's page for the deadline".

### Sources
- Every group of numbers from government data has a source line directly
  under it, `text-sm muted`: "Source: U.S. Department of Labor, O\*NET 30.0.
  Retrieved Sept 2026." (O\*NET requires attribution.)
- Every listing says who offers it and where it came from: "Offered by
  (sponsor). Listed by (source), checked (date)." with a link to the original.
- The "About the data" page lists every source with its attribution text.

## States
- **Loading:** skeletons shaped like the content they replace: `border-subtle`
  blocks at the height of the text lines, in the same layout. No shimmer or
  pulse. The region gets `aria-busy="true"` and a visually hidden message
  ("Loading careers").
- **Empty:** a short heading saying what is empty, one sentence on what
  goes here, and one action. Example: "No saved careers yet" / "Save careers
  you want to compare and they'll show up here." / link "Browse careers".
  No illustrations of people.
- **Error:** a panel with a 2px `accent` border on all four sides (never a
  left stripe): a heading saying what happened in plain words ("We couldn't
  load scholarships"), one sentence on what to try, and a "Try again"
  button. Never error codes or technical details.
- **Not found:** "We couldn't find that page", with links to the home page
  and to career search.

## Writing
- Voice: a helpful older student. Address the reader as "you". Short
  sentences; aim for words a 13-year-old knows.
- Sentence case for headings, buttons, tags and links.
- Numerals for numbers ("5 careers").
- No em dashes (use periods, commas, colons, parentheses), no "It's not X,
  it's Y", no exclamation marks, no vague lines ("Unlock your potential").
- Terms and Privacy are written in the same plain voice.

## Images
- Only real screenshots of Stepwell, shown flat with a 1px `border-subtle`
  edge: no device frames, no tilted 3D mockups. Alt text says what the
  screenshot shows.
- No stock photos, no AI-generated people, no confetti.

## Icons and motion
- No icon library. A small custom SVG set only (route stops, step markers),
  drawn in `foreground` or `primary`, always next to words.
- One motion moment in the whole product: the route line draws in once on a
  career's path page. Switched off under "reduce motion". Hover and focus
  change color or underline instantly; nothing moves.
- Focus: a visible 3px `foreground` outline on every interactive element.

## Principles
Stepwell should feel calm and grounded: a place to think, not an ad to react
to. Copy is plain and specific, like a helpful older student giving
directions. Anything with a deadline stands out; everything else stays quiet.

## What `globals.css` already implements
Tokens (colors, type scale, spacing, radius), default fonts for `body` and
`h1` to `h4`, the focus outline, link styles, and `accent-color` for
checkboxes and radio buttons. Everything else above is applied per component.

## Open items
- **Dark mode is not designed yet.** The site is light only
  (`color-scheme: light`) until a dark palette is chosen and contrast-checked.
- Terms and Privacy footer links are required by AVOID.md and do not exist
  yet (planned as the legal pages spec).
- The route line's draw-in motion needs a prototype before it is final.

# Product brief: Stepwell

## In one sentence
Stepwell helps students see where a career leads: what the work is, what it
pays, what education it takes, and which programs and colleges get them there,
using official U.S. government data.

## Who it's for
- **Primary:** high school students (13–18) deciding what to study.
- **Also:** college students choosing or changing majors, and adults
  considering further education or a career change.
- What they're trying to get done: turn "I have no idea what I want to do"
  into a short list of careers, and a realistic path to each.

## The problem
Career sites and college sites are separate. Students bounce between five
tools, none of which connects "what would I enjoy" to "what does it pay" to
"which program at which college leads there, and what does that cost and earn".
Much of what exists is ad-supported or sells student leads to colleges.

## Our angle (the wedge)
One connected path, built on free official data:
**interests → careers → programs → colleges → a saved plan.**

## First version (MVP): what it does
1. **Accounts & profile:** sign up (13+), set education stage, state, grad year.
2. **Career Explorer:** search careers and view each one: what the work is,
   typical tasks and skills, typical education, pay and outlook, with sources.
3. **Interest quiz:** O*NET Interest Profiler results suggest matching careers.
4. **Career → programs → colleges:** for a career, show related programs of
   study and colleges offering them, with cost, graduation rate, and earnings
   of graduates (College Scorecard).
5. **Saved plan:** save careers, colleges, scholarships and programs, laid out
   as a year-by-year plan with deadlines.
6. **AP and academics suggestions:** which AP classes help for a career
   (from O*NET knowledge ratings).
7. **Scholarships:** from CareerOneStop and allowlisted sites, matched to the
   student (optional eligibility answers, two-step opt-in).
8. **Internships and programs:** USAJOBS Pathways plus allowlisted internship
   and summer-program sites.

Design and build order: `docs/specs/v1-expansion-draft.md` (approved 2026-09-28).

## Not doing (for now)
- AI advisor chat until real students have used the app (roadmap item 7,
  decision 0016). AI text written ahead of time from our data, and reviewed,
  is allowed now (e.g. career summaries).
- Application tracking, résumés, counselor or parent accounts.
- Native mobile apps (the website works on phones).
- Anything outside the U.S.
- Ads, selling data, or sharing data with colleges. Never.

## How we'll know it works
- 10 real students in the target age range use it without help.
- At least half save a career and a college on their first visit.
- 5 of them come back within two weeks.
- At least half find one scholarship they qualify for whose deadline hasn't passed.

## Open questions
- Which state(s) to focus on first for college results?
- Should the interest quiz be required or optional at sign-up?

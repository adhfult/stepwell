# Spec: AP and academics suggestions

- Status: approved (owner's go-ahead in chat, 2026-09-28: "Continue.")
- Build step 6 of the v1 expansion (`docs/specs/v1-expansion-draft.md`,
  Sections 1 and 2.5). Builds on `docs/specs/career-explorer.md`.

## Goal
On each career page, tell a high school student which AP classes build the
knowledge that career uses, and why, using O*NET's knowledge ratings.

## User story
As a high school student choosing classes, I want to know which AP classes
help for a career I'm interested in, so my schedule points somewhere.

## Checked 2026-09-28
- O*NET 31.0 `knowledge.csv`: 33 knowledge areas, each rated for importance
  (1 to 5, scale "IM") for 910 careers. At a cutoff of 3.5 a career has a
  median of 4 important areas; 61 careers have none.
- College Board's AP course index lists 42 courses in 8 groups, including
  AP Precalculus, AP African American Studies and the "AP Career Kickstart"
  courses AP Business with Personal Finance and AP Cybersecurity.

## Decisions made without asking (push back on any)
1. **Cutoff 3.5 of 5**, as the design proposed: "important" knowledge.
   Careers with no area that high get no AP section (rather than weak
   suggestions).
2. **At most 6 courses**, most important knowledge first, each with the
   knowledge area it comes from ("Builds: Psychology").
3. **The mapping is Stepwell's own** (below), kept in the migration so every
   change is reviewed; the source line says so. Areas with no fitting AP
   course map to nothing: Administrative, Customer and Personal Service,
   Production and Processing, Transportation.
4. **Shown to everyone**, with wording aimed at high school ("If your school
   offers them"), since a career page doesn't know who's reading.

## The mapping (knowledge area to AP courses)
| Knowledge area | AP courses |
|---|---|
| Administration and Management | Business with Personal Finance, Microeconomics |
| Economics and Accounting | Macroeconomics, Microeconomics, Business with Personal Finance |
| Sales and Marketing | Business with Personal Finance, Microeconomics |
| Personnel and Human Resources | Psychology |
| Food Production | Environmental Science, Biology |
| Computers and Electronics | Computer Science A, Computer Science Principles, Cybersecurity |
| Engineering and Technology | Physics 1, Physics C: Mechanics, Calculus AB |
| Design | 2-D Art and Design, 3-D Art and Design, Drawing |
| Building and Construction | Physics 1 |
| Mechanical | Physics 1, Physics C: Mechanics |
| Mathematics | Precalculus, Calculus AB, Calculus BC, Statistics |
| Physics | Physics 1, Physics 2, Physics C: Mechanics, Physics C: Electricity and Magnetism |
| Chemistry | Chemistry |
| Biology | Biology, Environmental Science |
| Psychology | Psychology |
| Sociology and Anthropology | Human Geography, African American Studies |
| Geography | Human Geography, Environmental Science |
| Medicine and Dentistry | Biology, Chemistry |
| Therapy and Counseling | Psychology, Biology |
| Education and Training | Psychology |
| English Language | English Language and Composition, English Literature and Composition |
| Foreign Language | the 8 world language courses |
| Fine Arts | Art History, Music Theory, Drawing, 2-D Art and Design |
| History and Archeology | United States History, World History: Modern, European History, African American Studies |
| Philosophy and Theology | Seminar |
| Public Safety and Security | United States Government and Politics |
| Law and Government | United States Government and Politics, Comparative Government and Politics |
| Telecommunications | Computer Science Principles, Cybersecurity |
| Communications and Media | English Language and Composition, Seminar |

## Acceptance criteria
- [ ] `knowledge_areas` (33, O*NET ids and names) and `ap_courses` (42,
      with their College Board group) hand-entered in the migration;
      `knowledge_ap_map` as above. Public read.
- [ ] `occupation_knowledge` (career, area, importance) loaded by the O*NET
      import from `knowledge.csv` (scale IM), with a minimum row count like
      the other files; unknown area ids are skipped.
- [ ] `public.ap_courses_for_career(onet_code)`: up to 6 courses from areas
      rated 3.5 or more, highest importance first, each course once, with
      the area it came from.
- [ ] Career page section "Classes that help": the courses as a list with
      "Builds: <area>", a sentence that regular classes in the same subjects
      help too, and a source line ("Based on O*NET knowledge ratings.
      Stepwell matches them to AP courses itself. AP is a trademark of
      College Board."). Left out when there are none.
- [ ] Works at 320px; AVOID.md check; `npm run check` and `npm run test:db` pass.

## Out of scope
Which high school offers which AP classes (would need the student's school;
SECURITY.md), non-AP course catalogs, IB and dual enrollment, the planner
(step 9).

## Build steps
| # | Goal | Check |
|---|---|---|
| 1 | Migration and pgTAP | Mapping rows, function order, refusals |
| 2 | Knowledge in the O*NET adapter; `--force` import | Unit test on the fixture; counts |
| 3 | Career page section; docs | Chrome at 320px and 1280px |

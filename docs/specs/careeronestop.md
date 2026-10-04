# Spec: CareerOneStop youth programs, licenses and certifications

- Status: approved by the owner ("we can do all three", 2026-10-04); built

## Goal
Use the owner's CareerOneStop Web API token for three things students need
after choosing a career: youth job programs near them, the license their
state requires, and the core certifications for the job. Training programs
were the fourth idea, but the token gets 401 on the training endpoint.

## User story
As a student, I want to see what a career needs beyond school (a license in
my state, the main certifications) and find a youth program near me, so I
know the real next steps.

## Acceptance criteria
- [x] Three sources, cached by the import job, never fetched per page view:
  - `cos_youth_programs` (monthly): `GET /v1/youthprogramfinder/{userId}`,
    one call, kept only where `ProgramType` is "Youth Service Provider"
    (2,519 of 4,077; the rest are general adult job centers). Table
    `youth_programs`: id, name, city, state, zip, website (https only,
    else null).
  - `cos_licenses` (every 3 months): `GET /v1/license/{userId}/{onet}/0/0/0/{start}/50`
    per career (location 0 = every state; pages of 50). Table
    `career_licenses`: onet_code, license id, title, state code, agency
    name, agency website (https only).
  - `cos_certifications` (every 3 months):
    `GET /v1/certificationfinder/{userId}/{onet}/0/0/Core/0/0/0/0/0/0/50`
    per career, Core certifications only (for nurses: 10 core of 145).
    Table `career_certifications`: onet_code, cert id, name, organization,
    website (https only).
- [x] Token as a Bearer header, the user ID in the path; never logged.
      Requests half a second apart (no documented limit; no robots.txt).
- [x] `/programs` gains "Youth job programs" for the chosen state: name,
      city, and a link to the program's site; 15 first, the rest fold away.
- [x] Career pages gain "Licenses" (the profile's state, or "Choose your
      state" when unknown, with the number of states that license it) and
      "Certifications" (core ones, linked).
- [x] Every page showing this data says: "Source: CareerOneStop, sponsored
      by the U.S. Department of Labor, Employment and Training
      Administration (DOLETA), and the Minnesota Department of Employment
      and Economic Development (DEED)." (their license requires both).
- [x] Public read tables with RLS; merges executable by `importer` only;
      pgTAP; unit tests for the parsers; 320px check; About the data lists
      the sources.

## Out of scope
Training programs (no access), contacts or staff emails from the youth
list (not needed, personal data), license requirements beyond the agency.

## Result (2026-10-04)
- Local import: 2,519 youth programs, 3,371 core certifications, and
  every state's licenses for each career (about 26,000 rows).
- Live data needed: license IDs with &, ( ) and dots (Colorado, New
  Jersey); "Federal Agencies" licenses left out (not a state); paging on
  the raw list (dropping federal entries had cut paging short).
- About half of license agency links are http, so they show as names only.
- Checked at 320px signed out (count of states, "Add your state") and
  signed in with Ohio (Registered Nurse, Ohio Board of Nursing); youth
  programs for Ohio on /programs.

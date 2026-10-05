# College Athlete Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colleges by sport and level from EADA, a sport/team/level filter and a Sports section on college pages, and `/athletes` with association rules, a core-course checker on saved `/gpa` classes, and a grade-by-grade timeline that can be added to the plan.

**Architecture:** A monthly import job (`eada`) stages one record per college (athletics code + sports with men's/women's counts) and a security-definer merge writes `college_sports` and `institutions.athletics_code`. Class tags (`core`, `year`) are two optional keys on the existing `academic_records.courses` jsonb. Rules and timeline are a hand-written TypeScript data file with pure check functions; the page and server actions reuse the existing GPA, plan and profile data layers.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres, RLS, pgTAP), zod, Vitest, `read-excel-file`, `fflate` (already installed via read-excel-file; promoted to a direct dependency).

**Spec:** `docs/specs/ncaa-athlete-path.md` (approved), decision `docs/decisions/0014-athlete-path.md`.

## Global Constraints

- Every database table gets RLS in the same migration; `college_sports` is public read-only, written only by the security-definer merge.
- Validate all server input with zod; user id only from the session (`auth.uid()` / `getCurrentUser()`), never the browser.
- Only rules confirmed on an official page are scored; each rule and step stores its source URL and checked-on date.
- Every result says "Estimate, not an official certification" with a link to the body that decides.
- Source line under displayed numbers: "Source: U.S. Department of Education, Equity in Athletics Data Analysis (EADA), <season>".
- UI copy: no em dashes, no emojis, no checkmark bullets, no Lucide icons, no hover animations; follow `docs/design/DESIGN.md` and `docs/design/AVOID.md`. Skeleton `loading.tsx` and `error.tsx` for new routes.
- Source is hand-wrapped at about 120 columns. Never run Prettier.
- Never write the env file's name in a shell command (a hook blocks it). Stop `next start` by PID from `ss -ltnp`, never `pkill`.
- pgTAP: a literal `%` inside a `format()` string is `%%`.
- Small commits on `main`; do not push.

## Review Focus

1. A student who tagged classes on `/athletes` then edits and saves on `/gpa`: tags must survive (zod strips unknown keys; the editor rebuilds courses). Test in Task 4.
2. EADA reports both a combined sport and its split forms for one college (code 3 with 23/24/25; 18 with 19 and 4): exactly one row per (unitid, slug), larger count wins. Test in Task 3.
3. Coed-only teams (239 rows have neither `PARTIC_MEN` nor `PARTIC_WOMEN`, 325 have coed counts): the team must not vanish. Coed counts fill men/women when the single-sex count is missing. Test in Task 3.
4. Tags saved against a class list that changed in another tab (count differs): refuse with a plain message instead of tagging the wrong classes. Test in Task 7 (action unit is thin; covered by the pgTAP check + by-hand step).
5. Timeline added twice, or with no graduation year: no duplicates; a plain request to set the graduation year. Test in Task 5 (`timelinePlanItems`) and by hand in Task 8.

---

## File map

- `supabase/migrations/<ts>_athletics.sql`: source row, staged kind, `institutions.athletics_code`, `college_sports`, merge, widened courses check, `search_colleges` with sport/team/level.
- `supabase/tests/athletics_test.sql`: pgTAP for all of the above.
- `src/lib/athletes/sports.ts`: sport slugs and labels, EADA name mapping, level groups and names. Shared by job, directory and pages.
- `src/jobs/sources/eada.ts` (+ `.test.ts`): fetch newest file, unzip, parse both sheets into staged records.
- `src/lib/athletes/rules.ts` (+ `.test.ts`): associations' rules, timeline steps, `checkCore`, `checkNaia`, `timelinePlanItems`.
- `src/lib/gpa/record.ts`, `src/app/gpa/gpa-tool.tsx`: optional `core`/`year` on classes, carried through.
- `src/lib/colleges/{labels,data}.ts`, `src/app/colleges/page.tsx`, `src/app/colleges/[unitid]/page.tsx`: filters and Sports section.
- `src/app/athletes/{page,loading,error,actions,core-checker}.tsx|ts`: the page and its two actions.
- Docs: Privacy page, `docs/DATA_SOURCES.md`, `src/lib/sources/list.ts`, `docs/PROGRESS.md`, spec ticks.

---

### Task 1: Confirm the rules and timeline facts

Research only; no code. Output is an appendix in the spec that Task 5 copies into `rules.ts`.

**Files:**
- Modify: `docs/specs/ncaa-athlete-path.md` (append "## Rules checked")

- [ ] **Step 1: Read the official sources** with WebFetch (PDFs: download with curl to the scratchpad and read them):
  - NCAA 2026-27 Guide for the College-Bound Student-Athlete: `http://fs.ncaa.org/Docs/eligibility_center/Student_Resources/CBSA.pdf`
  - `https://www.ncaa.org/eligibility-center/initial-eligibility-requirements/division-i/` and `.../division-ii/`
  - NAIA: `https://www.naia.org/student-athletes/prospective/high-school-students/` and `https://copforum.naia.org/21-b-10-initial-eligibility/`
  - NJCAA eligibility (njcaa.org; bylaws PDF if the page is empty) and CCCAA constitution (cccaasports.org).
- [ ] **Step 2: Answer each question with a quote and URL, or mark NOT CONFIRMED:**
  1. NCAA core GPA point scale (A=4, B=3, C=2, D=1? plus/minus used or not? honors weighting only if the high school weights?).
  2. DI: 16 core by category, 10/7 wording, min core GPA 2.3. DII: 16 by category, min 2.2.
  3. NAIA: 2.3 GPA alone, else two of (2.0 GPA, top half of class, ACT 18 / SAT 970). Still current for 2027 graduates?
  4. NJCAA and CCCAA academic entry requirement for a first-year student.
  5. Timeline facts: when to make a Profile Page / certification account; registration needed before an official visit; final transcript and proof of graduation sent to the Eligibility Center; NAIA registration; written offers of athletics aid replaced the NLI (DI).
- [ ] **Step 3: Append the answers** to the spec under `## Rules checked (2026-10-04)` as one bullet per fact: fact, quote, URL, date.
- [ ] **Step 4: Commit**

```bash
git add docs/specs/ncaa-athlete-path.md
git commit -m "docs: athlete path rules checked against official pages"
```

---

### Task 2: Database: sports table, athletics level, class tags, filters

**Files:**
- Create: `supabase/migrations/<ts>_athletics.sql` (make it with `npx supabase migration new athletics`)
- Create: `supabase/tests/athletics_test.sql`
- Modify: `src/lib/database.types.ts` (regenerated)

**Interfaces:**
- Produces: table `public.college_sports(unitid int, sport text, men smallint|null, women smallint|null)`; column `institutions.athletics_code smallint|null`; staged kind `college_athletics` with payload `{unitid:number, code:number, sports:{sport:string, men:number|null, women:number|null}[]}`; function `ingest.merge_college_athletics(bigint)`; `search_colleges` gains `p_sport text, p_team text ('men'|'women'), p_level text ('d1'|'d2'|'d3'|'naia'|'juco'|'other')`; course objects may carry `core` in ('english','math','science','social','other') and `year` in 9..12.

- [ ] **Step 1: Write the failing pgTAP test** `supabase/tests/athletics_test.sql`:

```sql
-- Tests for the college athlete path (spec ncaa-athlete-path.md): the EADA
-- merge, public read-only college_sports, class tags, and sport filters.
-- Run with: npm run test:db.

begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

grant usage on schema extensions to importer;

delete from public.saved_items;
delete from public.institutions;
delete from ingest.import_runs where source_id = 'eada';
insert into public.institutions (unitid, name, retrieved_at) values
  (1, 'Coastal College', now()), (2, 'Mountain University', now()), (3, 'Valley Junior College', now());

set local role importer;
create temporary table t_run on commit drop as select * from ingest.start_run('eada');
select lives_ok(
  format($$ select ingest.stage_records(%s, '[
    {"kind":"college_athletics","source_record_id":"1","status":"valid","payload":
      {"unitid":1,"code":4,"sports":[{"sport":"soccer","men":null,"women":28},{"sport":"track","men":40,"women":38}]}},
    {"kind":"college_athletics","source_record_id":"2","status":"valid","payload":
      {"unitid":2,"code":1,"sports":[{"sport":"soccer","men":30,"women":null}]}},
    {"kind":"college_athletics","source_record_id":"99","status":"valid","payload":
      {"unitid":99,"code":12,"sports":[{"sport":"golf","men":8,"women":null}]}}
  ]'::jsonb) $$, (select run_id from t_run)),
  'importer stages EADA colleges'
);
select results_eq(
  format($$ select * from ingest.merge_college_athletics(%s) $$, (select run_id from t_run)),
  $$ values (3, 0, 0) $$,
  'the merge adds three teams and skips a college not in Scorecard'
);
reset role;
select is((select athletics_code from public.institutions where unitid = 1), 4::smallint, 'the athletics level is stored');
select is((select athletics_code from public.institutions where unitid = 3), null::smallint, 'a college not in EADA has no level');
select is((select women from public.college_sports where unitid = 1 and sport = 'soccer'), 28::smallint, 'roster sizes are stored');

set local role anon;
select is((select count(*)::int from public.college_sports), 3, 'anyone can read college sports');
select throws_ok($$ insert into public.college_sports (unitid, sport, men) values (3, 'golf', 5) $$, '42501', null,
  'anon cannot write college sports');
select is((select count(*)::int from public.search_colleges(p_sport => 'soccer')), 2, 'sport filter');
select is((select name from public.search_colleges(p_sport => 'soccer', p_team => 'women')), 'Coastal College',
  'team filter');
select is((select name from public.search_colleges(p_level => 'd1')), 'Mountain University', 'level filter');
select throws_ok($$ select * from public.search_colleges(p_level => 'd4') $$, 'P0001', null, 'unknown level refused');
reset role;

select ok(public.academic_courses_valid(
  '[{"name":"English 9","type":"regular","grade":"A","credits":1,"core":"english","year":9}]'), 'tags are accepted');
select ok(not public.academic_courses_valid(
  '[{"name":"Gym","type":"regular","grade":"A","credits":1,"core":"gym"}]'), 'an unknown core area is refused');
select ok(not public.academic_courses_valid(
  '[{"name":"Math","type":"regular","grade":"A","credits":1,"year":8}]'), 'a year outside 9 to 12 is refused');

select * from finish();
rollback;
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm run test:db` (local Supabase must be running: `npm run db:start`)
Expected: FAIL (`ingest.start_run('eada')` refuses: unknown source).

- [ ] **Step 3: Write the migration** (`npx supabase migration new athletics`, then fill it):

```sql
-- College athlete path (spec ncaa-athlete-path.md, decision 0014): sports by
-- college and athletics level from EADA, class tags for the eligibility
-- checker, and sport, team and level filters on search_colleges().

-- EADA is a U.S. government work (public domain, 17 U.S.C. 105).
insert into public.sources
  (id, name, kind, homepage, terms_url, terms_checked_at, allowed, refresh_interval, attribution)
values (
  'eada', 'Equity in Athletics Data Analysis (EADA)', 'dataset', 'https://ope.ed.gov/athletics/',
  'https://ope.ed.gov/athletics/', '2026-10-04', true, interval '1 month',
  'Source: U.S. Department of Education, Equity in Athletics Data Analysis (EADA).'
);

alter table ingest.staged_records
  drop constraint staged_records_kind_valid,
  add constraint staged_records_kind_valid check (
    kind in ('occupation', 'occupation_outlook', 'interest_question', 'occupation_program', 'institution',
             'scholarship', 'opportunity', 'student_program', 'youth_program', 'career_license',
             'career_certification', 'college_athletics')
  );

-- EADA's classification code (1 NCAA I-FBS ... 20 USCAA; src/lib/athletes/sports.ts names them).
alter table public.institutions
  add column athletics_code smallint constraint institutions_athletics_code_valid check (athletics_code between 1 and 99);

-- One row per college and sport; men / women are participant counts, null = no team.
create table public.college_sports (
  unitid integer not null references public.institutions (unitid) on delete cascade,
  sport text not null constraint college_sports_sport_valid check (sport ~ '^[a-z][a-z-]{1,29}$'),
  men smallint constraint college_sports_men_valid check (men between 0 and 2000),
  women smallint constraint college_sports_women_valid check (women between 0 and 2000),
  primary key (unitid, sport),
  constraint college_sports_has_team check (men is not null or women is not null)
);
create index college_sports_by_sport on public.college_sports (sport, unitid);

alter table public.college_sports enable row level security;
create policy "Anyone can read college sports"
  on public.college_sports for select to anon, authenticated using (true);
revoke all on table public.college_sports from anon, authenticated;
grant select on table public.college_sports to anon, authenticated;

-- Colleges not in Scorecard are skipped; colleges no longer in EADA lose their level and teams.
create function ingest.merge_college_athletics(p_run_id bigint)
returns table (added integer, changed integer, removed integer)
language plpgsql security definer set search_path = ''
as $$
declare v_added integer; v_changed integer; v_removed integer;
begin
  if not exists (select from ingest.import_runs r where r.id = p_run_id and r.status = 'running' and r.source_id = 'eada') then
    raise exception 'Run % is not a running EADA run', p_run_id;
  end if;
  create temporary table pg_temp.incoming on commit drop as
  select x.unitid, x.code, x.sports from ingest.staged_records s,
       jsonb_to_record(s.payload) as x(unitid integer, code smallint, sports jsonb)
  where s.run_id = p_run_id and s.kind = 'college_athletics' and s.status = 'valid'
    and exists (select from public.institutions i where i.unitid = x.unitid);
  if not exists (select from pg_temp.incoming) then raise exception 'Refusing to merge zero colleges'; end if;

  create temporary table pg_temp.incoming_sports on commit drop as
  select i.unitid, y.sport, y.men, y.women
  from pg_temp.incoming i, jsonb_to_recordset(i.sports) as y(sport text, men smallint, women smallint);

  select count(*) into v_added from pg_temp.incoming_sports n
  where not exists (select from public.college_sports t where (t.unitid, t.sport) = (n.unitid, n.sport));
  select count(*) into v_changed from pg_temp.incoming_sports n
  join public.college_sports t on (t.unitid, t.sport) = (n.unitid, n.sport)
  where (t.men, t.women) is distinct from (n.men, n.women);
  delete from public.college_sports t
  where not exists (select from pg_temp.incoming_sports n where (n.unitid, n.sport) = (t.unitid, t.sport));
  get diagnostics v_removed = row_count;
  insert into public.college_sports (unitid, sport, men, women)
  select unitid, sport, men, women from pg_temp.incoming_sports
  on conflict (unitid, sport) do update set men = excluded.men, women = excluded.women;

  update public.institutions c set athletics_code = i.code
  from pg_temp.incoming i where c.unitid = i.unitid and c.athletics_code is distinct from i.code;
  update public.institutions c set athletics_code = null
  where c.athletics_code is not null and not exists (select from pg_temp.incoming i where i.unitid = c.unitid);

  drop table pg_temp.incoming_sports;
  drop table pg_temp.incoming;
  return query select v_added, v_changed, v_removed;
end;
$$;

revoke execute on function ingest.merge_college_athletics(bigint) from public, anon, authenticated, service_role;
grant execute on function ingest.merge_college_athletics(bigint) to importer;

-- Class tags for the eligibility checker (decision 0014): optional core area and grade taken.
create or replace function public.academic_courses_valid(p_courses jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_courses) = 'array'
     and jsonb_array_length(p_courses) <= 80
     and not exists (
       select from jsonb_array_elements(p_courses) e
       where jsonb_typeof(e) <> 'object'
          or not (array['credits', 'grade', 'name', 'type'] <@ array(select jsonb_object_keys(e)))
          or not (array(select jsonb_object_keys(e)) <@ array['core', 'credits', 'grade', 'name', 'type', 'year'])
          or jsonb_typeof(e -> 'name') <> 'string'
          or char_length(e ->> 'name') > 80
          or jsonb_typeof(e -> 'type') <> 'string'
          or e ->> 'type' not in ('regular', 'honors', 'ap', 'ib', 'dual')
          or (jsonb_typeof(e -> 'grade') <> 'null'
              and (jsonb_typeof(e -> 'grade') <> 'string'
                   or e ->> 'grade' not in ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')))
          or jsonb_typeof(e -> 'credits') <> 'number'
          or (e ->> 'credits')::numeric not between 0.5 and 5
          or (e ->> 'credits')::numeric % 0.5 <> 0
          or (e ? 'core' and (jsonb_typeof(e -> 'core') <> 'string'
                              or e ->> 'core' not in ('english', 'math', 'science', 'social', 'other')))
          or (e ? 'year' and (jsonb_typeof(e -> 'year') <> 'number' or e ->> 'year' not in ('9', '10', '11', '12')))
     )
$$;
```

Then the search function. A different argument list makes an overload, which PostgREST can't choose between, so drop the old one first:

```sql
drop function public.search_colleges(
  text, text, text, text, text, integer, integer, text, boolean, text, boolean, text, text, integer
);
```

Then paste the whole `create function public.search_colleges(...)` from
`supabase/migrations/20261004192436_college_directory.sql` (lines 147 to 251) and make exactly these edits:

1. After `p_page integer default 1` add a comma and (appended last so any positional caller keeps working):
```sql
  p_sport text default null,
  p_team text default null,
  p_level text default null
```
2. After the `p_serves` validation `if` block add:
```sql
  if p_sport is not null and p_sport !~ '^[a-z][a-z-]{1,29}$' then
    raise exception 'Unknown sport';
  end if;
  if p_team is not null and p_team not in ('men', 'women') then
    raise exception 'Unknown team';
  end if;
  if p_level is not null and p_level not in ('d1', 'd2', 'd3', 'naia', 'juco', 'other') then
    raise exception 'Unknown athletics level';
  end if;
```
3. After `and (p_serves is null or p_serves = any (i.serves))` add (level groups must match `LEVEL_GROUPS` in `src/lib/athletes/sports.ts`):
```sql
      and (p_level is null or i.athletics_code = any (case p_level
        when 'd1' then array[1, 2, 3] when 'd2' then array[4, 5] when 'd3' then array[6, 7]
        when 'naia' then array[9, 10] when 'juco' then array[12, 13, 14, 17, 19]
        else array[8, 15, 16, 18, 20] end::smallint[]))
      and (p_sport is null or exists (
        select from public.college_sports s
        where s.unitid = i.unitid and s.sport = p_sport
          and (p_team is null or (p_team = 'men' and s.men is not null) or (p_team = 'women' and s.women is not null))))
```
4. The revoke/grant at the end use the new signature:
```sql
revoke execute on function public.search_colleges(
  text, text, text, text, text, integer, integer, text, boolean, text, boolean, text, text, integer, text, text, text
) from public;
grant execute on function public.search_colleges(
  text, text, text, text, text, integer, integer, text, boolean, text, boolean, text, text, integer, text, text, text
) to anon, authenticated;
```
(Argument order: the 14 old arguments unchanged, then p_sport, p_team, p_level. No caller passes them by position today; checked 2026-10-04.)

- [ ] **Step 4: Apply and run the tests**

Run: `npx supabase migration up --local && npm run test:db`
Expected: all files PASS, including `athletics_test.sql` (14) and the existing `academic_records_test.sql` ("a class with extra fields is refused" still passes: `extra` is not an allowed key).

- [ ] **Step 5: Regenerate types and check**

Run: `npx supabase gen types typescript --local > src/lib/database.types.ts && git diff --stat src/lib/database.types.ts && npm run typecheck`
Expected: the diff adds `college_sports`, `athletics_code`, `merge_college_athletics`, and the new `search_colleges` args; typecheck passes.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/*_athletics.sql supabase/tests/athletics_test.sql src/lib/database.types.ts
git commit -m "feat: college_sports table, athletics level, class tags and sport filters"
```

---

### Task 3: Sport map and the EADA import job

**Files:**
- Create: `src/lib/athletes/sports.ts`, `src/jobs/sources/eada.ts`, `src/jobs/sources/eada.test.ts`
- Modify: `src/jobs/run.ts` (ADAPTERS), `src/jobs/load.ts` (MERGE), `package.json` (fflate)

**Interfaces:**
- Produces (`sports.ts`): `SPORTS: readonly {value: string; label: string}[]`; `EADA_SPORTS: Record<string, string[]>` (EADA `Sports` name to slugs); `LEVEL_GROUPS: readonly {value: "d1"|"d2"|"d3"|"naia"|"juco"|"other"; label: string; codes: number[]}[]`; `levelName(code: number | null): string | null`; `TEAMS`.
- Produces (`eada.ts`): `parseEada(inst: unknown[][], schools: unknown[][], minRows?: number): StagedRecord<CollegeAthletics>[]`; `seasonOf(year: number): string` ("2024-25"); `readEada(fetcher, previous): Promise<AdapterResult<CollegeAthletics>>`; `type CollegeAthletics = {unitid: number; code: number; sports: {sport: string; men: number | null; women: number | null}[]}`.

- [ ] **Step 1: Write `src/lib/athletes/sports.ts`** (data only; its behavior is tested through `parseEada`):

```ts
/**
 * Sports and athletics levels from EADA (spec ncaa-athlete-path.md). Names
 * checked against the 2024-25 schools.xlsx on 2026-10-04.
 */

export const SPORTS = [
  { value: "archery", label: "Archery" },
  { value: "badminton", label: "Badminton" },
  { value: "baseball", label: "Baseball" },
  { value: "basketball", label: "Basketball" },
  { value: "beach-volleyball", label: "Beach volleyball" },
  { value: "bowling", label: "Bowling" },
  { value: "cross-country", label: "Cross country" },
  { value: "diving", label: "Diving" },
  { value: "equestrian", label: "Equestrian" },
  { value: "fencing", label: "Fencing" },
  { value: "field-hockey", label: "Field hockey" },
  { value: "football", label: "Football" },
  { value: "golf", label: "Golf" },
  { value: "gymnastics", label: "Gymnastics" },
  { value: "ice-hockey", label: "Ice hockey" },
  { value: "lacrosse", label: "Lacrosse" },
  { value: "rifle", label: "Rifle" },
  { value: "rodeo", label: "Rodeo" },
  { value: "rowing", label: "Rowing" },
  { value: "sailing", label: "Sailing" },
  { value: "skiing", label: "Skiing" },
  { value: "soccer", label: "Soccer" },
  { value: "softball", label: "Softball" },
  { value: "squash", label: "Squash" },
  { value: "swimming", label: "Swimming" },
  { value: "synchronized-swimming", label: "Synchronized swimming" },
  { value: "table-tennis", label: "Table tennis" },
  { value: "tennis", label: "Tennis" },
  { value: "track", label: "Track and field" },
  { value: "volleyball", label: "Volleyball" },
  { value: "water-polo", label: "Water polo" },
  { value: "weight-lifting", label: "Weightlifting" },
  { value: "wrestling", label: "Wrestling" },
] as const;

/** EADA's `Sports` names to our slugs. Combined sports split; "Other Sports" is skipped (empty list). */
export const EADA_SPORTS: Record<string, string[]> = {
  Archery: ["archery"],
  Badminton: ["badminton"],
  Baseball: ["baseball"],
  Basketball: ["basketball"],
  "Beach Volleyball": ["beach-volleyball"],
  Bowling: ["bowling"],
  "Cross Country": ["cross-country"],
  Diving: ["diving"],
  Equestrian: ["equestrian"],
  Fencing: ["fencing"],
  "Field Hockey": ["field-hockey"],
  Football: ["football"],
  Golf: ["golf"],
  Gymnastics: ["gymnastics"],
  "Ice Hockey": ["ice-hockey"],
  Lacrosse: ["lacrosse"],
  "Other Sports": [],
  Rifle: ["rifle"],
  Rodeo: ["rodeo"],
  Rowing: ["rowing"],
  Sailing: ["sailing"],
  Skiing: ["skiing"],
  Soccer: ["soccer"],
  Softball: ["softball"],
  Squash: ["squash"],
  Swimming: ["swimming"],
  "Swimming and Diving (combined)": ["swimming", "diving"],
  "Synchronized Swimming": ["synchronized-swimming"],
  "Table Tennis": ["table-tennis"],
  Tennis: ["tennis"],
  "Track and Field (Indoor)": ["track"],
  "Track and Field (Outdoor)": ["track"],
  "Track and Field and Cross Country (combined)": ["track", "cross-country"],
  Volleyball: ["volleyball"],
  "Water Polo": ["water-polo"],
  "Weight Lifting": ["weight-lifting"],
  Wrestling: ["wrestling"],
};

export const TEAMS = [
  { value: "women", label: "Women’s team" },
  { value: "men", label: "Men’s team" },
] as const;

/** Filter groups; the codes must match search_colleges() in the athletics migration. */
export const LEVEL_GROUPS = [
  { value: "d1", label: "NCAA Division I", codes: [1, 2, 3] },
  { value: "d2", label: "NCAA Division II", codes: [4, 5] },
  { value: "d3", label: "NCAA Division III", codes: [6, 7] },
  { value: "naia", label: "NAIA", codes: [9, 10] },
  { value: "juco", label: "Junior and community college (NJCAA, CCCAA, NWAC)", codes: [12, 13, 14, 17, 19] },
  { value: "other", label: "Other (NCCAA, USCAA, independent)", codes: [8, 15, 16, 18, 20] },
] as const;

const LEVEL_NAMES: Record<number, string> = {
  1: "NCAA Division I (FBS football)",
  2: "NCAA Division I (FCS football)",
  3: "NCAA Division I (no football)",
  4: "NCAA Division II (with football)",
  5: "NCAA Division II (no football)",
  6: "NCAA Division III (with football)",
  7: "NCAA Division III (no football)",
  8: "Other association",
  9: "NAIA Division I",
  10: "NAIA Division II",
  12: "NJCAA Division I",
  13: "NJCAA Division II",
  14: "NJCAA Division III",
  15: "NCCAA Division I",
  16: "NCCAA Division II",
  17: "CCCAA (California community colleges)",
  18: "Independent",
  19: "NWAC (Northwest community colleges)",
  20: "USCAA",
};

export const levelName = (code: number | null) => (code === null ? null : (LEVEL_NAMES[code] ?? null));
export const sportLabel = (value: string) => SPORTS.find((s) => s.value === value)?.label ?? value;
```

- [ ] **Step 2: Write the failing test** `src/jobs/sources/eada.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseEada, seasonOf } from "./eada.ts";

// Header names and positions as in the 2024-25 files (checked 2026-10-04); extra columns are ignored.
const inst = [
  ["unitid", "OPEID", "ClassificationCode", "classification_name"],
  [100654, "00100200", 1, "NCAA Division I-FBS"],
  [200, "00200000", 12, "NJCAA Division I"],
  [300, "00300000", 7, "NCAA Division III without football"],
];
const H = ["unitid", "SPORTSCODE", "Sports", "PARTIC_MEN", "PARTIC_WOMEN", "PARTIC_COED_MEN", "PARTIC_COED_WOMEN"];
const schools = [
  H,
  [100654, 1, "Baseball", 47, null, null, null],
  [100654, 2, "Basketball", 27, 20, null, null],
  // A combined row next to its split forms: one track row, larger counts win.
  [100654, 3, "Track and Field and Cross Country (combined)", 60, 55, null, null],
  [100654, 24, "Track and Field (Outdoor)", 70, 50, null, null],
  [100654, 25, "Cross Country", 12, 14, null, null],
  // Coed only: the coed counts fill in.
  [200, 36, "Sailing", null, null, 9, 7],
  [200, 29, "Other Sports", 5, 5, null, null],
  // No team for either sex: skipped.
  [300, 8, "Golf", null, null, null, null],
];

describe("parseEada", () => {
  it("builds one record per college with deduped sports", () => {
    const records = parseEada(inst, schools, 0);
    expect(records[0]).toEqual({
      status: "valid",
      id: "100654",
      value: {
        unitid: 100654,
        code: 1,
        sports: [
          { sport: "baseball", men: 47, women: null },
          { sport: "basketball", men: 27, women: 20 },
          { sport: "cross-country", men: 60, women: 55 },
          { sport: "track", men: 70, women: 55 },
        ],
      },
    });
    expect(records[1]).toMatchObject({ value: { unitid: 200, code: 12, sports: [{ sport: "sailing", men: 9, women: 7 }] } });
    expect(records[2]).toMatchObject({ value: { unitid: 300, code: 7, sports: [] } });
  });

  it("fails on a sport name it doesn't know, so a renamed file can't drop teams quietly", () => {
    expect(() => parseEada(inst, [H, [100654, 99, "Quidditch", 5, 5, null, null]], 0)).toThrow("Unknown EADA sport");
  });

  it("fails when a header is missing", () => {
    expect(() => parseEada([["unitid", "Code"]], schools, 0)).toThrow("instLevel header");
  });

  it("fails when far fewer colleges than expected", () => {
    expect(() => parseEada(inst, schools)).toThrow("only 3");
  });
});

describe("seasonOf", () => {
  it("names the academic year EADA's Year ends", () => expect(seasonOf(2025)).toBe("2024-25"));
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/jobs/sources/eada.test.ts`
Expected: FAIL (cannot find module `./eada.ts`).

- [ ] **Step 4: Write `src/jobs/sources/eada.ts`**

```ts
// Equity in Athletics Data Analysis (EADA), U.S. Department of Education,
// public domain. One zip a year (about 12 MB, about 2 minutes to download):
// instLevel.xlsx has one row per college, schools.xlsx one per college and
// sport. Spec: docs/specs/ncaa-athlete-path.md.
import { unzipSync } from "fflate";
import { readSheet } from "read-excel-file/node";
import { z } from "zod";
import { EADA_SPORTS } from "../../lib/athletes/sports.ts";
import type { Fetcher } from "../fetch/polite.ts";
import type { AdapterResult, StagedRecord } from "./types.ts";

const API = "https://ope.ed.gov/athletics/api/dataFiles";
// 2,037 colleges in the 2024-25 file; far fewer means the file changed.
export const MIN_COLLEGES = 1_500;

const count = z.number().int().min(0).max(2000).nullable();
const collegeSchema = z.object({
  unitid: z.number().int().positive(),
  code: z.number().int().min(1).max(99),
  sports: z.array(z.object({ sport: z.string().regex(/^[a-z][a-z-]{1,29}$/), men: count, women: count })),
});
export type CollegeAthletics = z.infer<typeof collegeSchema>;

const fileListSchema = z.array(z.object({ FileName: z.string(), Year: z.number().int() }));

export const seasonOf = (year: number) => `${year - 1}-${String(year).slice(2)}`;

/** Column positions by header name; throws naming the sheet when one is missing. */
function columns<const T extends string>(header: unknown[], names: T[], sheet: string) {
  const at = Object.fromEntries(names.map((n) => [n, header.indexOf(n)])) as Record<T, number>;
  const missing = names.filter((n) => at[n] === -1);
  if (missing.length) throw new Error(`EADA ${sheet} header is missing ${missing.join(", ")}`);
  return at;
}

const num = (v: unknown) => (typeof v === "number" ? v : null);

export function parseEada(inst: unknown[][], schools: unknown[][], minRows = MIN_COLLEGES): StagedRecord<CollegeAthletics>[] {
  const i = columns(inst[0] ?? [], ["unitid", "ClassificationCode"], "instLevel");
  const s = columns(
    schools[0] ?? [],
    ["unitid", "Sports", "PARTIC_MEN", "PARTIC_WOMEN", "PARTIC_COED_MEN", "PARTIC_COED_WOMEN"],
    "schools",
  );

  // unitid -> slug -> counts; a sport reported combined and split keeps the larger count.
  const teams = new Map<unknown, Map<string, { men: number | null; women: number | null }>>();
  for (const row of schools.slice(1)) {
    const name = String(row[s.Sports] ?? "");
    const slugs = EADA_SPORTS[name];
    if (!slugs) throw new Error(`Unknown EADA sport "${name}"; add it to src/lib/athletes/sports.ts`);
    const men = num(row[s.PARTIC_MEN]) ?? num(row[s.PARTIC_COED_MEN]);
    const women = num(row[s.PARTIC_WOMEN]) ?? num(row[s.PARTIC_COED_WOMEN]);
    if (men === null && women === null) continue;
    const bySport = teams.get(row[s.unitid]) ?? new Map();
    teams.set(row[s.unitid], bySport);
    for (const slug of slugs) {
      const had = bySport.get(slug);
      const max = (a: number | null | undefined, b: number | null) => (a == null ? b : b === null ? a : Math.max(a, b));
      bySport.set(slug, { men: max(had?.men, men), women: max(had?.women, women) });
    }
  }

  const records = inst.slice(1).map((row, n): StagedRecord<CollegeAthletics> => {
    const sports = [...(teams.get(row[i.unitid])?.entries() ?? [])]
      .map(([sport, c]) => ({ sport, ...c }))
      .sort((a, b) => a.sport.localeCompare(b.sport));
    const result = collegeSchema.safeParse({ unitid: row[i.unitid], code: row[i.ClassificationCode], sports });
    return result.success
      ? { status: "valid", id: String(result.data.unitid), value: result.data }
      : { status: "rejected", id: `row ${n + 2}`, reason: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "), raw: row };
  });

  const valid = records.filter((r) => r.status === "valid").length;
  if (valid < minRows) throw new Error(`EADA has only ${valid} usable colleges (expected at least ${minRows}); has the file changed?`);
  return records;
}

/** The newest year's file, skipped when it's the season already loaded. */
export async function readEada(
  fetcher: Fetcher,
  previous: { release: string | null },
): Promise<AdapterResult<CollegeAthletics>> {
  const list = await fetcher.get(`${API}/fileList`, { as: "text" });
  if (list.status !== 200 || !list.text) throw new Error(`EADA file list returned ${list.status}`);
  const newest = fileListSchema
    .parse(JSON.parse(list.text))
    .filter((f) => /^EADA_\d{4}-\d{4}\.zip$/.test(f.FileName))
    .sort((a, b) => b.Year - a.Year)[0];
  if (!newest) throw new Error("EADA file list has no yearly file");
  const release = seasonOf(newest.Year);
  if (previous.release === release) return { status: "unchanged", release, etag: null };

  const file = await fetcher.get(`${API}/file?fileName=${encodeURIComponent(newest.FileName)}`, { as: "bytes" });
  if (file.status !== 200 || !file.bytes) throw new Error(`EADA download returned ${file.status}`);
  const zip = unzipSync(new Uint8Array(file.bytes), { filter: (f) => /^(instLevel|schools)\.xlsx$/i.test(f.name) });
  const sheet = (name: string) => {
    const entry = Object.entries(zip).find(([path]) => path.toLowerCase() === name.toLowerCase());
    if (!entry) throw new Error(`EADA zip has no ${name}`);
    return readSheet(Buffer.from(entry[1]));
  };
  const [inst, schools] = await Promise.all([sheet("instLevel.xlsx"), sheet("schools.xlsx")]);
  return { status: "fetched", release, etag: null, records: parseEada(inst, schools) };
}
```

Before writing `readEada`, open `src/jobs/fetch/polite.ts:16-19` and confirm the `get` option and result names (`as: "text"` returns `.text`, `as: "bytes"` returns `.bytes`); adjust the two property names if they differ. The `filter` option's `f.name` is the path inside the zip; the 2024-25 zip has the files at its root.

- [ ] **Step 5: Run the test**

Run: `npx vitest run src/jobs/sources/eada.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Register the source**

`package.json`: `npm install fflate@^0.8.3` (already in node_modules through read-excel-file; this only makes it a direct dependency).

`src/jobs/run.ts`: import and add to `ADAPTERS` (after `cos_certifications`):

```ts
import { readEada } from "./sources/eada.ts";
// ...
  // One 12 MB zip a year; the 5-minute fetch timeout covers its 2-minute download.
  eada: { kind: "college_athletics", read: (fetcher, previous) => readEada(fetcher, previous) },
```

`src/jobs/load.ts`: add to `MERGE`:

```ts
  college_athletics: (runId: number) => ({
    sql: "select added, changed, removed from ingest.merge_college_athletics($1)",
    params: [runId],
  }),
```

- [ ] **Step 7: Dry run against the real file, then import locally**

Run: `npm run import -- eada --dry-run`
Expected: about 2,037 seen, 0 rejected, release 2024-25. robots.txt: `https://ope.ed.gov/robots.txt` redirects to an ed.gov HTML page with no rules (checked 2026-10-04), so the fetcher allows the API. If a run ever reports robots disallowed, stop and ask the owner (do not add `skipRobots`: decision 0007).

Run: `npm run import -- eada`
Expected: merged; then `npx supabase db query --local "select count(*), count(distinct unitid) from public.college_sports"` shows about 17,000 teams at about 1,900 colleges.

- [ ] **Step 8: Run all checks and commit**

Run: `npm run check`
Expected: PASS.

```bash
git add src/lib/athletes/sports.ts src/jobs/sources/eada.ts src/jobs/sources/eada.test.ts src/jobs/run.ts src/jobs/load.ts package.json package-lock.json
git commit -m "feat: EADA import job for sports and athletics levels by college"
```

---

### Task 4: Class tags in the saved record, carried through /gpa

**Files:**
- Modify: `src/lib/gpa/record.ts`, `src/app/gpa/gpa-tool.tsx:17-20,102`
- Test: `src/lib/gpa/record.test.ts` (create if missing; otherwise add to it)

**Interfaces:**
- Produces: `CORE_AREAS = ["english","math","science","social","other"] as const`, `type CoreArea`, `type SavedCourse = Course & { core?: CoreArea; year?: 9 | 10 | 11 | 12 }`, `AcademicRecord.courses: SavedCourse[]`, `courseSchema` (the course zod object, exported for Task 7).

- [ ] **Step 1: Write the failing test** `src/lib/gpa/record.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EMPTY_RECORD, recordSchema } from "./record";

const course = { name: "English 9", type: "regular", grade: "A", credits: 1 };

describe("recordSchema class tags", () => {
  it("keeps core and year (a /gpa save must not strip athlete tags)", () => {
    const parsed = recordSchema.parse({ ...EMPTY_RECORD, courses: [{ ...course, core: "english", year: 9 }] });
    expect(parsed.courses[0]).toEqual({ ...course, core: "english", year: 9 });
  });
  it("still accepts untagged classes", () => {
    expect(recordSchema.parse({ ...EMPTY_RECORD, courses: [course] }).courses[0]).toEqual(course);
  });
  it("refuses unknown tags", () => {
    expect(recordSchema.safeParse({ ...EMPTY_RECORD, courses: [{ ...course, core: "gym" }] }).success).toBe(false);
    expect(recordSchema.safeParse({ ...EMPTY_RECORD, courses: [{ ...course, year: 8 }] }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/lib/gpa/record.test.ts`
Expected: FAIL on the first test (zod strips `core` and `year`).

- [ ] **Step 3: Implement in `record.ts`**

Add below the imports, and change the type and schema:

```ts
/** Athlete tags on a class (decision 0014): its core-course area and the grade it was taken in. */
export const CORE_AREAS = ["english", "math", "science", "social", "other"] as const;
export type CoreArea = (typeof CORE_AREAS)[number];
export type SavedCourse = Course & { core?: CoreArea; year?: 9 | 10 | 11 | 12 };

export type AcademicRecord = { courses: SavedCourse[]; weights: Weights; start: Start; sat: number | null; act: number | null };
```

Replace the inline course object in `recordSchema` with an exported `courseSchema`:

```ts
export const courseSchema = z.object({
  name: z.string().trim().max(80, "Class names can be up to 80 characters"),
  type: z.enum(COURSE_TYPES),
  grade: z.enum(GRADES).nullable(),
  credits: z
    .number()
    .min(0.5, "Each class needs credits from 0.5 to 5")
    .max(5, "Each class needs credits from 0.5 to 5")
    .refine(halfStep, "Credits go in steps of 0.5"),
  core: z.enum(CORE_AREAS).optional(),
  year: z.union([z.literal(9), z.literal(10), z.literal(11), z.literal(12)]).optional(),
});
```

and in `recordSchema`: `courses: z.array(courseSchema).max(MAX_COURSES, \`Up to ${MAX_COURSES} classes\`),`. In `fromRow`, cast `row.courses as SavedCourse[]`.

- [ ] **Step 4: Carry the tags through the editor** in `src/app/gpa/gpa-tool.tsx`:

```ts
type Row = SavedCourse & { id: number };
const toRows = (courses: SavedCourse[]) => courses.map((c, i) => ({ ...c, id: i }));
```

and at line 102 keep everything but the row id:

```ts
    courses: rows.map(({ id, ...course }) => course),
```

If ESLint flags `id` as unused, use `rows.map((r) => { const { id: _id, ...course } = r; return course; })` and check how the repo's config treats `_`-prefixed names (`eslint.config.mjs`); match what it allows. Import `SavedCourse` from `@/lib/gpa/record`.

- [ ] **Step 5: Run tests and checks**

Run: `npx vitest run src/lib/gpa && npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gpa/record.ts src/lib/gpa/record.test.ts src/app/gpa/gpa-tool.tsx
git commit -m "feat: saved classes can carry a core area and grade taken; /gpa keeps them"
```

---

### Task 5: Rules, timeline and checks

**Files:**
- Create: `src/lib/athletes/rules.ts`, `src/lib/athletes/rules.test.ts`

**Interfaces:**
- Consumes: `SavedCourse`, `CoreArea` (Task 4); `gpa()`, `Grade` from `src/lib/gpa/gpa.ts`.
- Produces: `ASSOCIATIONS` (keys `ncaa1 | ncaa2 | ncaa3 | naia | juco`), `type Assoc`, `checkCore(courses, rule): CoreResult`, `checkNaia(input): NaiaResult`, `TIMELINE: Step[]`, `timelinePlanItems(assoc, gradYear, existingTitles): {title; kind: "task"; academic_year; term: "full_year"; due_on: null}[]`.

The numbers and URLs below are from the approved spec. **Replace any value Task 1 found different, and drop any timeline step Task 1 marked NOT CONFIRMED.** The NCAA point scale (`NCAA_POINTS`) follows Task 1's answer to question 1; if it was not confirmed, keep letter points without plus/minus and the page labels the GPA "estimate".

- [ ] **Step 1: Write the failing test** `src/lib/athletes/rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { SavedCourse } from "@/lib/gpa/record";
import { ASSOCIATIONS, checkCore, checkNaia, timelinePlanItems, TIMELINE } from "./rules";

const c = (core: SavedCourse["core"], grade: SavedCourse["grade"], year: SavedCourse["year"], credits = 1): SavedCourse => ({
  name: `${core} ${year}`,
  type: "regular",
  grade,
  credits,
  core,
  year,
});
// A full Division I set: 4 English, 3 math, 2 science, 1 extra science, 2 social, 4 other; all B.
const full: SavedCourse[] = [
  ...[9, 10, 11, 12].map((y) => c("english", "B", y as 9)),
  ...[9, 10, 11].map((y) => c("math", "B", y as 9)),
  ...[9, 10, 11].map((y) => c("science", "B", y as 9)),
  c("social", "B", 10), c("social", "B", 11),
  ...[9, 10, 11, 12].map((y) => c("other", "B", y as 9)),
];

describe("checkCore", () => {
  it("passes a complete Division I record", () => {
    const r = checkCore(full, ASSOCIATIONS.ncaa1.core!);
    expect(r.units).toBe(16);
    expect(r.gpa).toBe(3);
    expect(r.gaps).toEqual([]);
    expect(r.tenSeven).toEqual({ units: 14, ems: 9, ok: true });
  });
  it("names what is missing", () => {
    const r = checkCore(full.filter((x) => !(x.core === "math" && x.year === 11)), ASSOCIATIONS.ncaa1.core!);
    expect(r.gaps).toContain("1 more math");
  });
  it("counts surplus English, math or science toward the extra areas", () => {
    const r = checkCore([...full.filter((x) => x.core !== "other"), ...[1, 2, 3, 4].map(() => c("english", "B", 12))],
      ASSOCIATIONS.ncaa1.core!);
    expect(r.gaps).toEqual([]);
  });
  it("leaves unfinished classes out of the GPA and 10/7 but counts them as planned", () => {
    const r = checkCore([c("english", "A", 9), c("english", null, 11)], ASSOCIATIONS.ncaa1.core!);
    expect(r.gpa).toBe(4);
    expect(r.units).toBe(2);
    expect(r.tenSeven?.units).toBe(1);
  });
  it("lists core classes with no grade year", () => {
    expect(checkCore([c("english", "A", undefined)], ASSOCIATIONS.ncaa1.core!).untimed).toEqual(["english undefined"]);
  });
  it("is below the Division I minimum at a 2.19 core GPA; Division II has no 10/7 rule", () => {
    const low = full.map((x, i) => ({ ...x, grade: i < 3 ? ("B" as const) : ("C" as const) }));
    expect(checkCore(low, ASSOCIATIONS.ncaa1.core!).meetsGpa).toBe(false);
    expect(checkCore(low, ASSOCIATIONS.ncaa2.core!).tenSeven).toBeNull();
  });
  it("counts a half-credit class as half a year and caps a 5-credit class at one", () => {
    expect(checkCore([c("english", "A", 9, 0.5), c("math", "A", 9, 5)], ASSOCIATIONS.ncaa1.core!).units).toBe(1.5);
  });
});

describe("checkNaia", () => {
  it("meets with a 2.3 GPA alone", () => expect(checkNaia({ gpa: 2.3, sat: null, act: null, topHalf: null }).met).toBe(true));
  it("meets with two of three", () =>
    expect(checkNaia({ gpa: 2.0, sat: null, act: 18, topHalf: null }).met).toBe(true));
  it("does not meet with one of three", () =>
    expect(checkNaia({ gpa: 2.0, sat: 900, act: null, topHalf: false }).met).toBe(false));
  it("is unknown when the class-rank answer would decide it", () =>
    expect(checkNaia({ gpa: 2.1, sat: null, act: null, topHalf: null }).met).toBeNull());
});

describe("timelinePlanItems", () => {
  it("places steps in school years from the graduation year and skips ones already in the plan", () => {
    const items = timelinePlanItems("ncaa1", 2029, []);
    const first = TIMELINE.find((s) => s.assocs.includes("ncaa1"))!;
    expect(items[0]).toEqual({ title: first.title, kind: "task", academic_year: 2029 - 13 + first.grade, term: "full_year", due_on: null });
    expect(timelinePlanItems("ncaa1", 2029, items.map((i) => i.title))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/lib/athletes/rules.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/athletes/rules.ts`**

```ts
/**
 * College athletics academic rules and the timeline (spec ncaa-athlete-path.md,
 * decision 0014). Stepwell's summary, not the associations' text: each rule
 * keeps the page it was confirmed on and when. Review every August, when the
 * NCAA guide for the new year comes out.
 */
import { type Grade, gpa } from "@/lib/gpa/gpa";
import type { CoreArea, SavedCourse } from "@/lib/gpa/record";

export type Assoc = "ncaa1" | "ncaa2" | "ncaa3" | "naia" | "juco";

/** Required years by area. "ems" is extra English, math or science; "any" is extra from any core area. */
export type CoreRule = {
  need: { english: number; math: number; science: number; ems: number; social: number; any: number };
  minGpa: number;
  tenSeven: boolean;
};

type Association = {
  name: string;
  summary: string;
  decides: { name: string; url: string };
  source: string;
  checked: string;
  core?: CoreRule;
};

const CBSA = "http://fs.ncaa.org/Docs/eligibility_center/Student_Resources/CBSA.pdf";
const NCAA_EC = { name: "NCAA Eligibility Center", url: "https://www.ncaa.org/eligibility-center/" };

export const ASSOCIATIONS: Record<Assoc, Association> = {
  ncaa1: {
    name: "NCAA Division I",
    summary:
      "16 core courses: 4 years of English, 3 of math (Algebra I or higher), 2 of natural or physical science, 1 more of English, math or science, 2 of social science and 4 more core courses. 10 of them, 7 in English, math or science, finished before your senior year. A core-course GPA of at least 2.3. No test scores needed since 2023.",
    decides: NCAA_EC,
    source: "https://www.ncaa.org/eligibility-center/initial-eligibility-requirements/division-i/",
    checked: "2026-10-04",
    core: { need: { english: 4, math: 3, science: 2, ems: 1, social: 2, any: 4 }, minGpa: 2.3, tenSeven: true },
  },
  ncaa2: {
    name: "NCAA Division II",
    summary:
      "16 core courses: 3 years of English, 2 of math (Algebra I or higher), 2 of natural or physical science, 3 more of English, math or science, 2 of social science and 4 more core courses. A core-course GPA of at least 2.2. No test scores needed since 2023.",
    decides: NCAA_EC,
    source: "https://www.ncaa.org/eligibility-center/initial-eligibility-requirements/division-ii/",
    checked: "2026-10-04",
    core: { need: { english: 3, math: 2, science: 2, ems: 3, social: 2, any: 4 }, minGpa: 2.2, tenSeven: false },
  },
  ncaa3: {
    name: "NCAA Division III",
    summary:
      "Each Division III college sets its own academic standards, so there is no NCAA core-course check. Meet the college's admission requirements and ask its coaches. A free NCAA Profile Page is enough for most students.",
    decides: { name: "the college you apply to", url: "https://www.ncaa.org/eligibility-center/" },
    source: CBSA,
    checked: "2026-10-04",
  },
  naia: {
    name: "NAIA",
    summary:
      "No core courses. A high school GPA of at least 2.3, or two of these three: a GPA of at least 2.0, the top half of your graduating class, an ACT of 18 or SAT of 970 or higher.",
    decides: { name: "NAIA Eligibility Center", url: "https://www.naia.org/student-athletes/prospective/high-school-students/" },
    source: "https://copforum.naia.org/21-b-10-initial-eligibility/",
    checked: "2026-10-04",
  },
  juco: {
    name: "Junior and community colleges",
    // Task 1 fills this from njcaa.org and cccaasports.org; if not confirmed, keep this text.
    summary:
      "Junior and community college associations (NJCAA, CCCAA, NWAC) set their own entry rules, which are usually a high school diploma or its equivalent. Check with the association and the college.",
    decides: { name: "NJCAA", url: "https://www.njcaa.org/" },
    source: "https://www.njcaa.org/",
    checked: "2026-10-04",
  },
};

// NCAA core GPA points (Task 1, question 1). Plus and minus count as the plain letter.
const NCAA_POINTS: Record<Grade, number> = {
  "A+": 4, A: 4, "A-": 4, "B+": 3, B: 3, "B-": 3, "C+": 2, C: 2, "C-": 2, "D+": 1, D: 1, "D-": 1, F: 0,
};

// ponytail: a class counts at most one year whatever credits the school gives it; a school's
// approved-course list can still differ, which the page says.
const units = (c: SavedCourse) => Math.min(c.credits, 1);
const round2 = (n: number) => Math.round(n * 100) / 100;

export type CoreResult = {
  units: number;
  gpa: number | null;
  meetsGpa: boolean | null;
  gaps: string[];
  tenSeven: { units: number; ems: number; ok: boolean } | null;
  untimed: string[];
};

const AREA_WORDS: Record<keyof CoreRule["need"], string> = {
  english: "English",
  math: "math",
  science: "science",
  ems: "English, math or science",
  social: "social science",
  any: "core course",
};

/** Core-course totals by area (planned classes included), core GPA and the 10/7 rule (finished classes only). */
export function checkCore(courses: SavedCourse[], rule: CoreRule): CoreResult {
  const core = courses.filter((c): c is SavedCourse & { core: CoreArea } => c.core !== undefined);
  const have = (area: CoreArea) => core.filter((c) => c.core === area).reduce((sum, c) => sum + units(c), 0);
  const { need } = rule;

  // Surplus English, math or science fills the "ems" years, then any surplus fills "any".
  const ems = Math.max(0, have("english") - need.english) + Math.max(0, have("math") - need.math) + Math.max(0, have("science") - need.science);
  const surplus = Math.max(0, ems - need.ems) + Math.max(0, have("social") - need.social) + have("other");
  const got = {
    english: Math.min(have("english"), need.english),
    math: Math.min(have("math"), need.math),
    science: Math.min(have("science"), need.science),
    ems: Math.min(ems, need.ems),
    social: Math.min(have("social"), need.social),
    any: Math.min(surplus, need.any),
  };
  const gaps = (Object.keys(need) as (keyof CoreRule["need"])[])
    .filter((area) => got[area] < need[area])
    .map((area) => `${round2(need[area] - got[area])} more ${AREA_WORDS[area]}`);

  const graded = core.filter((c) => c.grade !== null);
  const credits = graded.reduce((sum, c) => sum + units(c), 0);
  const coreGpa = credits ? round2(graded.reduce((sum, c) => sum + NCAA_POINTS[c.grade as Grade] * units(c), 0) / credits) : null;

  const early = graded.filter((c) => c.year !== undefined && c.year <= 11);
  const earlyUnits = early.reduce((sum, c) => sum + units(c), 0);
  const earlyEms = early.filter((c) => c.core === "english" || c.core === "math" || c.core === "science").reduce((sum, c) => sum + units(c), 0);

  return {
    units: core.reduce((sum, c) => sum + units(c), 0),
    gpa: coreGpa,
    meetsGpa: coreGpa === null ? null : coreGpa >= rule.minGpa,
    gaps,
    tenSeven: rule.tenSeven ? { units: earlyUnits, ems: earlyEms, ok: earlyUnits >= 10 && earlyEms >= 7 } : null,
    untimed: core.filter((c) => c.year === undefined).map((c) => c.name),
  };
}

export type NaiaInput = { gpa: number | null; sat: number | null; act: number | null; topHalf: boolean | null };

/** true / false, or null when an unanswered class-rank question would decide it. */
export function checkNaia({ gpa: g, sat, act, topHalf }: NaiaInput): { met: boolean | null } {
  if (g !== null && g >= 2.3) return { met: true };
  const known = [g !== null && g >= 2.0, (act ?? 0) >= 18 || (sat ?? 0) >= 970].filter(Boolean).length;
  if (topHalf === true) return { met: known + 1 >= 2 };
  if (known >= 2) return { met: true };
  return { met: topHalf === null && known === 1 ? null : false };
}

/** The overall unweighted GPA the NAIA check uses, from /gpa's math. */
export const overallGpa = (r: { courses: SavedCourse[]; weights: Parameters<typeof gpa>[1]; start: Parameters<typeof gpa>[2] }) =>
  gpa(r.courses, r.weights, r.start, "unweighted");

export type Step = { grade: 9 | 10 | 11 | 12; title: string; assocs: Assoc[]; url: string };

const NCAA: Assoc[] = ["ncaa1", "ncaa2"];
const ALL: Assoc[] = ["ncaa1", "ncaa2", "ncaa3", "naia", "juco"];

/** Confirmed steps only (Task 1). Titles are what lands in the plan, so keep them under 200 characters. */
export const TIMELINE: Step[] = [
  { grade: 9, title: "Ask your counselor for your school’s list of NCAA-approved core courses", assocs: NCAA, url: "https://web3.ncaa.org/hsportal/exec/hsAction" },
  { grade: 9, title: "Make a free NCAA Profile Page at the Eligibility Center", assocs: ["ncaa1", "ncaa2", "ncaa3"], url: NCAA_EC.url },
  { grade: 10, title: "Check your core courses are on track for your division", assocs: NCAA, url: NCAA_EC.url },
  { grade: 10, title: "Look up your sport’s recruiting calendar and contact rules", assocs: ALL, url: "https://www.ncaa.org/sports/2018/5/8/recruiting-calendars.aspx" },
  { grade: 11, title: "Register for an NCAA certification account before any official visit", assocs: NCAA, url: NCAA_EC.url },
  { grade: 11, title: "Register with the NAIA Eligibility Center", assocs: ["naia"], url: ASSOCIATIONS.naia.decides.url },
  { grade: 11, title: "Finish 10 core courses, 7 in English, math or science, before senior year", assocs: ["ncaa1"], url: ASSOCIATIONS.ncaa1.source },
  { grade: 12, title: "Finish your core courses and send your final transcript with proof of graduation", assocs: NCAA, url: NCAA_EC.url },
  { grade: 12, title: "Compare written offers of athletics aid with your family", assocs: ["ncaa1"], url: CBSA },
];

/** The timeline as plan rows for one association, skipping titles already in the plan. */
export function timelinePlanItems(assoc: Assoc, gradYear: number, existing: string[]) {
  const have = new Set(existing);
  return TIMELINE.filter((s) => s.assocs.includes(assoc) && !have.has(s.title)).map((s) => ({
    title: s.title,
    kind: "task" as const,
    // A school year is named by the year it starts; 12th grade starts the year before graduation.
    academic_year: gradYear - 13 + s.grade,
    term: "full_year" as const,
    due_on: null,
  }));
}
```

Check every URL in `ASSOCIATIONS` and `TIMELINE` with `curl -sIL -o /dev/null -w '%{http_code} %{url_effective}\n' <url>` before committing. Old `ncaa.org/sports/...` links redirect to the home page; any URL that ends on a home page or an error gets replaced by `https://www.ncaa.org/eligibility-center/` (NCAA) or the association's eligibility page.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/athletes`
Expected: PASS. If `tenSeven` in the first test is not `{units: 14, ems: 9, ok: true}`, recount from the fixture (9th to 11th grade: English 3, math 3, science 3, social 2, other 3 = 14; EMS 9) and fix the code, not the test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/athletes/rules.ts src/lib/athletes/rules.test.ts
git commit -m "feat: athletics eligibility rules, core-course check and timeline"
```

---

### Task 6: Sport filters on /colleges and a Sports section on college pages

**Files:**
- Modify: `src/lib/colleges/labels.ts` (`directorySchema`), `src/lib/colleges/data.ts` (`searchColleges`, new `getCollegeSports`, `getEadaSeason`), `src/app/colleges/page.tsx` (Filters), `src/app/colleges/[unitid]/page.tsx` (Sports section)
- Test: `src/lib/colleges/labels.test.ts` (add cases)

**Interfaces:**
- Consumes: `SPORTS`, `TEAMS`, `LEVEL_GROUPS`, `levelName`, `sportLabel` (Task 3).
- Produces: `directorySchema` keys `sport`, `team`, `level`; `getCollegeSports(unitid): Promise<{sport: string; men: number | null; women: number | null}[]>`; `getEadaSeason(): Promise<string | null>`.

- [ ] **Step 1: Write the failing test** (add to `src/lib/colleges/labels.test.ts`):

```ts
describe("directorySchema sport filters", () => {
  it("keeps known sport, team and level", () => {
    expect(directorySchema.parse({ sport: "soccer", team: "women", level: "d2" })).toMatchObject({
      sport: "soccer", team: "women", level: "d2",
    });
  });
  it("drops unknown values", () => {
    expect(directorySchema.parse({ sport: "quidditch", team: "coed", level: "d4" })).toMatchObject({
      sport: undefined, team: undefined, level: undefined,
    });
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/lib/colleges/labels.test.ts`
Expected: FAIL (keys missing).

- [ ] **Step 3: Implement**

`labels.ts`: import `{ LEVEL_GROUPS, SPORTS, TEAMS } from "@/lib/athletes/sports"` and add to `directorySchema`:

```ts
  sport: choice(SPORTS),
  team: choice(TEAMS),
  level: choice(LEVEL_GROUPS),
```

`data.ts`, inside the `search_colleges` call:

```ts
    p_sport: f.sport,
    p_team: f.sport ? f.team : undefined,
    p_level: f.level,
```

and add:

```ts
export const getCollegeSports = cache(async (unitid: number) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("college_sports").select("sport, men, women").eq("unitid", unitid).order("sport");
  if (error) throw new Error(`College sports failed (${error.code})`);
  return data;
});

/** The EADA season loaded last ("2024-25"), for the source line. */
export const getEadaSeason = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sources").select("last_release").eq("id", "eada").maybeSingle();
  if (error) throw new Error(`Source lookup failed (${error.code})`);
  return data?.last_release ?? null;
});
```

`src/app/colleges/page.tsx`: add `p.sport, p.team, p.level` to the `more` array, change the summary to "More filters: cost, test scores, type, setting, sports", and add inside the grid after the `serves` Select:

```tsx
          <Select id="sport" label="Sport" choices={SPORTS} value={p.sport} any="Any sport" />
          <Select id="team" label="Team" choices={TEAMS} value={p.team} any="Men’s or women’s" />
          <Select id="level" label="Athletics level" choices={LEVEL_GROUPS} value={p.level} any="Any level" />
```

`src/app/colleges/[unitid]/page.tsx`: add `getCollegeSports(c.unitid)` and `getEadaSeason()` to the `Promise.all`, and after the programs `</section>`:

```tsx
        {c.athletics_code !== null && (
          <section aria-labelledby="sports-heading" className="mt-12 max-w-2xl">
            <h2 id="sports-heading" className="text-lg font-bold">
              Sports
            </h2>
            <p className="mt-2">{levelName(c.athletics_code) ?? "Athletics level not reported"}.</p>
            {(["women", "men"] as const).map((team) => {
              const list = sports.filter((s) => s[team] !== null);
              return list.length === 0 ? null : (
                <div key={team} className="mt-6">
                  <h3 className="font-heading font-bold">{team === "women" ? "Women’s teams" : "Men’s teams"}</h3>
                  <ul className="mt-2 divide-y divide-border-subtle border-y border-border-subtle">
                    {list.map((s) => (
                      <li key={s.sport} className="flex justify-between gap-4 py-2">
                        <Link href={`/colleges?sport=${s.sport}&team=${team}`}>{sportLabel(s.sport)}</Link>
                        <span className="text-muted">{s[team]} athletes</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <p className="mt-4 text-sm text-muted">
              Source: U.S. Department of Education, Equity in Athletics Data Analysis (EADA){season ? `, ${season}` : ""}.
              Athletes counted once per team. <Link href="/athletes">What it takes to play in college</Link>
            </p>
          </section>
        )}
```

- [ ] **Step 4: Run tests and checks**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/colleges src/app/colleges
git commit -m "feat: sport, team and level filters; Sports section on college pages"
```

---

### Task 7: The /athletes page and its actions

**Files:**
- Create: `src/app/athletes/page.tsx`, `src/app/athletes/loading.tsx`, `src/app/athletes/error.tsx`, `src/app/athletes/actions.ts`, `src/app/athletes/core-checker.tsx`, `src/app/athletes/add-timeline.tsx`
- Modify: `src/components/main-nav.tsx` (add `{ href: "/athletes", label: "Athletes" }` after GPA)

**Interfaces:**
- Consumes: `ASSOCIATIONS`, `checkCore`, `checkNaia`, `overallGpa`, `TIMELINE`, `timelinePlanItems`, `Assoc` (Task 5); `SPORTS`, `TEAMS`, `LEVEL_GROUPS` (Task 3); `getMyAcademicRecord` (`src/lib/gpa/data.ts`), `getMyProfile` (`src/lib/profile/data.ts`), `getCurrentUser` (`src/lib/auth/dal.ts`), `courseSchema`, `CORE_AREAS` (Task 4); `Band`, `Page`, `PageTitle` (`src/components/page`), `buttonClass` (`src/components/button-styles`).
- Produces: server actions `saveCoreTags(tags: {name: string; core: CoreArea | null; year: number | null}[]): Promise<SaveResult>` and `addTimeline(assoc: Assoc): Promise<{ ok: true; added: number } | { ok: false; message: string }>`.

- [ ] **Step 1: Read the patterns to copy:** `src/app/gpa/loading.tsx` and `src/app/colleges/error.tsx` (skeleton and error page), the `Band`/`Page` usage in `src/app/gpa/page.tsx`, and `docs/design/AVOID.md`.

- [ ] **Step 2: Write `src/app/athletes/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type Assoc, timelinePlanItems } from "@/lib/athletes/rules";
import { getCurrentUser } from "@/lib/auth/dal";
import { CORE_AREAS, courseSchema } from "@/lib/gpa/record";
import { getMyProfile } from "@/lib/profile/data";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { ok: true } | { ok: false; message: string };

const tagsSchema = z
  .array(
    z.object({
      name: z.string().max(80),
      core: z.enum(CORE_AREAS).nullable(),
      year: z.number().int().min(9).max(12).nullable(),
    }),
  )
  .max(80);

/**
 * Tags the student's saved classes, in their saved order (decision 0014). Only
 * the courses column changes; RLS limits it to their own row. A list that
 * changed since the page loaded is refused rather than tagging the wrong class.
 */
export async function saveCoreTags(input: unknown): Promise<SaveResult> {
  if (!(await getCurrentUser())) return { ok: false, message: "Sign in to save your classes." };
  const tags = tagsSchema.safeParse(input);
  if (!tags.success) return { ok: false, message: "Check your class choices." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("academic_records").select("courses").maybeSingle();
  if (error) {
    console.error("Loading classes for tags failed:", error.code);
    return { ok: false, message: "We couldn’t save that. Try again." };
  }
  if (!data) return { ok: false, message: "Save your classes on the GPA page first." };
  const courses = z.array(courseSchema).safeParse(data.courses);
  // Same count and names in the same order, or the list changed in another tab.
  if (
    !courses.success ||
    courses.data.length !== tags.data.length ||
    courses.data.some((c, i) => c.name !== tags.data[i].name)
  ) {
    return { ok: false, message: "Your classes changed since this page loaded. Reload the page and try again." };
  }
  const tagged = courses.data.map((c, i) => {
    const { core: _core, year: _year, ...base } = c;
    const t = tags.data[i];
    return { ...base, ...(t.core && { core: t.core }), ...(t.year && { year: t.year as 9 | 10 | 11 | 12 }) };
  });
  const { error: saveError } = await supabase.from("academic_records").update({ courses: tagged }).not("user_id", "is", null);
  if (saveError) {
    console.error("Saving class tags failed:", saveError.code);
    return { ok: false, message: "We couldn’t save that. Try again." };
  }
  revalidatePath("/athletes");
  revalidatePath("/gpa");
  return { ok: true };
}

const assocSchema = z.enum(["ncaa1", "ncaa2", "ncaa3", "naia", "juco"]);

/** Adds the timeline's steps for one association to /plan, once. */
export async function addTimeline(input: unknown): Promise<{ ok: true; added: number } | { ok: false; message: string }> {
  const assoc = assocSchema.safeParse(input);
  if (!assoc.success) return { ok: false, message: "Pick a level first." };
  const profile = await getMyProfile();
  if (!profile) return { ok: false, message: "Sign in to add these to your plan." };
  if (!profile.grad_year || (profile.stage !== "high_school" && profile.stage !== "middle_school")) {
    return { ok: false, message: "Add your high school graduation year in your profile first." };
  }
  const supabase = await createClient();
  const { data: existing, error } = await supabase.from("plan_items").select("title");
  if (error) {
    console.error("Reading plan for timeline failed:", error.code);
    return { ok: false, message: "We couldn’t add these. Try again." };
  }
  const rows = timelinePlanItems(assoc.data as Assoc, profile.grad_year, existing.map((r) => r.title));
  if (rows.length === 0) return { ok: true, added: 0 };
  const { error: insertError } = await supabase.from("plan_items").insert(rows);
  if (insertError?.code === "54000") return { ok: false, message: "Your plan has the most steps we allow (500). Delete some to add these." };
  if (insertError) {
    console.error("Adding timeline failed:", insertError.code);
    return { ok: false, message: "We couldn’t add these. Try again." };
  }
  revalidatePath("/plan");
  return { ok: true, added: rows.length };
}
```

Check the profile stage values in `src/lib/profile/schema.ts` (`high_school`, `middle_school` are used by `src/lib/plan/labels.ts:36`); match them exactly. Past-graduation steps (a senior adding 9th-grade steps) land in past school years; that is fine, they show in the plan as earlier years only if `planYears` includes them, which it does for any year with items.

- [ ] **Step 3: Write `src/app/athletes/core-checker.tsx`** (client): props `{ assoc: Assoc; courses: SavedCourse[]; weights; start; sat: number | null; act: number | null }`.
  - State: `tags` array initialized from `courses` (`{name: c.name, core: c.core ?? null, year: c.year ?? null}`), `topHalf: boolean | null`, `message`.
  - For `ncaa1`/`ncaa2`: a list of the saved classes, each a `<fieldset>` with the class name as `<legend>`, a `<select>` "Core area" (Not a core course, English, Math, Science, Social science, Other core: world language, religion, philosophy) and a `<select>` "Grade taken" (Not set, 9th to 12th). Below: the live `checkCore(taggedCourses, ASSOCIATIONS[assoc].core!)` result as plain sentences: "Core courses: 11 of 16 (including planned)." "Core GPA: 2.41 (minimum 2.3)." "Before senior year: 8 of 10, 6 of 7 in English, math or science." the `gaps` list joined ("Still needed: 1 more math, 2 more core course."), and the `untimed` names ("Add the grade taken for: Biology.").
  - For `naia`: the overall GPA from `overallGpa`, the saved SAT/ACT, and a radio group "Are you in the top half of your class?" (Yes, No, Not sure), then `checkNaia` as "Meets the NAIA standard", "Doesn't meet it yet" or "Depends on your class rank".
  - Every result ends with: "Estimate, not an official certification. {decides.name} decides." linking `decides.url`.
  - A Save button (`buttonClass("secondary")`) calling `saveCoreTags(tags)` inside `startTransition`; show the returned message in a `role="status"` paragraph.
  - Follow `gpa-tool.tsx` for field classes, labels and `aria-describedby`; no hover animations; every control at least 44px tall (`min-h-11`).

- [ ] **Step 4: Write `src/app/athletes/page.tsx`** (server):

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { Band, Page, PageTitle } from "@/components/page";
import { type Assoc, ASSOCIATIONS, TIMELINE } from "@/lib/athletes/rules";
import { LEVEL_GROUPS, SPORTS, TEAMS } from "@/lib/athletes/sports";
import { getCurrentUser } from "@/lib/auth/dal";
import { getMyAcademicRecord } from "@/lib/gpa/data";
import { CoreChecker } from "./core-checker";
import { AddTimeline } from "./add-timeline";

export const metadata: Metadata = { title: "Athletes" };

const ASSOC_KEYS = Object.keys(ASSOCIATIONS) as [Assoc, ...Assoc[]];
const DIRECTORY_LEVEL: Record<Assoc, string> = { ncaa1: "d1", ncaa2: "d2", ncaa3: "d3", naia: "naia", juco: "juco" };

export default async function AthletesPage({ searchParams }: PageProps<"/athletes">) {
  const level = z.enum(ASSOC_KEYS).catch("ncaa1").parse((await searchParams).level);
  const rule = ASSOCIATIONS[level];
  const [user, record] = await Promise.all([getCurrentUser(), getMyAcademicRecord()]);
  // ... render (see below)
}
```

Sections, each `<section aria-labelledby=... className="mt-12 max-w-2xl">`:
1. Band: `PageTitle` "Playing a sport in college", one sentence of intro, then a GET form with a `<select name="level">` of the five associations and a "Show" button (works without JavaScript), like `/colleges` filters.
2. "What {rule.name} asks for": `rule.summary`, then "Checked {rule.checked} on <a href={rule.source}>the official page</a>. Rules change; {rule.decides.name} has the final word."
3. "Your classes": signed out: "Sign in and save your classes on <Link href="/gpa">GPA and test scores</Link> to check them here." Signed in without classes: "Add your classes on the GPA page first." Otherwise `ncaa1`/`ncaa2`/`naia` render `<CoreChecker ... />`; `ncaa3`/`juco` say the summary already covers it.
4. "Year by year": `TIMELINE.filter(s => s.assocs.includes(level))` grouped by grade under `<h3>` "9th grade" ... "12th grade", each step a list item with its link. Signed in: an `<AddTimeline assoc={level} />` client button (in its own small file `add-timeline.tsx`) calling `addTimeline` and showing "Added 6 steps to <Link href="/plan">your plan</Link>." or the returned message.
5. "Find teams": GET form to `/colleges` with hidden `level={DIRECTORY_LEVEL[level]}`, a Sport select (`SPORTS`) and Team select (`TEAMS`), button "Find colleges".
6. Source line: "Rules: Stepwell's summary of the NCAA, NAIA and NJCAA pages linked above. Teams: U.S. Department of Education, Equity in Athletics Data Analysis (EADA)."

Add `add-timeline.tsx` to this task's files. `loading.tsx`: copy `src/app/gpa/loading.tsx`'s skeleton shape. `error.tsx`: copy `src/app/colleges/error.tsx` with the page name changed.

- [ ] **Step 5: Add the nav link** in `src/components/main-nav.tsx` after GPA: `{ href: "/athletes", label: "Athletes" },`. The comment says seven links don't fit below 1024px; check the desktop nav at exactly 1024px in Task 8 and, if it wraps, shorten another label or report to the owner (do not change the breakpoint without asking).

- [ ] **Step 6: Run checks**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/athletes src/components/main-nav.tsx
git commit -m "feat: /athletes with rules, core-course checker, timeline and team search"
```

---

### Task 8: Docs, privacy, data sources, and verification in the browser

**Files:**
- Modify: `src/app/privacy/page.tsx` (classes paragraph at about line 41: add "and, if you add them on the Athletes page, each class's core-course area and the grade you took it in"), `src/lib/sources/list.ts` (EADA entry), `docs/DATA_SOURCES.md` (EADA section after College Scorecard), `docs/specs/ncaa-athlete-path.md` (tick criteria; change the "counted in the import log" line to "skipped by the merge, which keeps only colleges in Scorecard"), `docs/PROGRESS.md`.

- [ ] **Step 1: Add the EADA source entry** to `SOURCES` in `src/lib/sources/list.ts`:

```ts
  {
    id: "eada",
    name: "Equity in Athletics Data Analysis (EADA)",
    publisher: "U.S. Department of Education, Office of Postsecondary Education",
    uses: "Which sports each college offers, at what level, and roster sizes for men’s and women’s teams.",
    url: "https://ope.ed.gov/athletics/",
  },
```

- [ ] **Step 2: Write the DATA_SOURCES.md section**, in the style of the College Scorecard section: What, Owner, Access (no key; `api/dataFiles/fileList` then `api/dataFiles/file?fileName=`), Rules (public domain; about 12 MB, about 2 minutes; no ETag, so the season in `last_release` decides "unchanged"), Key (`unitid`), Refresh (monthly check, new season around April), What we read (classification code; per sport `PARTIC_MEN`/`PARTIC_WOMEN`, coed counts when those are blank; combined sports split; "Other Sports" skipped).

- [ ] **Step 3: Build and start production locally**

Run: `npm run build && npm start` (port 3000; if EADDRINUSE, find the PID with `ss -ltnp | grep 3000` and `kill <pid>`).

- [ ] **Step 4: Check in the browser with Playwright** at 320, 390, 1024 and 1280px; save screenshots under `.playwright-mcp/`:
  - `/athletes` signed out: all levels via the level form; no console or CSP errors; no horizontal scroll.
  - Sign in at `/sign-in` as `gpa-test@example.test` / `gpa-test-pass-1` (local database only). On `/gpa` make sure there are a few saved classes. On `/athletes?level=ncaa1`, tag them and save; reload; tags remain.
  - On `/gpa` change one grade and save; back on `/athletes` the tags are still there (Review Focus 1).
  - Click "Add to my plan" twice: the second time adds 0; `/plan` shows the steps in the right grade years (Review Focus 5). With the profile's graduation year cleared, the message asks for it.
  - `/colleges?sport=soccer&team=women&level=d2`: results, filters kept on page 2.
  - A college with teams (for example unitid 100654): Sports section with roster sizes and the EADA source line. A college not in EADA: no section.
  - Nav at 1024px fits on one line.
  - Keyboard: tab through the level form, class selects and buttons; focus is visible.
- [ ] **Step 5: Check against AVOID.md** (read it again): no em dashes in new copy (`grep -rn "—" src/app/athletes src/lib/athletes`), no shadows, gradients, icons or hover animations.
- [ ] **Step 6: Security items** (`docs/SECURITY.md`): list in the final report which items were touched (RLS on `college_sports`, zod on both actions, user from session, no logging of grades, friendly errors) and how each is satisfied.
- [ ] **Step 7: Stop the server by PID, run all checks, commit**

Run: `npm run check && npm run test:db`
Expected: PASS.

```bash
git add src/app/privacy/page.tsx src/lib/sources/list.ts docs/DATA_SOURCES.md docs/specs/ncaa-athlete-path.md docs/PROGRESS.md
git commit -m "docs: EADA source, privacy note for class tags, athlete path built"
```

Owner steps after this plan (ask, do not do): push; apply the athletics migration to the cloud. The nightly `import.yml` `--due` run then picks up `eada` by itself (a new source has no last success); `! gh workflow run import.yml -f source=eada` only makes it happen sooner.

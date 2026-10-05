"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/button-styles";
import { RadioGroup, SelectField } from "@/components/form";
import { type Assoc, ASSOCIATIONS, checkCore, checkNaia, overallGpa } from "@/lib/athletes/rules";
import type { Start, Weights } from "@/lib/gpa/gpa";
import type { CoreArea, SavedCourse } from "@/lib/gpa/record";
import { saveCoreTags } from "./actions";

const AREAS: { value: CoreArea; label: string }[] = [
  { value: "english", label: "English" },
  { value: "math", label: "Math" },
  { value: "science", label: "Science" },
  { value: "social", label: "Social science" },
  { value: "other", label: "Other core: world language, religion, philosophy" },
];
const YEARS = [9, 10, 11, 12].map((y) => ({ value: String(y), label: `${y}th grade` }));
const TOP_HALF = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Not sure" },
];

type Tag = { name: string; core: CoreArea | null; year: 9 | 10 | 11 | 12 | null };
type Props = {
  assoc: Assoc;
  courses: SavedCourse[];
  weights: Weights;
  start: Start;
  sat: number | null;
  act: number | null;
};

const fixed = (n: number) => n.toFixed(2);

/** The core-course checker (NCAA I and II) or the NAIA standard check, on the student's saved classes. */
export function CoreChecker({ assoc, courses, weights, start, sat, act }: Props) {
  const rule = ASSOCIATIONS[assoc];
  const [tags, setTags] = useState<Tag[]>(() => courses.map((c) => ({ name: c.name, core: c.core ?? null, year: c.year ?? null })));
  const [topHalf, setTopHalf] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const estimate = (
    <p className="mt-4 text-sm">
      Estimate, not an official certification. <a href={rule.decides.url}>{rule.decides.name}</a> decides.
    </p>
  );

  if (!rule.core) {
    const g = overallGpa({ courses, weights, start });
    const met = checkNaia({ gpa: g, sat, act, topHalf }).met;
    const scores = [sat && `SAT ${sat}`, act && `ACT ${act}`].filter(Boolean).join(", ");
    return (
      <div>
        <p>Your unweighted GPA: {g === null ? "add grades on the GPA page to see it" : fixed(g)}.</p>
        <p className="mt-2">Your test scores: {scores || "none saved"}.</p>
        <div className="mt-6">
          <RadioGroup
            name="top-half"
            legend="Are you in the top half of your class?"
            options={TOP_HALF}
            defaultValue="unsure"
            onValueChange={(v) => setTopHalf(v === "yes" ? true : v === "no" ? false : null)}
          />
        </div>
        <p className="mt-6 font-bold" role="status">
          {met === true ? "Meets the NAIA standard." : met === false ? "Doesn’t meet it yet." : "Depends on your class rank."}
        </p>
        {estimate}
      </div>
    );
  }

  const tagged = courses.map((c, i) => ({ ...c, core: tags[i].core ?? undefined, year: tags[i].year ?? undefined }));
  const r = checkCore(tagged, rule.core);
  const set = (i: number, change: Partial<Tag>) => setTags((t) => t.map((x, j) => (j === i ? { ...x, ...change } : x)));
  const label = (i: number) => courses[i].name || `Class ${i + 1}`;

  const save = () =>
    startTransition(async () => {
      const result = await saveCoreTags(tags);
      setMessage(result.ok ? "Saved. Your tags also stay with your classes on the GPA page." : result.message);
    });

  return (
    <div>
      <p>
        For each class, pick its core area (check your school’s list of NCAA-approved courses) and the grade you took it
        in.
      </p>
      <ul className="mt-6 divide-y divide-border-subtle border-y border-border-subtle">
        {tags.map((t, i) => (
          <li key={i} className="py-4">
            <fieldset>
              <legend className="font-bold">{label(i)}</legend>
              <div className="gap-4 sm:flex">
                <SelectField
                  id={`core-${i}`}
                  label="Core area"
                  placeholder="Not a core course"
                  options={AREAS}
                  value={t.core ?? ""}
                  onChange={(e) => set(i, { core: (e.target.value || null) as CoreArea | null })}
                />
                <SelectField
                  id={`year-${i}`}
                  label="Grade taken"
                  placeholder="Not set"
                  options={YEARS}
                  value={t.year === null ? "" : String(t.year)}
                  onChange={(e) => set(i, { year: e.target.value ? (Number(e.target.value) as Tag["year"]) : null })}
                />
              </div>
            </fieldset>
          </li>
        ))}
      </ul>
      <button type="button" onClick={save} disabled={pending} className={`mt-6 ${buttonClass("secondary")}`}>
        {pending ? "Saving" : "Save my choices"}
      </button>
      {message && (
        <p className="mt-4" role="status">
          {message}
        </p>
      )}

      <h3 className="mt-10 font-heading font-bold">Your estimate</h3>
      <p className="mt-2">Core courses: {r.units} of 16 (including classes without a grade yet).</p>
      <p className="mt-2">
        Core GPA: {r.gpa === null ? "add grades to see it" : fixed(r.gpa)} (minimum {rule.core.minGpa}).
      </p>
      {r.tenSeven && (
        <p className="mt-2">
          Before senior year: {r.tenSeven.units} of 10, {r.tenSeven.ems} of 7 in English, math or science.
        </p>
      )}
      <p className="mt-2">{r.gaps.length ? `Still needed: ${r.gaps.join(", ")}.` : "Every core area is covered."}</p>
      {r.untimed.length > 0 && (
        <p className="mt-2">
          Add the grade taken for: {r.untimed.map((n) => n || "an unnamed class").join(", ")}.
        </p>
      )}
      {estimate}
    </div>
  );
}

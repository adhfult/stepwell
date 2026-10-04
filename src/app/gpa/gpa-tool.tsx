"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { buttonClass } from "@/components/button-styles";
import { ResultPanel } from "@/components/form";
import { actToSat, CONCORDANCE_SOURCE, satToAct } from "@/lib/gpa/concordance";
import { type Course, COURSE_TYPES, type CourseType, GRADES, gpa, highest, needed, type Scale, type Weights } from "@/lib/gpa/gpa";
import { type AcademicRecord, EMPTY_RECORD, MAX_COURSES, recordSchema } from "@/lib/gpa/record";
import { removeAcademicRecord, saveAcademicRecord, setScholarshipGpa } from "./actions";

const TYPE_NAMES: Record<CourseType, string> = { regular: "Regular", honors: "Honors", ap: "AP", ib: "IB", dual: "Dual enrollment" };
const DRAFT_KEY = "stepwell-gpa-draft";
const control = "mt-2 block min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-base text-foreground";
const invalidControl = "mt-2 block min-h-11 w-full rounded-control border-2 border-accent bg-surface px-3 text-base text-foreground";

type Row = Course & { id: number };
type Status = { tone: "info" | "error"; title: string; text: string } | null;

const toRows = (courses: Course[]) => courses.map((c, i) => ({ ...c, id: i }));
const fixed = (n: number) => n.toFixed(2);
const article = (grade: string) => (grade.startsWith("A") || grade === "F" ? "an" : "a");
/** "" stays null; anything else is a number or NaN for the caller to reject. */
const parse = (raw: string) => (raw.trim() === "" ? null : Number(raw.trim()));

const readDraft = () => {
  try {
    return localStorage.getItem(DRAFT_KEY);
  } catch {
    return null; // No storage (private window): start empty.
  }
};
const writeDraft = (value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(DRAFT_KEY);
    else localStorage.setItem(DRAFT_KEY, value);
  } catch {
    // Storage off: the tool still works, the draft just isn't kept.
  }
};
const noSubscribe = () => () => {};

type Props = { saved: AcademicRecord | null; signedIn: boolean; needsConsent: boolean; eligibilityOptedIn: boolean };

/**
 * The /gpa tool (spec gpa-and-tests.md). Everything is worked out in the
 * browser as the student types; signed-in students can save. A draft
 * (signed out, or signed in with nothing saved yet) is kept in this browser
 * only and checked like any input before it's used.
 */
export function GpaTool(props: Props) {
  // false while hydrating, true after: storage can only be read in the browser.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  if (props.saved) return <Editor {...props} initial={props.saved} />;
  // Without a saved record the editor waits for the draft, so it never mounts
  // empty and overwrites the draft with its first save.
  if (!hydrated) {
    return (
      <div aria-busy="true">
        <p className="sr-only">Loading the GPA tool</p>
        <div aria-hidden="true">
          <div className="h-5 w-32 bg-border-subtle" />
          <div className="mt-4 h-3 w-full max-w-2xl bg-border-subtle" />
          <div className="mt-6 h-14 bg-border-subtle" />
          <div className="mt-6 h-11 w-32 bg-border-subtle" />
        </div>
      </div>
    );
  }
  let fromDraft: AcademicRecord | null = null;
  try {
    const parsed = recordSchema.safeParse(JSON.parse(readDraft() ?? "null"));
    if (parsed.success) fromDraft = parsed.data;
  } catch {
    // A broken draft: start empty.
  }
  return <Editor {...props} initial={fromDraft ?? EMPTY_RECORD} />;
}

function Editor({ saved, signedIn, needsConsent, eligibilityOptedIn, initial }: Props & { initial: AcademicRecord }) {
  const [rows, setRows] = useState<Row[]>(toRows(initial.courses));
  const [nextId, setNextId] = useState(initial.courses.length);
  const [weights, setWeights] = useState<Weights>(initial.weights);
  const [start, setStart] = useState(initial.start);
  const [satRaw, setSatRaw] = useState(initial.sat?.toString() ?? "");
  const [actRaw, setActRaw] = useState(initial.act?.toString() ?? "");
  const [targetRaw, setTargetRaw] = useState("");
  const [scale, setScale] = useState<Scale>("unweighted");
  // Bumped after removing, so the uncontrolled fields remount empty.
  const [version, setVersion] = useState(0);
  const [hasSaved, setHasSaved] = useState(Boolean(saved));
  const [status, setStatus] = useState<Status>(null);
  const [pending, startTransition] = useTransition();

  const sat = parse(satRaw);
  const act = parse(actRaw);
  const satOk = sat !== null && Number.isInteger(sat) && sat >= 400 && sat <= 1600 && sat % 10 === 0;
  const actOk = act !== null && Number.isInteger(act) && act >= 1 && act <= 36;
  const record: AcademicRecord = {
    courses: rows.map((r) => ({ name: r.name, type: r.type, grade: r.grade, credits: r.credits })),
    weights,
    start,
    sat: satOk ? sat : null,
    act: actOk ? act : null,
  };

  const json = JSON.stringify(record);
  useEffect(() => {
    if (!signedIn) writeDraft(json);
  }, [json, signedIn]);
  const forgetDraft = () => writeDraft(null);

  const update = (id: number, change: Partial<Course>) =>
    setRows((list) => list.map((r) => (r.id === id ? { ...r, ...change } : r)));
  const addRow = () => {
    setRows((list) => [...list, { id: nextId, name: "", type: "regular", grade: null, credits: 1 }]);
    setNextId((n) => n + 1);
  };

  const unweighted = gpa(record.courses, weights, start, "unweighted");
  const weighted = gpa(record.courses, weights, start, "weighted");
  const hasUnfinished = record.courses.some((c) => c.grade === null && c.credits > 0);
  const target = parse(targetRaw);
  const targetOk = target !== null && target >= 0 && target <= 5;
  const answer = targetOk ? needed(record.courses, weights, start, scale, target) : null;
  const bestUnweighted = highest(record.courses, weights, start, "unweighted");
  const bestWeighted = highest(record.courses, weights, start, "weighted");

  function save(form: FormData) {
    startTransition(async () => {
      const consent = !hasSaved || needsConsent ? form.get("consent") === "yes" : true;
      const result = await saveAcademicRecord(record, consent);
      if (result.ok) {
        forgetDraft();
        setHasSaved(true);
        setStatus({ tone: "info", title: "Saved", text: "Your classes and scores are saved to your account." });
      } else setStatus({ tone: "error", title: "Not saved", text: result.message });
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeAcademicRecord();
      if (result.ok) {
        forgetDraft();
        setHasSaved(false);
        setRows([]);
        setStart(EMPTY_RECORD.start);
        setWeights(EMPTY_RECORD.weights);
        setSatRaw("");
        setActRaw("");
        setVersion((v) => v + 1);
        setStatus({ tone: "info", title: "Removed", text: "Your saved classes and scores are deleted." });
      } else setStatus({ tone: "error", title: "Not removed", text: result.message });
    });
  }

  function applyToScholarships(value: number) {
    startTransition(async () => {
      const result = await setScholarshipGpa(value);
      setStatus(
        result.ok
          ? { tone: "info", title: "Scholarship GPA updated", text: `Scholarship matching now uses ${fixed(value)}.` }
          : { tone: "error", title: "Not updated", text: result.message },
      );
    });
  }

  return (
    <div key={version} className="space-y-12">
      <section aria-labelledby="classes-title">
        <h2 id="classes-title" className="text-lg font-bold">
          Your classes
        </h2>
        <p className="mt-2">
          Add each class with its grade. Leave the grade as “Not finished yet” for classes you’re taking now: those are
          the ones the “What grade do I need?” box works out.
        </p>

        <details className="mt-6 border border-border-subtle bg-surface px-4 py-1" open={start.credits > 0 || undefined}>
          <summary className="min-h-11 cursor-pointer py-2.5 font-bold">Start from a GPA I already know (optional)</summary>
          <p className="mt-2 text-sm text-muted">
            Use your report card GPA for earlier terms instead of typing every class. Then add only this term’s classes.
          </p>
          <div className="mt-4 mb-3 grid gap-4 sm:grid-cols-3">
            <NumberField
              id="start-unweighted"
              label="Unweighted GPA"
              defaultValue={start.unweighted}
              onValue={(v) => setStart((s) => ({ ...s, unweighted: v !== null && v >= 0 && v <= 5 ? v : null }))}
            />
            <NumberField
              id="start-weighted"
              label="Weighted GPA"
              defaultValue={start.weighted}
              onValue={(v) => setStart((s) => ({ ...s, weighted: v !== null && v >= 0 && v <= 5 ? v : null }))}
            />
            <NumberField
              id="start-credits"
              label="Credits it covers"
              defaultValue={start.credits || null}
              onValue={(v) => setStart((s) => ({ ...s, credits: v !== null && v >= 0 && v <= 80 ? v : 0 }))}
            />
          </div>
        </details>

        {rows.length === 0 ? (
          <div className="mt-6">
            <h3 className="font-bold">No classes yet</h3>
            <p className="mt-1">Add your first class to start working out your GPA.</p>
          </div>
        ) : (
          <ol className="mt-6 divide-y divide-border-subtle border-y border-border-subtle">
            {rows.map((r, i) => (
              <li key={r.id} className="py-4">
                <fieldset>
                  <legend className="sr-only">Class {i + 1}</legend>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_11.5rem_6rem] sm:items-end">
                    <div>
                      <label htmlFor={`name-${r.id}`} className="block font-bold">
                        Class {i + 1} (optional name)
                      </label>
                      <input
                        id={`name-${r.id}`}
                        defaultValue={r.name}
                        maxLength={80}
                        onChange={(e) => update(r.id, { name: e.target.value })}
                        className={control}
                      />
                    </div>
                    <div>
                      <label htmlFor={`type-${r.id}`} className="block font-bold">
                        Type
                      </label>
                      <select
                        id={`type-${r.id}`}
                        defaultValue={r.type}
                        onChange={(e) => update(r.id, { type: e.target.value as CourseType })}
                        className={control}
                      >
                        {COURSE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {TYPE_NAMES[t]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`grade-${r.id}`} className="block font-bold">
                        Grade
                      </label>
                      <select
                        id={`grade-${r.id}`}
                        defaultValue={r.grade ?? ""}
                        onChange={(e) => update(r.id, { grade: (e.target.value || null) as Course["grade"] })}
                        className={control}
                      >
                        <option value="">Not finished yet</option>
                        {[...GRADES].reverse().map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`credits-${r.id}`} className="block font-bold">
                        Credits
                      </label>
                      <input
                        id={`credits-${r.id}`}
                        type="number"
                        inputMode="decimal"
                        min={0.5}
                        max={5}
                        step={0.5}
                        defaultValue={r.credits}
                        onChange={(e) => update(r.id, { credits: Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0 })}
                        className={control}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRows((list) => list.filter((x) => x.id !== r.id))}
                    className={`mt-2 ${buttonClass("quiet")}`}
                  >
                    Remove class {i + 1}
                    {r.name ? ` (${r.name})` : ""}
                  </button>
                </fieldset>
              </li>
            ))}
          </ol>
        )}

        {rows.length < MAX_COURSES ? (
          <button type="button" onClick={addRow} className={`mt-6 ${buttonClass("secondary")}`}>
            Add a class
          </button>
        ) : (
          <p className="mt-6">That’s the most classes this tool holds ({MAX_COURSES}).</p>
        )}

        <details className="mt-6">
          <summary className="min-h-11 cursor-pointer py-2.5 font-bold">My school weights classes differently</summary>
          <p className="mt-2 text-sm text-muted">
            Points added to a class’s grade for the weighted GPA. Most schools add 0.5 for honors and 1.0 for AP, IB and
            dual enrollment. An F never gets extra points.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            {(["honors", "ap", "ib", "dual"] as const).map((t) => (
              <NumberField
                key={t}
                id={`weight-${t}`}
                label={TYPE_NAMES[t]}
                defaultValue={weights[t]}
                onValue={(v) => setWeights((w) => ({ ...w, [t]: v !== null && v >= 0 && v <= 1 ? v : 0 }))}
              />
            ))}
          </div>
        </details>
      </section>

      <section aria-labelledby="gpa-title" aria-live="polite">
        <h2 id="gpa-title" className="text-lg font-bold">
          Your GPA
        </h2>
        {unweighted === null || weighted === null ? (
          <p className="mt-2">Add a class with a grade, or a GPA you already know, to see your GPA.</p>
        ) : (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-6 sm:max-w-md">
              <div>
                <dt className="text-sm text-muted">Unweighted</dt>
                <dd className="text-xl font-bold tabular-nums">{fixed(unweighted)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Weighted</dt>
                <dd className="text-xl font-bold tabular-nums">{fixed(weighted)}</dd>
              </div>
            </dl>
            {signedIn &&
              (eligibilityOptedIn ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => applyToScholarships(Math.round(unweighted * 100) / 100)}
                  className={`mt-4 ${buttonClass("quiet")}`}
                >
                  Use {fixed(unweighted)} for scholarship matching
                </button>
              ) : (
                <p className="mt-4">
                  Want scholarships matched to your GPA? <Link href="/account/eligibility">Answer the scholarship questions</Link>.
                </p>
              ))}
          </>
        )}
        <p className="mt-4 text-sm text-muted">
          Grade points (A 4.0, A- 3.7, B+ 3.3 and so on) and class bonuses follow common U.S. high school practice. Check
          your school’s own scale.
        </p>
      </section>

      <section aria-labelledby="needed-title">
        <h2 id="needed-title" className="text-lg font-bold">
          What grade do I need?
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:items-end">
          <div>
            <label htmlFor="target" className="block font-bold">
              GPA you want to reach
            </label>
            <input
              id="target"
              inputMode="decimal"
              value={targetRaw}
              onChange={(e) => setTargetRaw(e.target.value)}
              aria-invalid={targetRaw !== "" && !targetOk ? true : undefined}
              aria-describedby={targetRaw !== "" && !targetOk ? "target-error" : undefined}
              className={targetRaw !== "" && !targetOk ? invalidControl : control}
            />
            {targetRaw !== "" && !targetOk && (
              <p id="target-error" className="mt-2 text-accent">
                Error: Enter a GPA from 0 to 5, like 3.5
              </p>
            )}
          </div>
          <fieldset>
            <legend className="font-bold">Which GPA</legend>
            <div className="mt-2 flex gap-6">
              {(["unweighted", "weighted"] as const).map((s) => (
                <label key={s} className="flex min-h-11 items-center gap-3">
                  <input
                    type="radio"
                    name="scale"
                    value={s}
                    checked={scale === s}
                    onChange={() => setScale(s)}
                    className="size-6 shrink-0"
                  />
                  <span>{s === "unweighted" ? "Unweighted" : "Weighted"}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div aria-live="polite" className="mt-4 space-y-2">
          {!hasUnfinished ? (
            <p>Add a class you’re taking now (grade “Not finished yet”) to see what you need in it.</p>
          ) : answer?.kind === "grade" ? (
            <p className="font-bold">
              To reach a {fixed(target as number)} {scale} GPA, you need about {article(answer.grade)} {answer.grade} in each
              class you haven’t finished.
            </p>
          ) : answer?.kind === "any" ? (
            <p className="font-bold">Any passing grade in the classes you haven’t finished gets you there.</p>
          ) : answer?.kind === "unreachable" ? (
            <p className="font-bold">
              Not reachable this term. The highest {scale} GPA you can get is {fixed(answer.best)}.
            </p>
          ) : (
            <p>Enter the GPA you want to reach.</p>
          )}
          {hasUnfinished && bestUnweighted !== null && bestWeighted !== null && (
            <p>
              With an A in every class you haven’t finished: {fixed(bestUnweighted)} unweighted, {fixed(bestWeighted)}{" "}
              weighted.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="tests-title">
        <h2 id="tests-title" className="text-lg font-bold">
          Test scores
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ScoreField id="sat" label="SAT total (optional)" hint="400 to 1600" raw={satRaw} ok={satOk} onRaw={setSatRaw}
            error="Enter an SAT total from 400 to 1600, in steps of 10" />
          <ScoreField id="act" label="ACT composite (optional)" hint="1 to 36" raw={actRaw} ok={actOk} onRaw={setActRaw}
            error="Enter an ACT composite from 1 to 36" />
        </div>
        <div aria-live="polite" className="mt-4 space-y-2">
          {satOk && (
            <p>
              {satToAct(sat as number) === null
                ? "The official table doesn’t convert SAT scores below 590."
                : `Your ${sat} SAT is about a ${satToAct(sat as number)} ACT.`}{" "}
              <Link href={`/colleges?sat=${sat}`}>See where your SAT falls at each college</Link>
            </p>
          )}
          {actOk && (
            <p>
              {actToSat(act as number) === null
                ? "The official table doesn’t convert ACT scores below 9."
                : `Your ${act} ACT is about a ${actToSat(act as number)} SAT.`}{" "}
              <Link href={`/colleges?act=${act}`}>See where your ACT falls at each college</Link>
            </p>
          )}
        </div>
        <p className="mt-4 text-sm text-muted">{CONCORDANCE_SOURCE}</p>
      </section>

      <section aria-labelledby="save-title" className="border-t border-border-subtle pt-8">
        <h2 id="save-title" className="text-lg font-bold">
          Save your classes and scores
        </h2>
        {signedIn ? (
          <>
            <form action={save} className="mt-4 space-y-4">
              <p>
                Saved to your account so they’re here next time, and your SAT or ACT shows on every college page. Never
                shown to anyone or shared. Deleted with your account, and if you don’t sign in for 12 months.
              </p>
              {(!hasSaved || needsConsent) && (
                <label className="flex items-start gap-3">
                  <input type="checkbox" name="consent" value="yes" className="mt-0.5 size-6 shrink-0" />
                  <span>
                    It’s OK for Stepwell to save my classes, grades and scores. I can change or delete them any time.
                  </span>
                </label>
              )}
              <button type="submit" disabled={pending} aria-busy={pending || undefined} className={buttonClass("primary")}>
                {pending ? "Saving" : hasSaved ? "Save changes" : "Save to my account"}
              </button>
            </form>
            {hasSaved && (
              <div className="mt-8">
                <p>Deletes your saved classes, grades and scores right away.</p>
                <button type="button" disabled={pending} onClick={remove} className={`mt-4 ${buttonClass("delete")}`}>
                  Remove my grades and scores
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="mt-4">
            <Link href="/sign-in?next=%2Fgpa">Sign in to save them</Link>. Until then they stay in this browser only.
          </p>
        )}
        {status && (
          <ResultPanel title={status.title} tone={status.tone}>
            <p role="status">{status.text}</p>
          </ResultPanel>
        )}
      </section>
    </div>
  );
}

function NumberField({
  id,
  label,
  defaultValue,
  onValue,
}: {
  id: string;
  label: string;
  defaultValue: number | null;
  onValue: (value: number | null) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        defaultValue={defaultValue ?? ""}
        onChange={(e) => {
          const v = parse(e.target.value);
          onValue(v === null || Number.isNaN(v) ? null : v);
        }}
        className={control}
      />
    </div>
  );
}

function ScoreField(props: { id: string; label: string; hint: string; raw: string; ok: boolean; error: string; onRaw: (raw: string) => void }) {
  const bad = props.raw.trim() !== "" && !props.ok;
  return (
    <div>
      <label htmlFor={props.id} className="block font-bold">
        {props.label}
      </label>
      <p id={`${props.id}-hint`} className="mt-1 text-sm text-muted">
        {props.hint}
      </p>
      <input
        id={props.id}
        inputMode="numeric"
        value={props.raw}
        onChange={(e) => props.onRaw(e.target.value)}
        aria-invalid={bad || undefined}
        aria-describedby={bad ? `${props.id}-hint ${props.id}-error` : `${props.id}-hint`}
        className={bad ? invalidControl : control}
      />
      {bad && (
        <p id={`${props.id}-error`} className="mt-2 text-accent">
          Error: {props.error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useActionState, useMemo } from "react";
import { ErrorSummary, RadioGroup, ResultPanel, SubmitButton, TextField, type SummaryItem } from "@/components/form";
import { FIELDS } from "@/lib/scholarships/labels";
import { removeEligibility, saveEligibility } from "./actions";
import { initialEligibilityState } from "./state";

export type SavedAnswers = {
  gpa: number | null;
  intended_fields: string[] | null;
  first_generation: string | null;
  citizenship: string | null;
  military_family: string | null;
  plans_fafsa: string | null;
} | null;

const PREFER_NOT = { value: "prefer_not", label: "Prefer not to say" };
const YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, PREFER_NOT];

/**
 * The optional eligibility questions (decision 0006, first set only). Every
 * question says why it's asked and can be skipped; a blank answer never
 * hides a scholarship.
 */
export function EligibilityForm({ saved, needsConsent }: { saved: SavedAnswers; needsConsent: boolean }) {
  const [state, save] = useActionState(saveEligibility, initialEligibilityState);
  const [removeState, remove] = useActionState(removeEligibility, initialEligibilityState);
  const summary = useMemo<SummaryItem[]>(
    () => Object.entries(state.errors).map(([field, message]) => ({ fieldId: field === "form" ? undefined : field, message })),
    [state],
  );

  if (removeState.removed) {
    return (
      <ResultPanel title="Your answers are deleted" autoFocus>
        <p>Scholarships will show without match labels. You can answer again any time.</p>
      </ResultPanel>
    );
  }

  const answered = (value: string | null) => value ?? (saved ? "prefer_not" : undefined);

  return (
    <>
      {state.saved && (
        <ResultPanel title="Answers saved" autoFocus>
          <p>
            <a href="/scholarships">See your scholarship matches</a>
          </p>
        </ResultPanel>
      )}
      <form action={save} className="mt-8 space-y-8" noValidate>
        <ErrorSummary items={summary} />

        <TextField
          id="gpa"
          label="Your GPA (optional)"
          hint="As it appears on your report card. Some programs have a minimum GPA. Leave blank if you'd rather not say."
          inputMode="decimal"
          defaultValue={saved?.gpa ?? ""}
          error={state.errors.gpa}
        />

        <fieldset aria-describedby="fields-hint">
          <legend className="font-bold">Fields you might study (optional)</legend>
          <p id="fields-hint" className="mt-1 text-sm text-muted">
            Some programs are for certain majors. Choose up to 5, or none.
          </p>
          <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
            {FIELDS.map((f, i) => (
              <label key={f.value} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  id={i === 0 ? "fields" : undefined}
                  name="fields"
                  value={f.value}
                  defaultChecked={saved?.intended_fields?.includes(f.value)}
                  className="size-6 shrink-0"
                />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
          {state.errors.fields && <p className="mt-2 text-accent">Error: {state.errors.fields}</p>}
        </fieldset>

        <RadioGroup
          name="first_generation"
          legend="Would you be the first in your family to go to college? (optional)"
          hint="Some programs are for first-generation students."
          options={YES_NO}
          defaultValue={answered(saved?.first_generation ?? null)}
        />

        <RadioGroup
          name="citizenship"
          legend="Citizenship (optional)"
          hint="Many government programs are only for U.S. citizens or eligible noncitizens (such as permanent residents)."
          options={[
            { value: "citizen", label: "U.S. citizen" },
            { value: "eligible_noncitizen", label: "Permanent resident or other eligible noncitizen" },
            { value: "other", label: "Neither of these" },
            PREFER_NOT,
          ]}
          defaultValue={answered(saved?.citizenship ?? null)}
        />

        <RadioGroup
          name="military_family"
          legend="Has a parent or guardian served in the U.S. military? (optional)"
          hint="Some programs are for children of veterans or service members."
          options={YES_NO}
          defaultValue={answered(saved?.military_family ?? null)}
        />

        <RadioGroup
          name="plans_fafsa"
          legend="Do you plan to file the FAFSA? (optional)"
          hint="The FAFSA is the free federal aid form. Many grants need it (or your state's version)."
          options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unsure", label: "Not sure yet" }, PREFER_NOT]}
          defaultValue={answered(saved?.plans_fafsa ?? null)}
        />

        {(needsConsent || !saved) && (
          <div>
            <label className="flex items-start gap-3">
              <input type="checkbox" id="consent" name="consent" value="yes" className="mt-0.5 size-6 shrink-0" />
              <span>
                It’s OK for Stepwell to save these answers and use them only to match me with scholarships. I can
                change or delete them any time.
              </span>
            </label>
            {state.errors.consent && <p className="mt-2 text-accent">Error: {state.errors.consent}</p>}
          </div>
        )}
        {saved && !needsConsent && <input type="hidden" name="consent" value="yes" />}

        <SubmitButton pendingLabel="Saving">{saved ? "Save changes" : "Save my answers"}</SubmitButton>
      </form>

      {saved && (
        <form action={remove} className="mt-10 border-t border-border-subtle pt-6">
          <h2 className="text-lg font-bold">Remove my answers</h2>
          <p className="mt-2">Deletes every answer above right away. Scholarships will show without match labels.</p>
          {removeState.errors.form && <p className="mt-2 text-accent">Error: {removeState.errors.form}</p>}
          <div className="mt-4">
            <SubmitButton variant="delete" pendingLabel="Removing">
              Remove my answers
            </SubmitButton>
          </div>
        </form>
      )}
    </>
  );
}

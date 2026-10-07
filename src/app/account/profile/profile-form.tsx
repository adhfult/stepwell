"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  ErrorSummary,
  FieldError,
  RadioGroup,
  SelectField,
  SubmitButton,
  TextField,
  type SummaryItem,
} from "@/components/form";
import { gradYearLabel, STAGES, STATES } from "@/lib/profile/options";
import { saveProfile } from "./actions";
import type { ProfileState, ProfileValues } from "./state";

/** Summary order follows the form; stage links to its first radio (id="stage"). */
const fields = ["nickname", "stage", "state", "county", "gradYear"] as const;

function summaryItems(state: ProfileState): SummaryItem[] {
  const items: SummaryItem[] = state.formError ? [{ message: state.formError }] : [];
  for (const field of fields) {
    const message = state.fieldErrors[field];
    if (message) items.push({ fieldId: field, message });
  }
  return items;
}

type Option = { value: string; label: string };

/** `counties` belong to the saved state (the page loads them); another state needs a save first. */
export function ProfileForm({
  initialValues,
  thisYear,
  counties,
}: {
  initialValues: ProfileValues;
  thisYear: number;
  counties: Option[];
}) {
  const [state, formAction] = useActionState(saveProfile, {
    status: "idle",
    fieldErrors: {},
    values: initialValues,
  } satisfies ProfileState);
  const errors = useMemo(() => summaryItems(state), [state]);

  // Which stage is picked right now, to word (or hide) the graduation question.
  const [stage, setStage] = useState(state.values.stage);
  const yearLabel = gradYearLabel(stage);
  const [chosenState, setChosenState] = useState(state.values.state);
  const countiesHere = chosenState === initialValues.state && counties.length > 0;
  const years = useMemo(
    () => Array.from({ length: 10 }, (_, i) => String(thisYear - 1 + i)).map((year) => ({ value: year, label: year })),
    [thisYear],
  );

  return (
    <form action={formAction} noValidate className="mt-8 space-y-6">
      <ErrorSummary items={errors} />

      {state.status === "saved" && (
        <p role="status" className="border border-border-subtle bg-surface p-4">
          Profile saved. <Link href="/account">Back to your account</Link>
        </p>
      )}

      <TextField
        id="nickname"
        label="What should we call you? (optional)"
        hint="A first name or nickname is fine."
        autoComplete="nickname"
        maxLength={40}
        defaultValue={state.values.nickname}
        error={state.fieldErrors.nickname}
      />

      <RadioGroup
        name="stage"
        legend="Where are you in school?"
        options={STAGES}
        defaultValue={state.values.stage}
        onValueChange={setStage}
        error={state.fieldErrors.stage}
      />

      <div>
        <SelectField
          id="state"
          label="Which state do you live in?"
          placeholder="Choose"
          options={[...STATES]}
          required
          invalid={Boolean(state.fieldErrors.state)}
          describedById={state.fieldErrors.state ? "state-error" : undefined}
          defaultValue={state.values.state}
          onChange={(e) => setChosenState(e.target.value)}
        />
        <FieldError id="state-error" message={state.fieldErrors.state} />
      </div>

      <div>
        {countiesHere ? (
          <>
            <SelectField
              id="county"
              label="Which county do you live in? (optional)"
              placeholder="Not set"
              options={counties}
              invalid={Boolean(state.fieldErrors.county)}
              describedById={`county-hint${state.fieldErrors.county ? " county-error" : ""}`}
              defaultValue={state.values.county}
            />
            <FieldError id="county-error" message={state.fieldErrors.county} />
          </>
        ) : (
          <p className="font-bold">Which county do you live in? (optional)</p>
        )}
        <p id="county-hint" className="mt-2 text-sm text-muted">
          {countiesHere
            ? "Shows scholarships from foundations near you. Only you can see it."
            : chosenState
              ? "Save your state first, then pick your county here."
              : "Choose your state first."}
        </p>
      </div>

      {/* Not asked for adult learners; the server clears it for them anyway. */}
      {yearLabel && (
        <div>
          <SelectField
            id="gradYear"
            label={`${yearLabel} (optional)`}
            placeholder="Not sure yet"
            options={years}
            invalid={Boolean(state.fieldErrors.gradYear)}
            describedById={state.fieldErrors.gradYear ? "gradYear-error" : undefined}
            defaultValue={state.values.gradYear}
          />
          <FieldError id="gradYear-error" message={state.fieldErrors.gradYear} />
        </div>
      )}

      <SubmitButton pendingLabel="Saving">Save profile</SubmitButton>
    </form>
  );
}

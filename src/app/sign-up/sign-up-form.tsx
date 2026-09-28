"use client";

import { useActionState, useMemo } from "react";
import { ErrorSummary, FieldError, SelectField, SubmitButton, TextField, type SummaryItem } from "@/components/form";
import { signUp } from "./actions";
import { CheckEmailMessage, NotEligibleMessage } from "./messages";
import { initialSignUpState, type SignUpState } from "./state";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
].map((label, index) => ({ value: String(index + 1), label }));

/** Where each error's summary link sends focus. */
const fieldIds = { email: "email", password: "password", birthDate: "birthMonth" } as const;

function summaryItems(state: SignUpState): SummaryItem[] {
  const fieldItems = (Object.keys(fieldIds) as (keyof typeof fieldIds)[]).flatMap((field) => {
    const message = state.fieldErrors[field];
    return message ? [{ fieldId: fieldIds[field], message }] : [];
  });
  return state.formError ? [{ message: state.formError }, ...fieldItems] : fieldItems;
}

/**
 * The sign-up form. The birth month and year are asked neutrally (decision
 * 0005): no age limit is mentioned, both menus start empty, and the year list
 * includes recent years so it doesn't hint at a cutoff.
 */
export function SignUpForm({ thisYear }: { thisYear: number }) {
  const [state, formAction] = useActionState(signUp, initialSignUpState);
  const errors = useMemo(() => summaryItems(state), [state]);
  const years = useMemo(
    () => Array.from({ length: 101 }, (_, i) => String(thisYear - i)).map((year) => ({ value: year, label: year })),
    [thisYear],
  );
  const birthError = state.fieldErrors.birthDate;

  if (state.status === "check-email") return <CheckEmailMessage email={state.values.email} />;
  if (state.status === "not-eligible") return <NotEligibleMessage />;

  return (
    // noValidate: the server checks everything and shows errors in one consistent way.
    <form action={formAction} noValidate className="mt-8 space-y-6">
      <ErrorSummary items={errors} />

      <TextField
        id="email"
        label="Email address"
        type="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={state.values.email}
        error={state.fieldErrors.email}
      />

      <TextField
        id="password"
        label="Password"
        hint="At least 8 characters."
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors.password}
      />

      <fieldset aria-describedby={birthError ? "birth-hint birth-error" : "birth-hint"}>
        <legend className="font-bold">What month and year were you born?</legend>
        <p id="birth-hint" className="mt-1 text-sm text-muted">
          We don’t save this.
        </p>
        <div className="mt-2 flex gap-4">
          <SelectField
            id="birthMonth"
            label="Month"
            placeholder="Choose"
            options={months}
            required
            invalid={Boolean(birthError)}
            describedById={birthError ? "birth-error" : undefined}
            defaultValue={state.values.birthMonth}
          />
          <SelectField
            id="birthYear"
            label="Year"
            placeholder="Choose"
            options={years}
            required
            invalid={Boolean(birthError)}
            describedById={birthError ? "birth-error" : undefined}
            defaultValue={state.values.birthYear}
          />
        </div>
        <FieldError id="birth-error" message={birthError} />
      </fieldset>

      <SubmitButton pendingLabel="Creating account">Create account</SubmitButton>
    </form>
  );
}

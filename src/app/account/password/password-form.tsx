"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";
import { ErrorSummary, ResultPanel, SubmitButton, TextField, type SummaryItem } from "@/components/form";
import { setPassword } from "./actions";
import { initialSetPasswordState } from "./state";

export function SetPasswordForm() {
  const [state, formAction] = useActionState(setPassword, initialSetPasswordState);
  const errors = useMemo<SummaryItem[]>(
    () => [
      ...(state.formError ? [{ message: state.formError }] : []),
      ...(state.passwordError ? [{ fieldId: "password", message: state.passwordError }] : []),
    ],
    [state],
  );

  if (state.status === "saved") {
    return (
      <ResultPanel title="Password changed" autoFocus>
        <p>You’re still signed in here. Any other devices will be signed out within the hour.</p>
        <p>
          <Link href="/account">Go to your account</Link>
        </p>
      </ResultPanel>
    );
  }

  return (
    <form action={formAction} noValidate className="mt-8 space-y-6">
      <ErrorSummary items={errors} />
      <TextField
        id="password"
        label="New password"
        hint="At least 8 characters."
        type="password"
        autoComplete="new-password"
        required
        error={state.passwordError}
      />
      <SubmitButton pendingLabel="Saving">Save new password</SubmitButton>
    </form>
  );
}

"use client";

import { useActionState, useMemo } from "react";
import { ErrorSummary, SubmitButton, TextField, type SummaryItem } from "@/components/form";
import { deleteAccount } from "./actions";
import { initialDeleteAccountState } from "./state";

export function DeleteAccountForm() {
  const [state, formAction] = useActionState(deleteAccount, initialDeleteAccountState);
  const errors = useMemo<SummaryItem[]>(
    () => [
      ...(state.formError ? [{ message: state.formError }] : []),
      ...(state.passwordError ? [{ fieldId: "password", message: state.passwordError }] : []),
    ],
    [state],
  );

  return (
    <form action={formAction} noValidate className="mt-8 space-y-6">
      <ErrorSummary items={errors} />
      <TextField
        id="password"
        label="Your password"
        hint="To make sure it’s really you."
        type="password"
        autoComplete="current-password"
        required
        error={state.passwordError}
      />
      <SubmitButton variant="delete" pendingLabel="Deleting">
        Delete my account
      </SubmitButton>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";
import { ErrorSummary, ResultPanel, SubmitButton, TextField, type SummaryItem } from "@/components/form";
import { requestPasswordReset } from "./actions";
import { initialForgotPasswordState } from "./state";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initialForgotPasswordState);
  const errors = useMemo<SummaryItem[]>(
    () => [
      ...(state.formError ? [{ message: state.formError }] : []),
      ...(state.emailError ? [{ fieldId: "email", message: state.emailError }] : []),
    ],
    [state],
  );

  if (state.status === "sent") {
    return (
      <ResultPanel title="Check your email">
        <p>
          If <strong className="break-all">{state.email}</strong> has a Stepwell account, we sent it a link to choose
          a new password.
        </p>
        <p className="text-sm text-muted">
          No email after a few minutes? Check your spam or junk folder, or <Link href="/sign-up">create an account</Link>{" "}
          if you don’t have one yet.
        </p>
      </ResultPanel>
    );
  }

  return (
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
        defaultValue={state.email}
        error={state.emailError}
      />
      <SubmitButton pendingLabel="Sending">Send reset link</SubmitButton>
    </form>
  );
}

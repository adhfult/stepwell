"use client";

import { useActionState, useMemo } from "react";
import { ErrorSummary, SubmitButton, TextField, type SummaryItem } from "@/components/form";
import { Turnstile } from "@/components/turnstile";
import { signIn } from "./actions";
import { initialSignInState, type SignInState } from "./state";

function summaryItems(state: SignInState): SummaryItem[] {
  const items: SummaryItem[] = [];
  if (state.formError) items.push({ message: state.formError });
  if (state.fieldErrors.email) items.push({ fieldId: "email", message: state.fieldErrors.email });
  if (state.fieldErrors.password) items.push({ fieldId: "password", message: state.fieldErrors.password });
  return items;
}

/** `next` is where to go after signing in; the page has already checked it. */
export function SignInForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signIn, initialSignInState);
  const errors = useMemo(() => summaryItems(state), [state]);

  return (
    <form action={formAction} noValidate className="mt-8 space-y-6">
      <ErrorSummary items={errors} />
      <input type="hidden" name="next" value={next} />

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
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors.password}
      />

      <Turnstile resetKey={state} />
      <SubmitButton pendingLabel="Signing in">Sign in</SubmitButton>
    </form>
  );
}

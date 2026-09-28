"use client";

import { useActionState } from "react";
import { ResultPanel, SubmitButton } from "@/components/form";
import { confirmLink } from "./actions";
import { LinkHelp } from "./link-help";
import { linkKinds, type LinkKind } from "./link-kinds";
import { initialConfirmState } from "./state";

/**
 * The button that uses the email link. On success the action redirects; on
 * failure the error replaces the intro and button, so only what to do next
 * is left on screen.
 */
export function ConfirmForm({ kind, tokenHash, next }: { kind: LinkKind; tokenHash: string; next: string }) {
  const [state, formAction] = useActionState(confirmLink, initialConfirmState);
  const copy = linkKinds[kind];

  if (state.error) {
    return (
      <ResultPanel title={state.error} tone="error" autoFocus>
        <LinkHelp kind={kind} />
      </ResultPanel>
    );
  }

  return (
    <>
      <p className="mt-4">{copy.intro}</p>
      <form action={formAction} className="mt-8">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={kind} />
        <input type="hidden" name="next" value={next} />
        <SubmitButton pendingLabel={copy.pending}>{copy.button}</SubmitButton>
      </form>
    </>
  );
}

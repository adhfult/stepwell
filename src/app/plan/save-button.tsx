"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/form";
import { type SavableKind, toggleSaved } from "./actions";
import { initialActionState } from "./state";

/**
 * Quiet (link-style) save in lists, so each row keeps one main link (DESIGN.md
 * "Quiet" buttons). On the plan page itself (`inPlan`) it's just "Remove from plan".
 */
export function SaveButton({
  kind,
  id,
  saved,
  inPlan = false,
}: {
  kind: SavableKind;
  id: string | number;
  saved: boolean;
  inPlan?: boolean;
}) {
  const [state, action] = useActionState(toggleSaved, initialActionState);
  return (
    <form action={action} className="mt-1">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={saved ? "remove" : "save"} />
      <div className="flex flex-wrap items-center gap-x-4">
        {saved && !inPlan && <span className="font-bold text-primary">Saved to your plan</span>}
        <SubmitButton variant="quiet" pendingLabel={saved ? "Removing" : "Saving"}>
          {inPlan ? "Remove from plan" : saved ? "Remove" : "Save to my plan"}
        </SubmitButton>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-accent">
          Error: {state.error}
        </p>
      )}
    </form>
  );
}

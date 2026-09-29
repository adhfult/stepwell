"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/form";
import { toggleSaved } from "./actions";
import { initialActionState } from "./state";

/** "Save to my plan", or "Saved" with a way to remove it (same look as saving a career). */
export function SaveButton({ kind, id, saved }: { kind: "scholarship" | "college"; id: string | number; saved: boolean }) {
  const [state, action] = useActionState(toggleSaved, initialActionState);
  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={saved ? "remove" : "save"} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {saved && <span className="text-sm font-bold text-primary">Saved to your plan</span>}
        <SubmitButton variant="secondary" pendingLabel={saved ? "Removing" : "Saving"}>
          {saved ? "Remove" : "Save to my plan"}
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

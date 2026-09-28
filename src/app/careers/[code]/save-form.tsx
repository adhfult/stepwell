"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/form";
import { toggleSavedCareer } from "./actions";
import { initialSaveState } from "./state";

/** "Save career", or "Saved" with a way to remove it (DESIGN.md "Tags": Saved in primary text). */
export function SaveCareerForm({ code, saved }: { code: string; saved: boolean }) {
  const [state, action] = useActionState(toggleSavedCareer, initialSaveState);

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="onet_code" value={code} />
      <input type="hidden" name="intent" value={saved ? "remove" : "save"} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {saved && <span className="text-sm font-bold text-primary">Saved</span>}
        <SubmitButton variant={saved ? "secondary" : "primary"} pendingLabel={saved ? "Removing" : "Saving"}>
          {saved ? "Remove from saved" : "Save career"}
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

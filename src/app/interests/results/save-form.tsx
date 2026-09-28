"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/form";
import type { Scores } from "@/lib/interests/scoring";
import { removeInterestResults, saveInterestResults } from "../actions";
import { initialSaveState } from "../state";

/** "Save to my account", or "Saved" with a way to remove them. */
export function SaveResultsForm({ scores, saved }: { scores: Scores; saved: boolean }) {
  const [saveState, save] = useActionState(saveInterestResults, initialSaveState);
  const [removeState, remove] = useActionState(removeInterestResults, initialSaveState);
  const error = saved ? removeState.error : saveState.error;

  return (
    <form action={saved ? remove : save} className="mt-6">
      <input type="hidden" name="r" value={scores.realistic} />
      <input type="hidden" name="i" value={scores.investigative} />
      <input type="hidden" name="a" value={scores.artistic} />
      <input type="hidden" name="s" value={scores.social} />
      <input type="hidden" name="e" value={scores.enterprising} />
      <input type="hidden" name="c" value={scores.conventional} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {saved && <span className="text-sm font-bold text-primary">Saved to your account</span>}
        <SubmitButton variant={saved ? "secondary" : "primary"} pendingLabel={saved ? "Removing" : "Saving"}>
          {saved ? "Remove my results" : "Save to my account"}
        </SubmitButton>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-accent">
          Error: {error}
        </p>
      )}
    </form>
  );
}

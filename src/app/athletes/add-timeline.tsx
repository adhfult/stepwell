"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { buttonClass } from "@/components/button-styles";
import type { Assoc } from "@/lib/athletes/rules";
import { addTimeline } from "./actions";

/** Adds this level's timeline steps to the student's plan; running it again adds nothing twice. */
export function AddTimeline({ assoc }: { assoc: Assoc }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof addTimeline>> | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await addTimeline(assoc)))}
        className={buttonClass("secondary")}
      >
        {pending ? "Adding" : "Add these steps to my plan"}
      </button>
      <p className="mt-4" role="status">
        {result?.ok === false && result.message}
        {result?.ok && result.added === 0 && (
          <>
            These steps are already in <Link href="/plan">your plan</Link>.
          </>
        )}
        {result?.ok && result.added > 0 && (
          <>
            Added {result.added} {result.added === 1 ? "step" : "steps"} to <Link href="/plan">your plan</Link>.
          </>
        )}
      </p>
    </div>
  );
}

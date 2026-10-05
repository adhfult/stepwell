"use client"; // Error boundaries must be Client Components

import { Page, PageTitle } from "@/components/page";
import { buttonClass } from "@/components/button-styles";
import { ResultPanel } from "@/components/form";

/** Shown if the athletes page fails to load (DESIGN.md "States"). */
export default function AthletesError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Page>
      <PageTitle>Playing a sport in college</PageTitle>
      <ResultPanel title="We couldn’t load this page" tone="error">
        <p>Check your internet connection, then try again.</p>
        <button type="button" onClick={() => retry()} className={buttonClass()}>
          Try again
        </button>
      </ResultPanel>
    </Page>
  );
}

"use client"; // Error boundaries must be Client Components

import { Page, PageTitle } from "@/components/page";
import { buttonClass } from "@/components/button-styles";
import { ResultPanel } from "@/components/form";

/** Shown if career search or a career page fails to load (DESIGN.md "States"). */
export default function CareersError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Page>
      <PageTitle>Careers</PageTitle>
      <ResultPanel title="We couldn’t load careers" tone="error">
        <p>Check your internet connection, then try again.</p>
        <button type="button" onClick={() => retry()} className={buttonClass()}>
          Try again
        </button>
      </ResultPanel>
    </Page>
  );
}

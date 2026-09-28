"use client"; // Error boundaries must be Client Components

import { Page, PageTitle } from "@/components/page";
import { buttonClass } from "@/components/button-styles";
import { ResultPanel } from "@/components/form";

/**
 * Shown if the account page fails to load (DESIGN.md "States": plain words,
 * a way to recover, never technical details). retry() fetches the page again.
 */
export default function AccountError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Page>
      <PageTitle>Your account</PageTitle>
      <ResultPanel title="We couldn’t load your account" tone="error">
        <p>Check your internet connection, then try again.</p>
        <button
          type="button"
          onClick={() => retry()}
          className={buttonClass()}
        >
          Try again
        </button>
      </ResultPanel>
    </Page>
  );
}

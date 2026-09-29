import type { ReactNode } from "react";
import { Page, PageTitle } from "./page";

/** Reading-width page for Terms and Privacy (legal-pages spec): section headings text-lg. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <Page>
      <PageTitle>{title}</PageTitle>
      <p className="mt-3 text-sm text-muted">Last updated: {updated}</p>
      <div className="mt-6 space-y-4 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
        {children}
      </div>
    </Page>
  );
}

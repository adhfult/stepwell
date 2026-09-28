import type { Metadata } from "next";
import { Page, PageTitle } from "@/components/page";
import { ResultPanel } from "@/components/form";
import { ConfirmForm } from "./confirm-form";
import { LinkHelp } from "./link-help";
import { isLinkKind, linkKinds } from "./link-kinds";

// Links here carry a one-time token: keep them out of search results.
export const metadata: Metadata = { title: "Check your link", robots: { index: false } };

/**
 * Where email links land. Visiting this page changes nothing; only pressing
 * the button uses the link (see actions.ts), so email scanners that open
 * links automatically can't use it up.
 */
export default async function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const next = typeof params.next === "string" ? params.next : "";
  const kind = isLinkKind(params.type) ? params.type : null;

  if (!kind || !tokenHash) {
    return (
      <Page width="form">
        <PageTitle>Check your link</PageTitle>
        <ResultPanel title="This link isn’t complete" tone="error">
          <p>It may have been cut off when it was copied. Open the link straight from the email instead.</p>
          <LinkHelp kind={kind ?? "email"} />
        </ResultPanel>
      </Page>
    );
  }

  const copy = linkKinds[kind];
  return (
    <Page width="form">
      <PageTitle>{copy.title}</PageTitle>
      <ConfirmForm kind={kind} tokenHash={tokenHash} next={next} />
    </Page>
  );
}

import type { Metadata } from "next";
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
      <div className="mx-auto max-w-md px-6 py-12 lg:py-16">
        <h1 className="text-2xl font-bold sm:text-3xl">Check your link</h1>
        <ResultPanel title="This link isn’t complete" tone="error">
          <p>It may have been cut off when it was copied. Open the link straight from the email instead.</p>
          <LinkHelp kind={kind ?? "email"} />
        </ResultPanel>
      </div>
    );
  }

  const copy = linkKinds[kind];
  return (
    <div className="mx-auto max-w-md px-6 py-12 lg:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">{copy.title}</h1>
      <p className="mt-4">{copy.intro}</p>
      <ConfirmForm kind={kind} tokenHash={tokenHash} next={next} />
    </div>
  );
}

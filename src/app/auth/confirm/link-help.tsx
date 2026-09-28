import Link from "next/link";
import type { LinkKind } from "./link-kinds";

/** What to do when an email link is broken, expired or already used. */
export function LinkHelp({ kind }: { kind: LinkKind }) {
  if (kind === "recovery") {
    return (
      <p>
        <Link href="/forgot-password">Ask for a new reset email</Link> and use the newest one.
      </p>
    );
  }
  return (
    <>
      <p>
        If you already confirmed your email, <Link href="/sign-in">sign in</Link>.
      </p>
      <p>
        If not, <Link href="/sign-up">sign up again</Link> with the same email address to get a new link.
      </p>
    </>
  );
}

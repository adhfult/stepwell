import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageTitle } from "@/components/page";
import { requireUser } from "@/lib/auth/dal";
import { getMyEligibility } from "@/lib/scholarships/data";
import { CONSENT_VERSION } from "@/lib/scholarships/labels";
import { EligibilityForm } from "./eligibility-form";

export const metadata: Metadata = { title: "Scholarship matching" };

export default async function EligibilityPage() {
  await requireUser("/account/eligibility");
  const saved = await getMyEligibility();

  return (
    <Page>
      <p>
        <Link href="/account" className="inline-flex min-h-11 items-center">
          Back to your account
        </Link>
      </p>
      <PageTitle>Scholarship matching</PageTitle>

      {/* The opt-in explanation (decision 0006): what's asked, why, how it's used, how to remove it. */}
      <div className="mt-6 space-y-3 border border-border-subtle bg-surface p-4 lg:p-6">
        <h2 className="text-lg font-bold">Before you answer</h2>
        <p>
          A few optional questions help Stepwell show which scholarships you qualify for. Skip any question: a blank
          answer never hides a scholarship, it just says what to check.
        </p>
        <p>
          Your answers are saved to your account and used only for matching. They’re never shown to anyone, never
          shared, and never sent to other companies. Your state and school stage come from your profile.
        </p>
        <p>
          You can change or remove your answers any time on this page. They’re deleted with your account, and
          automatically if you don’t sign in for 12 months.
        </p>
      </div>

      <EligibilityForm
        saved={saved ? { ...saved, gpa: saved.gpa === null ? null : Number(saved.gpa) } : null}
        needsConsent={Boolean(saved && saved.consent_version < CONSENT_VERSION)}
      />
    </Page>
  );
}

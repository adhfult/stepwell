import type { Metadata } from "next";
import { Band, Page, PageTitle } from "@/components/page";
import { getCurrentUser } from "@/lib/auth/dal";
import { getMyAcademicRecord } from "@/lib/gpa/data";
import { CONSENT_VERSION } from "@/lib/gpa/record";
import { getMyEligibility } from "@/lib/scholarships/data";
import { GpaTool } from "./gpa-tool";

export const metadata: Metadata = { title: "GPA and test scores" };

export default async function GpaPage() {
  const [user, saved, eligibility] = await Promise.all([getCurrentUser(), getMyAcademicRecord(), getMyEligibility()]);

  return (
    <>
      <Band>
        <PageTitle>GPA and test scores</PageTitle>
        <p className="mt-4 max-w-2xl">
          Work out your unweighted and weighted GPA, the grade you need this term to reach a goal, and how your SAT or
          ACT compares at colleges.
        </p>
      </Band>
      <Page width="browse">
        <GpaTool
          saved={saved}
          signedIn={Boolean(user)}
          needsConsent={Boolean(saved && saved.consentVersion < CONSENT_VERSION)}
          eligibilityOptedIn={Boolean(eligibility)}
        />
      </Page>
    </>
  );
}

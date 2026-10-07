import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal/details";

export const metadata: Metadata = { title: "Terms of Service" };

/** From docs/legal/terms-draft.md; keep the two in step. */
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={LEGAL.effectiveDate}>
      <p>These are the rules for using Stepwell, an independent project. By creating an account, you agree to them.</p>

      <h2>Who can use Stepwell</h2>
      <p>You need to be 13 or older and give your real age range when you sign up.</p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your password to yourself. One person per account.</li>
        <li>You’re responsible for what happens in your account. If you think someone else got in, reset your password.</li>
        <li>You can delete your account anytime from your account page.</li>
      </ul>

      <h2>Using Stepwell fairly</h2>
      <p>Don’t:</p>
      <ul>
        <li>try to get into other people’s accounts or information;</li>
        <li>attack, overload or copy Stepwell with bots or scripts;</li>
        <li>pretend to be someone else.</li>
      </ul>
      <p>We may close accounts that break these rules.</p>

      <h2>About the information on Stepwell</h2>
      <p>
        Career, program and college information comes from official U.S. government sources such as O*NET (U.S.
        Department of Labor) and College Scorecard (U.S. Department of Education). Scholarship listings come from
        official state, federal and private program pages, and internship postings from USAJOBS (U.S. Office of Personnel
        Management); both can change at any time, so always check the official page before you apply. All of it can be out of date or incomplete, and it’s a starting point, not a promise about any job,
        school, award or cost. Check important details with the school or program, and talk with a counselor or a
        trusted adult.
      </p>

      <h2>Changes and availability</h2>
      <p>
        Stepwell is free and offered as it is. We may change it, pause it or stop it. If we change these terms, we’ll
        update this page and the date at the top.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: {LEGAL.contactEmail}. These terms follow the laws of {LEGAL.lawState}.
      </p>
    </LegalPage>
  );
}

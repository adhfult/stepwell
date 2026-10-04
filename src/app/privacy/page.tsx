import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal/details";

export const metadata: Metadata = { title: "Privacy Policy" };

/** From docs/legal/privacy-draft.md; keep the two in step and matched to what the code does. */
export default function PrivacyPage() {
  const contact = LEGAL.contactEmail;
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL.effectiveDate}>
      <p>
        Stepwell helps students connect careers to programs and colleges. It’s free, and it’s an independent project.
        Questions: {contact}.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your email address and password.</strong> You need them to sign in. Your password is stored scrambled
          (hashed), so no one can read it, including us.
        </li>
        <li>
          <strong>That you’re 13 or older.</strong> When you sign up, we ask for the month and year you were born. We
          use them once to check your age and don’t save them. We only save that you’re 13 or older.
        </li>
        <li>
          <strong>Your profile, if you fill it in.</strong> A nickname (optional), where you are in school, your state,
          and the year you expect to graduate (optional). We use it to suggest careers, programs and colleges that fit
          you.
        </li>
        <li>
          <strong>Scholarship answers, only if you turn on matching.</strong> If you choose to, you can tell us your
          GPA, fields you might study, whether you’d be the first in your family to go to college, your citizenship
          status, whether a parent served in the military, and whether you plan to file the FAFSA. Every question is
          optional. We use the answers only to show which scholarships you might qualify for. They’re never shown to
          anyone, shared, or sent to other companies or to AI tools.
        </li>
        <li>
          <strong>Your classes, grades and test scores, only if you save them.</strong> On the GPA page you can save
          your classes (name, type, grade and credits), how your school weights classes, a GPA you already know, and
          your SAT or ACT score. We use them only to show your GPA and where your scores fall at each college. They’re
          never shown to anyone, shared, or sent to other companies or to AI tools. If you don’t sign in, the GPA page
          keeps your work in your own browser only and never sends it to us.
        </li>
        <li>
          <strong>Your interest quiz scores, if you save them.</strong> Just the six scores, never your answers.
        </li>
        <li>
          <strong>Careers, scholarships, colleges, internships, programs and AP classes you save, and your plan.</strong> The steps you add to your plan
          (a short title, the school year, when in the year, the kind of step and an optional due date), and whether
          you’ve done them. Only you can see them.
        </li>
        <li>
          <strong>Cookies Stepwell needs to work.</strong> A login cookie keeps you signed in until you sign out. If
          our age check says you’re under 13, a cookie that ends when you close your browser keeps showing that
          message. Neither one tracks you.
        </li>
      </ul>

      <h2>A check that you’re a person</h2>
      <p>
        When you sign up, sign in, reset your password or delete your account, Cloudflare Turnstile checks that you’re
        a person and not a bot. For that check, Cloudflare sees details such as your IP address and your browser.
        Stepwell doesn’t get that information.
      </p>

      <h2>What we never do</h2>
      <ul>
        <li>No ads.</li>
        <li>No tracking or analytics tools.</li>
        <li>We never sell your information or share it with colleges, companies or anyone else for their own use.</li>
      </ul>

      <h2>Who helps us run Stepwell</h2>
      <p>These services handle your information only to run Stepwell for us:</p>
      <ul>
        <li>
          <strong>Supabase</strong> stores your account and profile.
        </li>
        <li>
          <strong>Vercel</strong> runs the website.
        </li>
        <li>
          <strong>Cloudflare</strong> runs the person check above.
        </li>
        <li>
          <strong>{LEGAL.emailProvider}</strong> sends our emails (only to confirm your email address or reset your
          password; never newsletters or ads).
        </li>
      </ul>
      <p>
        Like most websites, these services keep short technical records (such as IP addresses) to keep Stepwell
        working and safe.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Until you delete your account. You can do that anytime from your account page: it removes your login, your
        profile, and everything you saved right away. Scholarship answers and saved grades and scores are also deleted if
        you don’t sign in for 12 months, and you can remove them yourself anytime on the “Scholarship matching” and
        “GPA and test scores” pages.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>
          See and change your profile on your <Link href="/account">account page</Link>.
        </li>
        <li>
          Change or remove your scholarship answers on the <Link href="/account/eligibility">Scholarship matching</Link>{" "}
          page.
        </li>
        <li>
          Change or remove your saved classes, grades and scores on the <Link href="/gpa">GPA and test scores</Link> page.
        </li>
        <li>Delete your account and everything in it on your account page.</li>
        <li>Questions or requests: {contact}.</li>
      </ul>

      <h2>Under 13</h2>
      <p>
        Stepwell is for people 13 and older. If we learn that someone under 13 created an account, we delete it.
        Parents can contact us at {contact}.
      </p>

      <h2>Changes</h2>
      <p>If we change what we collect, we’ll update this page first and change the date at the top.</p>
    </LegalPage>
  );
}

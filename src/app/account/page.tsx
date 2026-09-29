import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageTitle } from "@/components/page";
import { buttonClass } from "@/components/button-styles";
import { SubmitButton } from "@/components/form";
import { requireUser } from "@/lib/auth/dal";
import { getMySavedCareers } from "@/lib/careers/data";
import { getMyInterestResults } from "@/lib/interests/data";
import { getMyEligibility } from "@/lib/scholarships/data";
import { listNames } from "@/lib/interests/labels";
import { rankAreas, resultsPath } from "@/lib/interests/scoring";
import { getMyProfile, isProfileComplete, type Profile } from "@/lib/profile/data";
import { stageName, stateName } from "@/lib/profile/options";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const [profile, savedCareers, interests, eligibility] = await Promise.all([
    getMyProfile(),
    getMySavedCareers(),
    getMyInterestResults(),
    getMyEligibility(),
  ]);

  return (
    <Page>
      <PageTitle>Your account</PageTitle>
      {profile?.nickname && <p className="mt-4 text-lg">Hi, {profile.nickname}.</p>}
      <p className="mt-4">
        <Link href="/plan">Go to my plan</Link>
      </p>

      <section aria-labelledby="profile-heading" className="mt-10">
        {isProfileComplete(profile) ? <ProfileSummary profile={profile} /> : <FinishProfile />}
      </section>

      <section aria-labelledby="saved-heading" className="mt-12">
        <SavedCareers careers={savedCareers} />
      </section>

      <section aria-labelledby="interests-heading" className="mt-12">
        <Interests interests={interests} />
      </section>

      <section aria-labelledby="matching-heading" className="mt-12">
        <h2 id="matching-heading" className="text-lg font-bold">
          Scholarship matching
        </h2>
        <p className="mt-3">
          {eligibility
            ? "On. Your optional answers are used to show which scholarships you qualify for."
            : "Off. Answer a few optional questions to see which scholarships you qualify for."}
        </p>
        <p className="mt-3">
          <Link href="/account/eligibility">{eligibility ? "Change or remove your answers" : "Turn on scholarship matching"}</Link>
        </p>
      </section>

      <section aria-labelledby="signing-in-heading" className="mt-12">
        <h2 id="signing-in-heading" className="text-lg font-bold">
          Signing in
        </h2>
        <p className="mt-3">
          Signed in as <strong className="break-words">{user.email}</strong>.
        </p>
        <p className="mt-3">
          Want a new password? <Link href="/forgot-password">Reset your password</Link> and we’ll email you a link.
        </p>
        <form action={signOut} className="mt-4">
          <SubmitButton variant="secondary" pendingLabel="Signing out">
            Sign out
          </SubmitButton>
        </form>
      </section>

      <section aria-labelledby="leaving-heading" className="mt-12">
        <h2 id="leaving-heading" className="text-lg font-bold">
          Leaving Stepwell
        </h2>
        <p className="mt-3">
          You can delete your account and everything in it at any time.{" "}
          <Link href="/account/delete">Delete my account</Link>
        </p>
      </section>
    </Page>
  );
}

type SavedCareer = Awaited<ReturnType<typeof getMySavedCareers>>[number];

/** A list with dividers; empty state with one action (DESIGN.md "States"). */
function SavedCareers({ careers }: { careers: SavedCareer[] }) {
  if (careers.length === 0) {
    return (
      <>
        <h2 id="saved-heading" className="text-lg font-bold">
          No saved careers yet
        </h2>
        <p className="mt-3">Save careers you want to compare and they’ll show up here.</p>
        <p className="mt-3">
          <Link href="/careers">Search careers</Link>
        </p>
      </>
    );
  }
  return (
    <>
      <h2 id="saved-heading" className="text-lg font-bold">
        Saved careers
      </h2>
      <ul className="mt-2 divide-y divide-border-subtle border-y border-border-subtle">
        {careers.map((career) => (
          <li key={career.onet_code} className="py-3">
            <Link href={`/careers/${career.onet_code}`}>{career.title}</Link>
            {career.retired_at && <p className="mt-1 text-sm text-muted">No longer listed by O*NET</p>}
          </li>
        ))}
      </ul>
    </>
  );
}

/** Saved interest quiz results (scores only), or an empty state. */
function Interests({ interests }: { interests: Awaited<ReturnType<typeof getMyInterestResults>> }) {
  if (!interests) {
    return (
      <>
        <h2 id="interests-heading" className="text-lg font-bold">
          No interest results saved
        </h2>
        <p className="mt-3">Answer 60 quick questions and see careers that fit what you like to do.</p>
        <p className="mt-3">
          <Link href="/interests">Take the interest quiz</Link>
        </p>
      </>
    );
  }
  return (
    <>
      <h2 id="interests-heading" className="text-lg font-bold">
        Your interests
      </h2>
      <p className="mt-3">
        Your top interests: <strong>{listNames(rankAreas(interests).slice(0, 3))}</strong>.
      </p>
      <p className="mt-3">
        <Link href={resultsPath(interests)}>See careers that match your interests</Link>
      </p>
    </>
  );
}

/** Empty state (DESIGN.md "States"): what's missing, why it helps, one action. */
function FinishProfile() {
  return (
    <div className="border border-border-subtle bg-surface p-4 lg:p-6">
      <h2 id="profile-heading" className="text-lg font-bold">
        Finish your profile
      </h2>
      <p className="mt-3">
        Tell us where you are in school and which state you live in, so Stepwell can suggest careers, programs and
        colleges that fit you.
      </p>
      <Link href="/account/profile" className={`mt-4 ${buttonClass()}`}>
        Finish your profile
      </Link>
    </div>
  );
}

/** A list with dividers, not cards (DESIGN.md "Panels and lists"). Rows stack on phones. */
function ProfileSummary({ profile }: { profile: Profile }) {
  const rows = [
    { label: "What we call you", value: profile.nickname ?? "No nickname" },
    { label: "Where you are in school", value: stageName(profile.stage) },
    { label: "State", value: stateName(profile.state) },
    ...(profile.stage === "adult_learner"
      ? []
      : [{ label: "Expected graduation year", value: profile.grad_year ? String(profile.grad_year) : "Not set" }]),
  ];

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="profile-heading" className="text-lg font-bold">
          Your profile
        </h2>
        <Link href="/account/profile" className="inline-flex min-h-11 items-center">
          Edit profile
        </Link>
      </div>
      <dl className="mt-2 divide-y divide-border-subtle border-y border-border-subtle">
        {rows.map((row) => (
          <div key={row.label} className="py-3 sm:flex sm:gap-4">
            <dt className="text-sm text-muted sm:w-56 sm:shrink-0 sm:pt-0.5">{row.label}</dt>
            <dd className="mt-1 sm:mt-0">{row.value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

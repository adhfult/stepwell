import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/button-styles";
import { SubmitButton } from "@/components/form";
import { requireUser } from "@/lib/auth/dal";
import { getMyProfile, isProfileComplete, type Profile } from "@/lib/profile/data";
import { stageName, stateName } from "@/lib/profile/options";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const profile = await getMyProfile();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 lg:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">Your account</h1>
      {profile?.nickname && <p className="mt-4 text-lg">Hi, {profile.nickname}.</p>}

      <section aria-labelledby="profile-heading" className="mt-10">
        {isProfileComplete(profile) ? <ProfileSummary profile={profile} /> : <FinishProfile />}
      </section>

      <section aria-labelledby="signing-in-heading" className="mt-12">
        <h2 id="signing-in-heading" className="text-xl font-bold">
          Signing in
        </h2>
        <p className="mt-3">
          Signed in as <strong className="break-all">{user.email}</strong>.
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
        <h2 id="leaving-heading" className="text-xl font-bold">
          Leaving Stepwell
        </h2>
        <p className="mt-3">
          You can delete your account and everything in it at any time.{" "}
          <Link href="/account/delete">Delete my account</Link>
        </p>
      </section>
    </div>
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
        <h2 id="profile-heading" className="text-xl font-bold">
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

import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { getMyProfile, isProfileComplete } from "@/lib/profile/data";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Your profile" };

/** Where the email confirmation link lands, and where students edit their profile later. */
export default async function ProfilePage() {
  await requireUser("/account/profile");
  const profile = await getMyProfile();

  return (
    <div className="mx-auto max-w-md px-6 py-12 lg:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">
        {isProfileComplete(profile) ? "Edit your profile" : "Set up your profile"}
      </h1>
      <p className="mt-4">
        Stepwell uses this to suggest careers, programs and colleges that fit you. You can change it anytime.
      </p>
      <ProfileForm
        thisYear={new Date().getUTCFullYear()}
        initialValues={{
          nickname: profile?.nickname ?? "",
          stage: profile?.stage ?? "",
          state: profile?.state ?? "",
          gradYear: profile?.grad_year == null ? "" : String(profile.grad_year),
        }}
      />
      <p className="mt-8">
        <Link href="/account">Back to your account</Link>
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageTitle } from "@/components/page";
import { requireUser } from "@/lib/auth/dal";
import { countiesOf } from "@/lib/profile/counties";
import { getMyProfile, isProfileComplete } from "@/lib/profile/data";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Your profile" };

/** Where the email confirmation link lands, and where students edit their profile later. */
export default async function ProfilePage() {
  await requireUser("/account/profile");
  const profile = await getMyProfile();

  return (
    <Page width="form">
      <PageTitle>
        {isProfileComplete(profile) ? "Edit your profile" : "Set up your profile"}
      </PageTitle>
      <p className="mt-4">
        Stepwell uses this to suggest careers, programs and colleges that fit you. You can change it anytime.
      </p>
      <ProfileForm
        thisYear={new Date().getUTCFullYear()}
        counties={profile?.state ? countiesOf(profile.state) : []}
        initialValues={{
          nickname: profile?.nickname ?? "",
          stage: profile?.stage ?? "",
          state: profile?.state ?? "",
          gradYear: profile?.grad_year == null ? "" : String(profile.grad_year),
          county: profile?.county ?? "",
        }}
      />
      <p className="mt-8">
        <Link href="/account">Back to your account</Link>
      </p>
    </Page>
  );
}

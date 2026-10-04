import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Band, Page, PageTitle } from "@/components/page";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCareerPrograms } from "@/lib/colleges/data";
import { getScholarshipFieldsForCareer } from "@/lib/scholarships/data";
import { type Career, getApCourses, getCareer, isCareerSaved } from "@/lib/careers/data";
import { medianPay, onetCodeSchema, outlookText, payRange, preparation, typicalEducation } from "@/lib/careers/labels";
import { OnetSource, OutlookSource } from "../source-line";
import { SaveButton } from "@/app/plan/save-button";
import { getMySavedIds } from "@/lib/plan/data";
import { getMyProfile } from "@/lib/profile/data";
import { CareerPath } from "./career-path";
import { Credentials } from "./credentials";
import { SaveCareerForm } from "./save-form";

async function careerFor(params: PageProps<"/careers/[code]">["params"]) {
  const code = onetCodeSchema.safeParse((await params).code);
  if (!code.success) notFound();
  const career = await getCareer(code.data);
  if (!career) notFound();
  return career;
}

export async function generateMetadata({ params }: PageProps<"/careers/[code]">): Promise<Metadata> {
  return { title: (await careerFor(params)).title };
}

export default async function CareerPage({ params }: PageProps<"/careers/[code]">) {
  const career = await careerFor(params);
  const [user, saved, programs, apCourses, scholarshipFields, savedIds, profile] = await Promise.all([
    getCurrentUser(),
    isCareerSaved(career.onet_code),
    getCareerPrograms(career.onet_code),
    getApCourses(career.onet_code),
    getScholarshipFieldsForCareer(career.onet_code),
    getMySavedIds(),
    getMyProfile(),
  ]);
  const education = typicalEducation(career.education_level, career.education_share);
  const prep = preparation(career.job_zone);

  // The band's key facts: what the job pays and its outlook, on the first screen.
  const median = medianPay(career.outlook);
  const prospects = career.outlook && outlookText(career.outlook.outlook, career.outlook.bright_reasons);

  return (
    <>
      <Band>
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-12">
          <div className="max-w-2xl">
            <p>
              <Link href="/careers" className="inline-flex min-h-11 items-center">
                Search careers
              </Link>
            </p>
            <PageTitle>{career.title}</PageTitle>
            {/* Some careers have a dozen other names; phones see three, the rest fold away. */}
            {career.alsoCalled.length > 0 && (
              <p className="mt-2 text-muted">Also called: {career.alsoCalled.slice(0, 3).join(", ")}</p>
            )}
            {career.alsoCalled.length > 3 && (
              <details className="text-muted">
                <summary className="inline-flex min-h-11 cursor-pointer items-center text-primary underline">
                  {career.alsoCalled.length - 3} more names
                </summary>
                <p>{career.alsoCalled.slice(3).join(", ")}</p>
              </details>
            )}
          </div>
          {(median || prospects) && (
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4 lg:mt-0 lg:shrink-0">
              {median && (
                <div>
                  <dt className="text-sm text-muted">Median pay</dt>
                  <dd className="text-xl font-bold">{median}</dd>
                </div>
              )}
              {prospects && (
                <div>
                  <dt className="text-sm text-muted">Job outlook</dt>
                  <dd className="text-xl font-bold">{prospects.name}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </Band>
      {/* From 1024px the path sits in a side column (DESIGN.md "Layout"); on
          phones it stays right after the description. */}
      <Page width="browse">
        <div className="lg:grid lg:grid-cols-[minmax(0,42rem)_1fr] lg:gap-x-16">
          <div className="lg:col-start-1">
            {career.retired_at && (
              <div className="mt-6 border border-border-subtle bg-surface p-4 lg:p-6">
                <h2 className="text-lg font-bold">O*NET no longer lists this career</h2>
                <p className="mt-3">
                  The newest O*NET release dropped or renamed it. What you see here is from O*NET {career.onet_release}.
                  Search for it again to find its new name.
                </p>
              </div>
            )}

            <p className="mt-6">{career.description}</p>

            {user ? (
              <SaveCareerForm code={career.onet_code} saved={saved} />
            ) : (
              <p className="mt-6">
                <Link href={`/sign-in?next=${encodeURIComponent(`/careers/${career.onet_code}`)}`}>
                  Sign in to save this career
                </Link>
              </p>
            )}
          </div>
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:[&>section]:mt-0">
            <CareerPath code={career.onet_code} title={career.title} />
          </div>
          <div className="lg:col-start-1">
            <section aria-labelledby="takes-heading" className="mt-12">
              <h2 id="takes-heading" className="text-lg font-bold">
                What it takes
              </h2>
              <dl className="mt-2 divide-y divide-border-subtle border-y border-border-subtle">
                <div className="py-3 sm:flex sm:gap-4">
                  <dt className="text-sm text-muted sm:w-48 sm:shrink-0 sm:pt-0.5">Typical education</dt>
                  <dd className="mt-1 sm:mt-0">{education ?? <span className="text-muted">Not reported</span>}</dd>
                </div>
                <div className="py-3 sm:flex sm:gap-4">
                  <dt className="text-sm text-muted sm:w-48 sm:shrink-0 sm:pt-0.5">Preparation</dt>
                  <dd className="mt-1 sm:mt-0">
                    {prep ? (
                      <>
                        <strong>{prep.name}.</strong> {prep.detail}
                      </>
                    ) : (
                      <span className="text-muted">Not reported</span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            {career.outlook && <PayAndOutlook career={career} />}

            {programs.length > 0 && (
              <section aria-labelledby="study-heading" className="mt-12">
                <h2 id="study-heading" className="text-lg font-bold">
                  Where to study
                </h2>
                <p className="mt-3">Programs that lead to this career include:</p>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  {programs.slice(0, 6).map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
                <p className="mt-4">
                  <Link href={`/careers/${career.onet_code}/colleges`}>Find colleges for this career</Link>
                </p>
                {scholarshipFields.length > 0 && (
                  <p className="mt-2">
                    <Link href={`/scholarships?fields=${scholarshipFields.join(",")}`}>Scholarships for this field</Link>
                  </p>
                )}
              </section>
            )}

            {apCourses.length > 0 && (
              <section aria-labelledby="classes-heading" className="mt-12">
                <h2 id="classes-heading" className="text-lg font-bold">
                  Classes that help
                </h2>
                <p className="mt-3">
                  If your high school offers them, these AP classes build knowledge this career uses. Regular classes in the
                  same subjects help too.
                </p>
                <ul className="mt-2 divide-y divide-border-subtle border-y border-border-subtle">
                  {apCourses.map((course) => (
                    <li key={course.ap_code} className="py-3">
                      <p className="font-bold">{course.ap_name}</p>
                      <p className="mt-1 text-sm text-muted">Builds: {course.area_name}</p>
                      {user && <SaveButton kind="ap" id={course.ap_code} saved={savedIds.ap.has(course.ap_code)} />}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-muted">
                  Based on O*NET knowledge ratings (USDOL/ETA, CC BY 4.0). Stepwell matches them to AP courses itself. AP is a
                  trademark of College Board, which doesn’t endorse Stepwell.
                </p>
              </section>
            )}

            <Credentials code={career.onet_code} state={profile?.state ?? null} />

            {career.tasks.length > 0 && (
              <section aria-labelledby="tasks-heading" className="mt-12">
                <h2 id="tasks-heading" className="text-lg font-bold">
                  What you would do
                </h2>
                <ul className="mt-3 list-disc space-y-2 pl-6">
                  {career.tasks.map((task) => (
                    <li key={task}>{task}</li>
                  ))}
                </ul>
              </section>
            )}

            {career.skills.length > 0 && (
              <section aria-labelledby="skills-heading" className="mt-12">
                <h2 id="skills-heading" className="text-lg font-bold">
                  Skills that matter most
                </h2>
                <ul className="mt-3 list-disc space-y-1 pl-6">
                  {career.skills.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </section>
            )}

            {career.related.length > 0 && (
              <section aria-labelledby="related-heading" className="mt-12">
                <h2 id="related-heading" className="text-lg font-bold">
                  Related careers
                </h2>
                <ul className="mt-2">
                  {career.related.map((r) => (
                    <li key={r.onet_code}>
                      <Link href={`/careers/${r.onet_code}`} className="inline-flex min-h-11 items-center">
                        {r.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <OnetSource release={career.onet_release} retrievedAt={career.retrieved_at} />
          </div>
        </div>
      </Page>
    </>
  );
}

/**
 * Pay (BLS wage estimates) and outlook (BLS projections), via O*NET Web
 * Services. Left out entirely when O*NET has no data for this career.
 */
function PayAndOutlook({ career }: { career: Career }) {
  const outlook = career.outlook!;
  const median = medianPay(outlook);
  const range = payRange(outlook);
  const prospects = outlookText(outlook.outlook, outlook.bright_reasons);
  // BLS sometimes publishes pay only for a wider job group than this career.
  const widerGroup = outlook.wage_soc_code && outlook.wage_soc_code !== career.soc_code;

  return (
    <section aria-labelledby="pay-heading" className="mt-12">
      <h2 id="pay-heading" className="text-lg font-bold">
        Pay and outlook
      </h2>
      {median ? (
        <div className="mt-4">
          <p className="text-sm text-muted">Median pay</p>
          <p className="text-xl font-bold">{median}</p>
          {range && <p className="mt-2">{range}</p>}
          {widerGroup && (
            <p className="mt-2 text-sm text-muted">Pay is for the wider job group this career belongs to.</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-muted">Pay not reported</p>
      )}
      {prospects && (
        <p className="mt-4">
          <strong>{prospects.name}.</strong> {prospects.detail}
        </p>
      )}
      <OutlookSource retrievedAt={outlook.retrieved_at} />
    </section>
  );
}

import Link from "next/link";
import { CareerOneStopSource } from "@/components/careeronestop-source";
import { getCredentials } from "@/lib/careers/data";
import { stateName } from "@/lib/profile/options";

const FIRST = 5; // a few on screen, the rest fold away (phones)

/** Licenses in the student's state and core certifications, from CareerOneStop. */
export async function Credentials({ code, state }: { code: string; state: string | null }) {
  const { licenses, certifications } = await getCredentials(code);
  if (licenses.length === 0 && certifications.length === 0) return null;
  const states = new Set(licenses.map((l) => l.state)).size;
  const here = state ? licenses.filter((l) => l.state === state) : [];

  return (
    <>
      {licenses.length > 0 && (
        <section aria-labelledby="licenses-heading" className="mt-12">
          <h2 id="licenses-heading" className="text-lg font-bold">
            License
          </h2>
          {here.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {here.map((l) => (
                <li key={l.license_id}>
                  <p className="font-bold">
                    {l.title} ({stateName(l.state)})
                  </p>
                  {l.agency && <p className="text-sm text-muted">{l.agency_url ? <a href={l.agency_url}>{l.agency}</a> : l.agency}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3">
              {state ? `No license is listed for ${stateName(state)}. ` : ""}
              {states === 1 ? "1 state lists" : `${states} ${states > 50 ? "states and territories" : "states"} list`} a license for
              this work.{" "}
              {!state && <Link href="/account/profile">Add your state to see yours</Link>}
            </p>
          )}
        </section>
      )}

      {certifications.length > 0 && (
        <section aria-labelledby="certifications-heading" className="mt-12">
          <h2 id="certifications-heading" className="text-lg font-bold">
            Certifications
          </h2>
          <p className="mt-3">Core certifications for this work. Most need training or work experience first.</p>
          <CertList certs={certifications.slice(0, FIRST)} />
          {certifications.length > FIRST && (
            <details className="mt-2">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-primary underline">
                {certifications.length - FIRST} more
              </summary>
              <CertList certs={certifications.slice(FIRST)} />
            </details>
          )}
        </section>
      )}
      <CareerOneStopSource />
    </>
  );
}

function CertList({ certs }: { certs: Awaited<ReturnType<typeof getCredentials>>["certifications"] }) {
  return (
    <ul className="mt-3 space-y-3">
      {certs.map((c) => (
        <li key={c.cert_id}>
          <p className="font-bold">{c.url ? <a href={c.url}>{c.name}</a> : c.name}</p>
          {c.organization && <p className="text-sm text-muted">{c.organization}</p>}
        </li>
      ))}
    </ul>
  );
}

// CareerOneStop Web API (U.S. Department of Labor and Minnesota DEED): youth
// programs, licenses by state and core certifications for each career.
// The token goes in a Bearer header, the user ID in the path; never logged.
// Spec: docs/specs/careeronestop.md.
import { z } from "zod";
import type { Fetcher } from "../fetch/polite.ts";
import type { AdapterResult, StagedRecord } from "./types.ts";
import { cleanText, STATE_CODES } from "./usajobs.ts";

const API = "https://api.careeronestop.org/v1";
const PAGE = 50;

type Env = { CAREERONESTOP_USER_ID?: string; CAREERONESTOP_API_TOKEN?: string };
type Previous = { etag: string | null; release: string | null };

/** GET one CareerOneStop path (with "{id}" for the user ID) as parsed JSON. */
async function cosGet(fetcher: Fetcher, env: Env, path: string): Promise<unknown> {
  if (!env.CAREERONESTOP_USER_ID || !env.CAREERONESTOP_API_TOKEN) {
    throw new Error("CAREERONESTOP_USER_ID and CAREERONESTOP_API_TOKEN must be set (see docs/specs/careeronestop.md)");
  }
  const url = `${API}${path.replace("{id}", encodeURIComponent(env.CAREERONESTOP_USER_ID))}`;
  const response = await fetcher.get(url, {
    headers: { Authorization: `Bearer ${env.CAREERONESTOP_API_TOKEN}`, Accept: "application/json" },
  });
  // A path with no results can come back as 404; anything else is a real failure.
  if (response.status === 404) return {};
  if (response.status !== 200) throw new Error(`CareerOneStop ${path.split("/")[1]} returned ${response.status}`);
  return JSON.parse(response.body);
}

/** An https link, or null (Stepwell links only to https pages). */
export function httpsUrl(raw: string | null | undefined): string | null {
  try {
    const url = new URL((raw ?? "").trim());
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

const id = z.string().regex(/^[A-Za-z0-9-]{1,40}$/);
const text = z.string().nullish();

// --- Youth programs ---------------------------------------------------------

const youthSchema = z.object({
  ID: z.string().regex(/^\d{1,12}$/),
  Name: z.string(),
  City: text,
  StateAbbr: z.string().regex(/^[A-Z]{2}$/),
  Zip: text,
  WebSiteUrl: text,
  ProgramType: text,
});

export type YouthProgram = { id: string; name: string; city: string | null; state: string; zip: string | null; website: string | null };

/** Youth service providers only; the list's other kinds are general adult job centers. */
export function parseYouthPrograms(raw: unknown): StagedRecord<YouthProgram>[] {
  const list = (raw as { YouthProgramList?: unknown[] })?.YouthProgramList ?? [];
  return list.flatMap((item): StagedRecord<YouthProgram>[] => {
    if ((item as { ProgramType?: unknown })?.ProgramType !== "Youth Service Provider") return [];
    const r = youthSchema.safeParse(item);
    const name = r.success ? cleanText(r.data.Name, 200) : null;
    if (!r.success || !name) {
      return [{ status: "rejected", id: String((item as { ID?: unknown })?.ID), reason: r.success ? "no name" : r.error.message, raw: item }];
    }
    const zip = r.data.Zip?.trim() ?? "";
    return [{
      status: "valid",
      id: r.data.ID,
      value: {
        id: r.data.ID,
        name,
        city: cleanText(r.data.City, 100),
        state: r.data.StateAbbr,
        zip: /^\d{5}(-\d{4})?$/.test(zip) ? zip : null,
        website: httpsUrl(r.data.WebSiteUrl),
      },
    }];
  });
}

export async function readCosYouthPrograms(fetcher: Fetcher, _previous: Previous, env: Env): Promise<AdapterResult<YouthProgram>> {
  const records = parseYouthPrograms(await cosGet(fetcher, env, "/youthprogramfinder/{id}"));
  return { status: "fetched", release: null, etag: null, records };
}

// --- Licenses ---------------------------------------------------------------

const licenseSchema = z.object({
  ID: z.string().regex(/^[A-Za-z0-9&()-]{1,40}$/),
  Title: z.string(),
  State: z.string(),
  LicenseAgency: z.object({ Name: text, Url: text }).nullish(),
});

export type CareerLicense = {
  onet_code: string;
  license_id: string;
  title: string;
  state: string;
  agency: string | null;
  agency_url: string | null;
};

/** One page of licenses for a career. Agency names look like "Licensure~Kansas State Board of Nursing". */
export function parseLicenses(onetCode: string, raw: unknown): StagedRecord<CareerLicense>[] {
  // Federal licenses come as State "Federal Agencies"; Stepwell shows licenses by state.
  const list = ((raw as { LicenseList?: unknown[] })?.LicenseList ?? []).filter(
    (item) => (item as { State?: unknown })?.State !== "Federal Agencies",
  );
  return list.map((item): StagedRecord<CareerLicense> => {
    const r = licenseSchema.safeParse(item);
    const state = r.success ? STATE_CODES.get(r.data.State.trim().toLowerCase()) : undefined;
    const title = r.success ? cleanText(r.data.Title, 200) : null;
    const key = `${onetCode} ${String((item as { ID?: unknown })?.ID)}`;
    if (!r.success || !state || !title) {
      return { status: "rejected", id: key, reason: r.success ? `unknown state or title: ${r.data.State}` : r.error.message, raw: item };
    }
    const agency = r.data.LicenseAgency?.Name?.split("~").reverse().join(", ") ?? null;
    return {
      status: "valid",
      id: key,
      value: {
        onet_code: onetCode,
        license_id: r.data.ID,
        title,
        state,
        agency: cleanText(agency, 300),
        agency_url: httpsUrl(r.data.LicenseAgency?.Url),
      },
    };
  });
}

/** Every state's licenses for each career, 50 a page (location 0 = all states). */
export async function readCosLicenses(fetcher: Fetcher, _previous: Previous, env: Env, careers: string[] = []): Promise<AdapterResult<CareerLicense>> {
  const records: StagedRecord<CareerLicense>[] = [];
  for (const code of careers) {
    for (let start = 0; ; start += PAGE) {
      const raw = (await cosGet(fetcher, env, `/license/{id}/${code}/0/0/0/${start}/${PAGE}`)) as { RecordCount?: number };
      const page = parseLicenses(code, raw);
      records.push(...page);
      if (page.length < PAGE || start + PAGE >= (raw.RecordCount ?? 0)) break;
    }
  }
  return { status: "fetched", release: null, etag: null, records };
}

// --- Certifications ---------------------------------------------------------

const certSchema = z.object({ Id: id, Name: z.string(), Organization: text, Url: text });

export type CareerCertification = { onet_code: string; cert_id: string; name: string; organization: string | null; url: string | null };

export function parseCertifications(onetCode: string, raw: unknown): StagedRecord<CareerCertification>[] {
  const list = (raw as { CertList?: unknown[] })?.CertList ?? [];
  return list.map((item): StagedRecord<CareerCertification> => {
    const r = certSchema.safeParse(item);
    const name = r.success ? cleanText(r.data.Name, 300) : null;
    const key = `${onetCode} ${String((item as { Id?: unknown })?.Id)}`;
    if (!r.success || !name) return { status: "rejected", id: key, reason: r.success ? "no name" : r.error.message, raw: item };
    return {
      status: "valid",
      id: key,
      value: { onet_code: onetCode, cert_id: r.data.Id, name, organization: cleanText(r.data.Organization, 300), url: httpsUrl(r.data.Url) },
    };
  });
}

/** Core certifications for each career (one page of up to 50 is plenty: nurses have 10). */
export async function readCosCertifications(fetcher: Fetcher, _previous: Previous, env: Env, careers: string[] = []): Promise<AdapterResult<CareerCertification>> {
  const records: StagedRecord<CareerCertification>[] = [];
  for (const code of careers) {
    records.push(...parseCertifications(code, await cosGet(fetcher, env, `/certificationfinder/{id}/${code}/0/0/Core/0/0/0/0/0/0/${PAGE}`)));
  }
  return { status: "fetched", release: null, etag: null, records };
}

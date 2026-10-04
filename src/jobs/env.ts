// The only place import jobs read settings (v1 expansion, Section 3.11).
import { z } from "zod";

// The local Supabase stack, with the password from supabase/seed.sql.
const LOCAL_DATABASE_URL = "postgresql://importer:importer@127.0.0.1:54322/postgres";

const schema = z
  .object({
    // No sslmode in the URL: databaseClient() sets verified TLS itself.
    IMPORT_DATABASE_URL: z
      .string()
      .startsWith("postgresql://")
      .refine((url) => !url.includes("sslmode="), "leave sslmode out (TLS is set in load.ts)")
      .default(LOCAL_DATABASE_URL),
    // O*NET Web Services (pay and outlook). Only the onet_outlook source needs it.
    ONET_API_KEY: z.string().min(10).optional(),
    // api.data.gov key for College Scorecard. Only the scorecard source needs it.
    SCORECARD_API_KEY: z.string().min(10).optional(),
    // USAJOBS Search API key, and the email it was requested with (USAJOBS
    // wants that email as the User-Agent). Only the usajobs source needs them.
    USAJOBS_API_KEY: z.string().min(10).optional(),
    USAJOBS_EMAIL: z.email().optional(),
    // CareerOneStop Web API (Scholarship Finder): the User ID goes in the
    // request path, the token in a Bearer header. Not used by any source yet.
    CAREERONESTOP_USER_ID: z.string().min(3).optional(),
    CAREERONESTOP_API_TOKEN: z.string().min(10).optional(),
    // A contact address for the User-Agent, sent to every site we read.
    IMPORT_CONTACT: z.string().min(3).optional(),
    CI: z.string().optional(),
  })
  .refine((env) => env.CI !== "true" || env.IMPORT_CONTACT, {
    message: "IMPORT_CONTACT is required in CI (it goes in the User-Agent)",
    path: ["IMPORT_CONTACT"],
  });

export type JobEnv = z.infer<typeof schema>;

export function parseJobEnv(source: Record<string, string | undefined>): JobEnv {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  return result.data;
}

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

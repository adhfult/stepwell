// O*NET Interest Profiler questions (60-question short form), via O*NET Web
// Services (CC BY 4.0). Cached once a year; the quiz never calls O*NET.
// Spec: docs/specs/interest-quiz.md.
import { z } from "zod";
import type { Fetcher } from "../fetch/polite.ts";
import { sameOrigin } from "./onet-outlook.ts";
import type { AdapterResult } from "./types.ts";

const QUESTIONS_URL = "https://api-v2.onetcenter.org/mnm/interestprofiler/questions?start=1&end=60";
const AREAS = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"] as const;

const pageSchema = z.object({
  next: z.url().optional(),
  answer_option: z.array(z.object({ value: z.number().int(), name: z.string() })),
  question: z.array(z.object({ index: z.number().int(), area: z.string(), text: z.string() })),
});

const questionSchema = z.object({
  index: z.number().int().min(1).max(60),
  area: z.enum(AREAS),
  text: z.string().trim().min(1).max(300),
});

export type InterestQuestion = z.infer<typeof questionSchema>;

export async function readOnetIp(
  fetcher: Fetcher,
  _previous: { etag: string | null; release: string | null },
  env: { ONET_API_KEY?: string },
): Promise<AdapterResult<InterestQuestion>> {
  if (!env.ONET_API_KEY) throw new Error("ONET_API_KEY is not set (see .env.example)");
  const headers = { "X-API-Key": env.ONET_API_KEY, Accept: "application/json" };

  const questions: unknown[] = [];
  for (let url: string | undefined = QUESTIONS_URL; url; ) {
    const response = await fetcher.get(url, { headers });
    if (response.status !== 200) throw new Error(`Interest Profiler questions returned ${response.status}`);
    const page = pageSchema.parse(JSON.parse(response.body));
    // Stepwell's scoring counts answers 1 to 5 as 0 to 4; stop if O*NET changes the scale.
    const values = page.answer_option.map((o) => o.value).join(",");
    if (values !== "1,2,3,4,5") throw new Error(`Unexpected answer options: ${values}`);
    questions.push(...page.question);
    url = sameOrigin(page.next, new URL(QUESTIONS_URL).origin);
  }

  return {
    status: "fetched",
    release: null,
    etag: null,
    records: questions.map((raw, i) => {
      const result = questionSchema.safeParse(raw);
      return result.success
        ? { status: "valid", id: String(result.data.index), value: result.data }
        : {
            status: "rejected",
            id: `item ${i + 1}`,
            reason: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
            raw,
          };
    }),
  };
}

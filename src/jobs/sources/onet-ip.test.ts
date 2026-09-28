import { describe, expect, it } from "vitest";
import type { Fetcher } from "../fetch/polite.ts";
import { readOnetIp } from "./onet-ip.ts";

// Shaped like the "Short Form Questions" example in O*NET's API v2 reference.
const options = [1, 2, 3, 4, 5].map((value) => ({ value, name: `Option ${value}` }));
const page = (questions: unknown[], answerOptions = options) =>
  JSON.stringify({ start: 1, end: questions.length, total: questions.length, answer_option: answerOptions, question: questions });

function fakeFetcher(body: string) {
  const calls: Array<Record<string, string> | undefined> = [];
  const fetcher: Fetcher = {
    requestCount: () => calls.length,
    async get(url, opts) {
      calls.push(opts?.headers);
      return { status: 200, body, contentType: "application/json", finalUrl: url, etag: null };
    },
  };
  return { fetcher, calls };
}

const read = (fetcher: Fetcher) => readOnetIp(fetcher, { etag: null, release: null }, { ONET_API_KEY: "test-key-123" });

describe("readOnetIp", () => {
  it("reads questions with their area, sending the key", async () => {
    const { fetcher, calls } = fakeFetcher(
      page([
        { index: 1, area: "realistic", text: "Build kitchen cabinets" },
        { index: 2, area: "realistic", text: "Lay brick or tile" },
      ]),
    );
    const result = await read(fetcher);
    expect(calls[0]?.["X-API-Key"]).toBe("test-key-123");
    expect(result.status === "fetched" && result.records).toEqual([
      { status: "valid", id: "1", value: { index: 1, area: "realistic", text: "Build kitchen cabinets" } },
      { status: "valid", id: "2", value: { index: 2, area: "realistic", text: "Lay brick or tile" } },
    ]);
  });

  it("rejects a question with an unknown area", async () => {
    const { fetcher } = fakeFetcher(page([{ index: 1, area: "cooking", text: "Bake bread" }]));
    const result = await read(fetcher);
    expect(result.status === "fetched" && result.records[0].status).toBe("rejected");
  });

  it("stops if the answer scale changes, since scoring depends on it", async () => {
    const { fetcher } = fakeFetcher(page([], options.slice(0, 3)));
    await expect(read(fetcher)).rejects.toThrow("Unexpected answer options: 1,2,3");
  });
});

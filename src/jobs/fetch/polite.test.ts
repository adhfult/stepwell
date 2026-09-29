import { describe, expect, it } from "vitest";
import {
  createPoliteFetcher,
  parseRetryAfter,
  RobotsDisallowedError,
  userAgentFor,
} from "./polite.ts";

// A fake network: each URL answers with its queued responses in order (the
// last one repeats). The clock only moves when the fetcher sleeps.
function setup(routes: Record<string, Array<() => Response>>, options = {}) {
  let clock = 1_000_000;
  const sleeps: number[] = [];
  const calls: Array<{ url: string; headers: Record<string, string>; at: number }> = [];
  const served = new Map<string, number>();

  const fetchImpl = (async (input: URL, init?: RequestInit) => {
    const url = input.href;
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string>, at: clock });
    const queue = routes[url];
    if (!queue) return new Response("not found", { status: 404 });
    const n = served.get(url) ?? 0;
    served.set(url, n + 1);
    return queue[Math.min(n, queue.length - 1)]();
  }) as typeof fetch;

  const fetcher = createPoliteFetcher({
    userAgent: "StepwellBot/1.0 (test)",
    fetchImpl,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    now: () => clock,
    ...options,
  });
  return { fetcher, calls, sleeps };
}

const ok = (body = "ok", headers: Record<string, string> = {}) => () =>
  new Response(body, { status: 200, headers });
const status = (code: number, headers: Record<string, string> = {}) => () =>
  new Response(code === 304 ? null : "x", { status: code, headers });
const robots = (text: string) => ({ "https://example.gov/robots.txt": [ok(text)] });

describe("createPoliteFetcher", () => {
  it("sends the User-Agent and reads robots.txt once per host", async () => {
    const { fetcher, calls } = setup({
      ...robots("User-agent: *\nDisallow:"),
      "https://example.gov/a": [ok("A", { etag: '"1"' })],
      "https://example.gov/b": [ok("B")],
    });
    const a = await fetcher.get("https://example.gov/a");
    await fetcher.get("https://example.gov/b");
    expect(a).toMatchObject({ status: 200, body: "A", etag: '"1"' });
    expect(calls.map((c) => c.url)).toEqual([
      "https://example.gov/robots.txt",
      "https://example.gov/a",
      "https://example.gov/b",
    ]);
    expect(calls[1].headers["User-Agent"]).toBe("StepwellBot/1.0 (test)");
    expect(fetcher.requestCount()).toBe(3);
  });

  it("waits 5 seconds between requests to the same host", async () => {
    const { fetcher, calls } = setup({
      ...robots(""),
      "https://example.gov/a": [ok()],
      "https://example.gov/b": [ok()],
    });
    await fetcher.get("https://example.gov/a");
    await fetcher.get("https://example.gov/b");
    expect(calls[1].at - calls[0].at).toBe(5_000);
    expect(calls[2].at - calls[1].at).toBe(5_000);
  });

  it("honors a longer Crawl-delay for StepwellBot", async () => {
    const { fetcher, calls } = setup({
      ...robots("User-agent: StepwellBot\nCrawl-delay: 12\nDisallow:"),
      "https://example.gov/a": [ok()],
      "https://example.gov/b": [ok()],
    });
    await fetcher.get("https://example.gov/a");
    await fetcher.get("https://example.gov/b");
    expect(calls[2].at - calls[1].at).toBe(12_000);
  });

  it("refuses pages robots.txt disallows", async () => {
    const { fetcher, calls } = setup({
      ...robots("User-agent: *\nDisallow: /private/"),
    });
    await expect(fetcher.get("https://example.gov/private/x")).rejects.toThrow(RobotsDisallowedError);
    expect(calls).toHaveLength(1);
  });

  it("skips robots.txt only when told to (official keyed APIs)", async () => {
    const { fetcher, calls } = setup(
      { ...robots("User-agent: *\nDisallow: /"), "https://example.gov/api": [ok("A")] },
      { checkRobots: false },
    );
    await expect(fetcher.get("https://example.gov/api")).resolves.toMatchObject({ body: "A" });
    expect(calls.map((c) => c.url)).toEqual(["https://example.gov/api"]);
  });

  it("treats a missing robots.txt as allowing everything", async () => {
    const { fetcher } = setup({ "https://example.gov/a": [ok("A")] });
    await expect(fetcher.get("https://example.gov/a")).resolves.toMatchObject({ body: "A" });
  });

  it("stops when robots.txt has a server error", async () => {
    const { fetcher } = setup({ "https://example.gov/robots.txt": [status(503)] });
    await expect(fetcher.get("https://example.gov/a")).rejects.toThrow("robots.txt");
  });

  it("sends extra headers to the page but not to robots.txt", async () => {
    const { fetcher, calls } = setup({ ...robots(""), "https://example.gov/a": [ok()] });
    await fetcher.get("https://example.gov/a", { headers: { "X-API-Key": "k" } });
    expect(calls[0].headers["X-API-Key"]).toBeUndefined();
    expect(calls[1].headers["X-API-Key"]).toBe("k");
  });

  it("returns raw bytes when asked, for binary files", async () => {
    const { fetcher } = setup({ ...robots(""), "https://example.gov/a.xlsx": [() => new Response(new Uint8Array([80, 75, 3, 4]))] });
    const result = await fetcher.get("https://example.gov/a.xlsx", { as: "bytes" });
    expect([...result.bytes!]).toEqual([80, 75, 3, 4]);
    expect(result.body).toBe("");
  });

  it("sends the last ETag and returns 304 with an empty body", async () => {
    const { fetcher, calls } = setup({ ...robots(""), "https://example.gov/a": [status(304)] });
    const result = await fetcher.get("https://example.gov/a", { etag: '"1"' });
    expect(calls[1].headers["If-None-Match"]).toBe('"1"');
    expect(result).toMatchObject({ status: 304, body: "" });
  });

  it("retries a 503 with a growing wait", async () => {
    const { fetcher, sleeps } = setup({
      ...robots(""),
      "https://example.gov/a": [status(503), status(503), ok("A")],
    });
    await expect(fetcher.get("https://example.gov/a")).resolves.toMatchObject({ body: "A" });
    expect(sleeps).toEqual([5_000, 5_000, 20_000]); // host delay, then 5s and 20s backoffs
  });

  it("waits as long as Retry-After asks on a 429", async () => {
    const { fetcher, sleeps } = setup({
      ...robots(""),
      "https://example.gov/a": [status(429, { "retry-after": "30" }), ok()],
    });
    await fetcher.get("https://example.gov/a");
    expect(sleeps).toContain(30_000);
  });

  it("gives up after 3 retries", async () => {
    const { fetcher, calls } = setup({ ...robots(""), "https://example.gov/a": [status(500)] });
    await expect(fetcher.get("https://example.gov/a")).rejects.toThrow("returned 500 after 3 retries");
    expect(calls.filter((c) => c.url.endsWith("/a"))).toHaveLength(4);
  });

  it("retries a download that fails while reading the body", async () => {
    const broken = () =>
      new Response(new ReadableStream({ pull: (c) => c.error(new Error("connection reset")) }), { status: 200 });
    const { fetcher } = setup({ ...robots(""), "https://example.gov/a": [broken, ok("A")] });
    await expect(fetcher.get("https://example.gov/a")).resolves.toMatchObject({ body: "A" });
  });

  it("returns other 4xx without retrying", async () => {
    const { fetcher, calls } = setup({ ...robots(""), "https://example.gov/a": [status(403)] });
    await expect(fetcher.get("https://example.gov/a")).resolves.toMatchObject({ status: 403 });
    expect(calls).toHaveLength(2);
  });

  it("stops at the page cap", async () => {
    const { fetcher } = setup({ ...robots(""), "https://example.gov/a": [ok()] }, { pageCap: 2 });
    await fetcher.get("https://example.gov/a");
    await expect(fetcher.get("https://example.gov/a")).rejects.toThrow("Page cap");
  });

  it("fetches https only", async () => {
    const { fetcher } = setup({});
    await expect(fetcher.get("http://example.gov/a")).rejects.toThrow("Only https");
  });
});

describe("parseRetryAfter", () => {
  it("reads seconds and HTTP dates", () => {
    expect(parseRetryAfter("120", 0)).toBe(120_000);
    expect(parseRetryAfter("Thu, 01 Jan 1970 00:01:00 GMT", 0)).toBe(60_000);
    expect(parseRetryAfter("soon", 0)).toBeNull();
    expect(parseRetryAfter(null, 0)).toBeNull();
  });
});

describe("userAgentFor", () => {
  it("names the contact, or says development", () => {
    expect(userAgentFor("hello@example.org")).toBe("StepwellBot/1.0 (+hello@example.org)");
    expect(userAgentFor(undefined)).toBe("StepwellBot/1.0 (development)");
  });
});

// Every request an import job makes goes through here (decision 0007):
// robots.txt, one request per host every few seconds, conditional requests,
// retries on 429 and 5xx, and a page cap per run.
import robotsParser from "robots-parser";

export type FetchResult = {
  status: number;
  body: string;
  contentType: string | null;
  finalUrl: string;
  etag: string | null;
};

export type Fetcher = {
  get(url: string, options?: { etag?: string | null }): Promise<FetchResult>;
  requestCount(): number;
};

/** robots.txt forbids a page we need; the runner pauses the source. */
export class RobotsDisallowedError extends Error {}

type Options = {
  userAgent: string;
  minDelayMs?: number;
  maxRetries?: number;
  pageCap?: number;
  // Swappable for tests.
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

const ROBOT_NAME = "StepwellBot";
const RETRY_BASE_MS = 5_000;
const MAX_RETRY_AFTER_MS = 10 * 60_000;
const TIMEOUT_MS = 60_000;

export function createPoliteFetcher({
  userAgent,
  minDelayMs = 5_000,
  maxRetries = 3,
  pageCap = 2_000,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now,
}: Options): Fetcher {
  const lastRequestAt = new Map<string, number>();
  const robotsByHost = new Map<string, ReturnType<typeof robotsParser> | null>();
  let requests = 0;

  // Waits for the host's turn, then sends one request.
  async function send(url: URL, headers: Record<string, string>, delayMs: number) {
    if (requests >= pageCap) throw new Error(`Page cap of ${pageCap} requests reached`);
    const last = lastRequestAt.get(url.host);
    if (last !== undefined) {
      const wait = last + delayMs - now();
      if (wait > 0) await sleep(wait);
    }
    lastRequestAt.set(url.host, now());
    requests++;
    return fetchImpl(url, {
      headers: { "User-Agent": userAgent, ...headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }

  // Read once per host per run. Missing (4xx) means everything is allowed;
  // a server error means we can't know, so the run stops.
  async function robotsFor(url: URL) {
    if (!robotsByHost.has(url.host)) {
      const robotsUrl = new URL("/robots.txt", url);
      const response = await send(robotsUrl, {}, minDelayMs);
      if (response.status >= 500) {
        throw new Error(`robots.txt for ${url.host} returned ${response.status}`);
      }
      robotsByHost.set(
        url.host,
        response.ok ? robotsParser(robotsUrl.href, await response.text()) : null,
      );
    }
    return robotsByHost.get(url.host) ?? null;
  }

  return {
    requestCount: () => requests,

    async get(rawUrl, { etag } = {}) {
      const url = new URL(rawUrl);
      if (url.protocol !== "https:") throw new Error(`Only https is fetched: ${rawUrl}`);

      const robots = await robotsFor(url);
      if (robots?.isDisallowed(url.href, ROBOT_NAME)) {
        throw new RobotsDisallowedError(`robots.txt disallows ${url.href}`);
      }
      const crawlDelayMs = (robots?.getCrawlDelay(ROBOT_NAME) ?? 0) * 1000;
      const delayMs = Math.max(minDelayMs, crawlDelayMs);
      const headers: Record<string, string> = etag ? { "If-None-Match": etag } : {};

      for (let attempt = 0; ; attempt++) {
        let response: Response | null = null;
        let failure: unknown = null;
        try {
          response = await send(url, headers, delayMs);
        } catch (error) {
          if (error instanceof Error && error.message.startsWith("Page cap")) throw error;
          failure = error; // network error or timeout: worth a retry
        }

        const retryable = !response || response.status === 429 || response.status >= 500;
        if (response && !retryable) {
          return {
            status: response.status,
            body: response.status === 304 ? "" : await response.text(),
            contentType: response.headers.get("content-type"),
            finalUrl: response.url || url.href,
            etag: response.headers.get("etag"),
          };
        }
        if (attempt >= maxRetries) {
          throw new Error(
            response
              ? `${url.href} returned ${response.status} after ${maxRetries} retries`
              : `${url.href} failed after ${maxRetries} retries: ${String(failure)}`,
          );
        }

        const retryAfterMs = response ? parseRetryAfter(response.headers.get("retry-after"), now()) : null;
        if (retryAfterMs !== null && retryAfterMs > MAX_RETRY_AFTER_MS) {
          throw new Error(`${url.href} asked us to wait over 10 minutes (Retry-After)`);
        }
        await sleep(Math.max(retryAfterMs ?? 0, RETRY_BASE_MS * 4 ** attempt));
      }
    },
  };
}

/** Retry-After is either seconds or an HTTP date. */
export function parseRetryAfter(value: string | null, nowMs: number): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value.trim())) return Number(value) * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - nowMs);
}

export function userAgentFor(contact: string | undefined) {
  return `${ROBOT_NAME}/1.0 (${contact ? `+${contact}` : "development"})`;
}

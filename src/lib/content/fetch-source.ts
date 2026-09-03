/**
 * Bounded HTTP client for the sync job. Every request is checked against the
 * source policy first, uses a timeout and limited retries, sends conditional
 * validators, and rejects non-HTML or oversized responses.
 */

import { classifySourceUrl } from "./source-policy";

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_RETRY_DELAYS_MS = [250, 750];
const MAX_HTML_BYTES = 5 * 1024 * 1024;
const USER_AGENT =
  "CCF-Centris-ContentSync/1.0 (+https://www.ccf.org.ph/; authorized public-content mirror)";

export type FetchImpl = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

export interface FetchSourceInput {
  url: URL;
  etag?: string | null;
  lastModified?: string | null;
  timeoutMs?: number;
  retryDelaysMs?: number[];
  fetchImpl?: FetchImpl;
}

export type FetchSourceResult =
  | { kind: "blocked"; reason: string }
  | { kind: "not_modified" }
  | { kind: "http_error"; status: number }
  | { kind: "invalid_content_type"; contentType: string }
  | { kind: "too_large"; bytes: number }
  | { kind: "network_error"; message: string }
  | {
      kind: "ok";
      body: string;
      resolvedUrl: string;
      etag: string | null;
      lastModified: string | null;
    };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

export async function fetchSource(
  input: FetchSourceInput,
): Promise<FetchSourceResult> {
  const decision = classifySourceUrl(input.url);
  if (!decision.allowed) {
    return { kind: "blocked", reason: decision.reason };
  }

  const doFetch = input.fetchImpl ?? (globalThis.fetch as FetchImpl);
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryDelaysMs = input.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;

  const headers: Record<string, string> = {
    "user-agent": USER_AGENT,
    accept: "text/html,application/xhtml+xml",
  };
  if (input.etag) headers["if-none-match"] = input.etag;
  if (input.lastModified) headers["if-modified-since"] = input.lastModified;

  let lastError = "unknown";
  const attempts = retryDelaysMs.length + 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await sleep(retryDelaysMs[attempt - 1] ?? 0);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await doFetch(input.url.toString(), {
        headers,
        redirect: "follow",
        signal: controller.signal,
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      clearTimeout(timer);
      continue;
    }
    clearTimeout(timer);

    if (response.status === 304) return { kind: "not_modified" };

    if (!response.ok) {
      if (isRetryable(response.status) && attempt < attempts - 1) {
        lastError = `http ${response.status}`;
        continue;
      }
      return { kind: "http_error", status: response.status };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      return { kind: "invalid_content_type", contentType };
    }

    const body = await response.text();
    const bytes = Buffer.byteLength(body, "utf8");
    if (bytes > MAX_HTML_BYTES) return { kind: "too_large", bytes };

    return {
      kind: "ok",
      body,
      resolvedUrl: response.url || input.url.toString(),
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
    };
  }

  return { kind: "network_error", message: lastError };
}

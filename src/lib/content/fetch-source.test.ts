import assert from "node:assert/strict";
import test from "node:test";

import { fetchSource } from "./fetch-source";

const OK_HTML = "<html><body><main><p>Hi</p></main></body></html>";

test("sends conditional validators and rejects non-HTML", async () => {
  const seen: Headers[] = [];
  const result = await fetchSource({
    url: new URL("https://www.ccf.org.ph/chronicle/"),
    etag: '"abc"',
    lastModified: "Wed, 02 Sep 2026 08:00:00 GMT",
    fetchImpl: async (_url, init) => {
      seen.push(new Headers(init?.headers));
      return new Response("binary", {
        status: 200,
        headers: { "content-type": "application/pdf" },
      });
    },
  });
  assert.equal(seen[0].get("if-none-match"), '"abc"');
  assert.equal(seen[0].get("if-modified-since"), "Wed, 02 Sep 2026 08:00:00 GMT");
  assert.equal(result.kind, "invalid_content_type");
});

test("returns not_modified on a 304", async () => {
  const result = await fetchSource({
    url: new URL("https://www.ccf.org.ph/chronicle/"),
    etag: '"same"',
    fetchImpl: async () => new Response(null, { status: 304 }),
  });
  assert.equal(result.kind, "not_modified");
});

test("returns ok with body and validators for a fresh HTML page", async () => {
  const result = await fetchSource({
    url: new URL("https://www.ccf.org.ph/chronicle/"),
    fetchImpl: async () =>
      new Response(OK_HTML, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          etag: '"v2"',
          "last-modified": "Thu, 03 Sep 2026 08:00:00 GMT",
        },
      }),
  });
  assert.equal(result.kind, "ok");
  if (result.kind === "ok") {
    assert.match(result.body, /<p>Hi<\/p>/);
    assert.equal(result.etag, '"v2"');
    assert.equal(result.lastModified, "Thu, 03 Sep 2026 08:00:00 GMT");
  }
});

test("refuses a disallowed URL before making any request", async () => {
  let called = false;
  const result = await fetchSource({
    url: new URL("https://www.ccf.org.ph/wp-json/wp/v2/pages"),
    fetchImpl: async () => {
      called = true;
      return new Response("", { status: 200 });
    },
  });
  assert.equal(called, false);
  assert.equal(result.kind, "blocked");
});

test("returns http_error for a 500 after retries", async () => {
  let calls = 0;
  const result = await fetchSource({
    url: new URL("https://www.ccf.org.ph/chronicle/"),
    fetchImpl: async () => {
      calls += 1;
      return new Response("nope", { status: 500 });
    },
    retryDelaysMs: [0, 0],
  });
  assert.equal(result.kind, "http_error");
  assert.equal(calls, 3);
});

import assert from "node:assert/strict";
import test from "node:test";

const pageUrl =
  process.env.NEW_HERE_PAGE_URL ?? "http://localhost:3001/visit/new-here";

test("the New Here page shows the video placeholder, not a live video", async () => {
  const response = await fetch(pageUrl);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Video coming soon/);
  // Content is pulled until CCF Centris has its own welcome video (see the
  // page's doc comment) — a stray <video> tag would mean an old build.
  assert.doesNotMatch(html, /<video[^>]*data-welcome-video="true"[^>]*>/);
});

test("the site advertises the CCF mark as its browser icon", async () => {
  const response = await fetch(pageUrl);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(
    html,
    /<link(?=[^>]*rel="icon")(?=[^>]*href="\/icon\.svg\?[^\"]+")(?=[^>]*type="image\/svg\+xml")(?=[^>]*sizes="any")[^>]*\/>/,
  );
  assert.doesNotMatch(html, /href="\/favicon\.ico/);
});

import assert from "node:assert/strict";
import test from "node:test";

const pageUrl =
  process.env.NEW_HERE_PAGE_URL ?? "http://localhost:3001/visit/new-here";

test("the New Here page presents the welcome video as an on-demand player", async () => {
  const response = await fetch(pageUrl);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<h2[^>]*>Welcome to CCF<\/h2>/);
  assert.match(html, /<video[^>]*data-welcome-video="true"[^>]*>/);
  assert.match(html, /<video[^>]*controls=""[^>]*>/);
  assert.match(html, /<video[^>]*preload="metadata"[^>]*>/);
  assert.match(
    html,
    /<video[^>]*poster="\/videos\/welcome-to-ccf-poster\.jpg"[^>]*>/,
  );
  assert.match(
    html,
    /<source src="\/videos\/Welcome to Christ&#x27;s Commission Fellowship!\.mp4" type="video\/mp4"\/?>/,
  );
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

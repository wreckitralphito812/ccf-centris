import assert from "node:assert/strict";
import test from "node:test";

import { absoluteCcfUrl, sanitizeImportedHtml } from "./html";

test("removes executable markup and unsafe links", () => {
  const clean = sanitizeImportedHtml(
    '<p onclick="x()">Safe</p><script>x()</script><a href="javascript:x()">bad</a>',
  );
  assert.equal(clean, "<p>Safe</p><a>bad</a>");
});

test("keeps allowed structural tags and safe links", () => {
  const clean = sanitizeImportedHtml(
    '<h2>Title</h2><p>Read <a href="https://www.ccf.org.ph/x/">this</a></p><ul><li>one</li></ul>',
  );
  assert.equal(
    clean,
    '<h2>Title</h2><p>Read <a href="https://www.ccf.org.ph/x/">this</a></p><ul><li>one</li></ul>',
  );
});

test("strips iframes from unknown hosts but keeps youtube embeds", () => {
  const evil = sanitizeImportedHtml('<iframe src="https://evil.example/x"></iframe>');
  assert.equal(evil, "");
  const yt = sanitizeImportedHtml(
    '<iframe src="https://www.youtube.com/embed/abc"></iframe>',
  );
  assert.match(yt, /youtube\.com\/embed\/abc/);
});

test("absoluteCcfUrl resolves against the page and rejects other schemes", () => {
  assert.equal(
    absoluteCcfUrl("/download/123/", "https://www.ccf.org.ph/chronicle/"),
    "https://www.ccf.org.ph/download/123/",
  );
  assert.equal(
    absoluteCcfUrl("https://glc.ccf.org.ph/course/x/", "https://glc.ccf.org.ph/"),
    "https://glc.ccf.org.ph/course/x/",
  );
  assert.equal(absoluteCcfUrl("javascript:alert(1)", "https://www.ccf.org.ph/"), null);
  assert.equal(absoluteCcfUrl("", "https://www.ccf.org.ph/"), null);
});

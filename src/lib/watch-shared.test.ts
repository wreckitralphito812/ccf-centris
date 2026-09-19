import assert from "node:assert/strict";
import test from "node:test";

import { replayLabelDate, videoIdFromInput } from "./watch-shared";

test("reads the video id from every kind of YouTube link", () => {
  const id = "_bp8IPnOGvI";
  for (const s of [
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=30s`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/live/${id}?feature=share`,
    `https://m.youtube.com/watch?v=${id}`,
    `youtube.com/shorts/${id}`,
  ]) {
    assert.equal(videoIdFromInput(s), id, s);
  }
});

test("refuses anything that isn't a YouTube video", () => {
  for (const s of ["", "hello", "https://vimeo.com/123456789", "https://www.youtube.com/@CCFmainTV", "https://ccfnet.online.church/"]) {
    assert.equal(videoIdFromInput(s), null, s);
  }
});

test("writes dates the way CCF Net does", () => {
  assert.equal(replayLabelDate("2026-09-06"), "September 6, 2026");
});

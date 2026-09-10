import assert from "node:assert/strict";
import test from "node:test";

import {
  isoFromDateLabel,
  parseReplayTitle,
  videoIdFromCcfNetHtml,
} from "./ccf-net";

const page = (data: unknown) =>
  `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
    data,
  )}</script></body></html>`;

test("reads the service video id out of CCF Net's page data", () => {
  const html = page({
    props: {
      initialState: {
        service: {
          content: {
            video: {
              type: "embed",
              source:
                '<iframe width="1183" src="https://www.youtube.com/embed/_bp8IPnOGvI;controls=0&amp;rel=0" title="x"></iframe>',
            },
          },
        },
      },
    },
  });
  assert.equal(videoIdFromCcfNetHtml(html), "_bp8IPnOGvI");
});

test("returns null when CCF Net has no current service video", () => {
  assert.equal(
    videoIdFromCcfNetHtml(page({ props: { initialState: { service: { content: null } } } })),
    null,
  );
  assert.equal(videoIdFromCcfNetHtml("<html></html>"), null);
  assert.equal(
    videoIdFromCcfNetHtml('<script id="__NEXT_DATA__">{not json</script>'),
    null,
  );
});

test("splits a CCF Net replay title into message, speaker, and date", () => {
  assert.deepEqual(
    parseReplayTitle(
      "Who Are We Called To Love Today? | Edric Mendoza | September 6, 2026",
    ),
    {
      title: "Who Are We Called To Love Today?",
      speaker: "Edric Mendoza",
      dateLabel: "September 6, 2026",
      date: "2026-09-06",
    },
  );
});

test("keeps a title with no speaker or date whole", () => {
  assert.deepEqual(parseReplayTitle("Sunday Service"), {
    title: "Sunday Service",
    speaker: null,
    dateLabel: null,
    date: null,
  });
});

test("date labels parse only when they name a real day", () => {
  assert.equal(isoFromDateLabel("Sept. 6, 2026"), "2026-09-06");
  assert.equal(isoFromDateLabel("February 30, 2026"), null);
  assert.equal(isoFromDateLabel("next Sunday"), null);
});

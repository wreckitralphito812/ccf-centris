# CCF content sync

The site mirrors a handful of public CCF pages so they stay current without
anyone editing this repo by hand. There is **no database and no runtime
secret** — synced content is a single committed JSON file, refreshed by a
scheduled GitHub Action.

## What is synced

| Section | Source page | Site route |
| --- | --- | --- |
| `resources` | `ccf.org.ph/resources/` | `/grow/resources` |
| `scriptureMemory` | `ccf.org.ph/52-week-scripture/` | `/grow/resources/scripture-memory` |
| `chronicleIssues` | `ccf.org.ph/chronicle/` | `/grow/resources/chronicle` |
| `intercede` | `ccf.org.ph/intercede/` | `/intercede` |
| `glcClasses` | `glc.ccf.org.ph` library | `/grow/glc` |

Teaching (messages, series, speakers, 4Ws) is added by a later plan and lands in
the same file.

## The snapshot

`src/data/generated/public-content.json` — one key per section plus a `meta`
block (per-section `lastRunAt`, `checksum`, `parserVersion`, `warnings`). Pages
read it only through `src/lib/queries.ts` (which re-exports
`src/lib/content/public-queries.ts`); a section that is empty falls back to the
hand-authored seed data where one exists.

The file is written atomically (temp file + rename) and only when a section
actually changed, so re-runs with no upstream change produce a byte-identical
file and no commit.

## Running it

```
npm run content:sync                 # sync every section, write the snapshot
npm run content:sync -- --dry-run    # fetch + parse + validate, write nothing
npm run content:sync -- --sections chronicleIssues,scriptureMemory
npm run content:sync -- --json       # machine-readable summary
npm run content:seed                 # write an empty shaped snapshot (first run / reset with --force)
```

The command holds `.content-sync.lock` while running and refuses to start if it
is already held. It exits non-zero if any section reported an error, so a failed
run is visible in CI and never ships a bad snapshot.

## The schedule

`.github/workflows/content-sync.yml` runs every 6 hours (and on manual
dispatch). It runs `npm run content:sync`, and if
`src/data/generated/public-content.json` changed, commits it as
`chore: refresh CCF content snapshot` and pushes to `main`. That push triggers
the normal deploy, so new CCF content is live one sync cycle later.

The job needs only `contents: write`. No secrets.

## Recovering from a bad snapshot

A sync that fails validation leaves the previous records in place, so the site
keeps serving the last good content. If a bad snapshot is somehow committed,
revert that commit:

```
git revert <sha of the bad "refresh CCF content snapshot" commit>
```

and, if needed, re-run `npm run content:sync` locally and commit the result.

## Source policy

Fetching is limited to `www.ccf.org.ph`, `ccf.org.ph`, and `glc.ccf.org.ph`.
For `glc.ccf.org.ph` only the published library and class/course pages are
fetched — never ordering, cart, checkout, account, or `/wp-json/` routes. All
hosts: no `/wp-json/`, no `?rest_route=`, no login/member/attachment/staging or
transaction-result pages. Other CCF properties (CCF Beyond, events, school, IDC)
are outbound links only and are never fetched.

Imported HTML bodies are sanitized against a narrow allowlist (headings, text,
lists, emphasis, quotes, links, figures, images, YouTube/Vimeo embeds); scripts,
styles, forms, event handlers, unknown iframes, and unsafe URL schemes are
removed.

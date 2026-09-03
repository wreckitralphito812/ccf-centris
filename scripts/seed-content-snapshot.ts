/**
 * Write an initial content snapshot.
 *
 * The four CCF index pages (Chronicle, 52-Week Scripture, Resources, Intercede)
 * do not survive as reconstructable HTML in the research corpus, so the real
 * seed comes from one live synchronization run:
 *
 *   npm run content:sync -- --json
 *
 * That command fetches the approved pages, runs the production parsers, and
 * writes `src/data/generated/public-content.json` atomically. This script only
 * needs to guarantee a shaped, valid file exists so the app and tests have
 * something to read before the first sync. Pages fall back to the hand-authored
 * seed data for any section that is still empty.
 *
 * Usage:
 *   npx tsx scripts/seed-content-snapshot.ts [--output <path>] [--force]
 */

import { existsSync } from "node:fs";

import {
  SNAPSHOT_PATH,
  emptySnapshot,
  readSnapshotFrom,
  writeSnapshotTo,
} from "../src/lib/content/snapshot";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const output = arg("output") ?? SNAPSHOT_PATH;
const force = process.argv.includes("--force");

if (existsSync(output) && !force) {
  const current = readSnapshotFrom(output);
  const total =
    current.resources.length +
    current.scriptureMemory.length +
    current.chronicleIssues.length +
    current.intercede.length +
    current.glcClasses.length;
  console.log(
    `Snapshot already present at ${output} (${total} records). ` +
      `Run \`npm run content:sync\` to refresh it, or pass --force to reset.`,
  );
  process.exit(0);
}

writeSnapshotTo(output, emptySnapshot());
console.log(`Wrote an empty shaped snapshot to ${output}.`);
console.log("Run `npm run content:sync` to populate it from ccf.org.ph.");

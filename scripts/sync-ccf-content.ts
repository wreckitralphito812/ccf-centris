/**
 * Local + CI entry point for the CCF content synchronization.
 *
 *   npm run content:sync                 # sync every section, write the snapshot
 *   npm run content:sync -- --dry-run    # fetch + parse + validate, write nothing
 *   npm run content:sync -- --sections chronicleIssues,scriptureMemory
 *   npm run content:sync -- --json       # machine-readable summary
 *
 * Exits non-zero if any section reported an error, so a failed scheduled run
 * is visible in CI without shipping a bad snapshot.
 */

import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_SECTIONS, runContentSync } from "../src/lib/content/sync";
import { SNAPSHOT_PATH, type SnapshotSection } from "../src/lib/content/snapshot";

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function value(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const dryRun = flag("dry-run");
const asJson = flag("json");
const sectionArg = value("sections");
const sections: SnapshotSection[] =
  sectionArg && sectionArg !== "all"
    ? (sectionArg.split(",").map((s) => s.trim()) as SnapshotSection[])
    : DEFAULT_SECTIONS;

const LOCK = join(process.cwd(), ".content-sync.lock");
if (existsSync(LOCK)) {
  console.error("Another content:sync run holds .content-sync.lock — aborting.");
  process.exit(2);
}
writeFileSync(LOCK, String(process.pid), "utf8");
process.on("exit", () => {
  try {
    rmSync(LOCK, { force: true });
  } catch {
    /* best effort */
  }
});

async function main() {
  const target = dryRun
    ? join(process.cwd(), ".content-sync.dry-run.json")
    : SNAPSHOT_PATH;

  const summary = await runContentSync({
    sections,
    snapshotPath: target,
  });

  if (dryRun) rmSync(target, { force: true });

  if (asJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(dryRun ? "content:sync (dry run)" : "content:sync");
    for (const [key, o] of Object.entries(summary.sections)) {
      if (!o) continue;
      const status = o.error
        ? `ERROR ${o.error}`
        : `+${o.inserted} ~${o.updated} skip ${o.skipped} drop ${o.dropped}`;
      console.log(`  ${key.padEnd(18)} ${status}`);
    }
    console.log(summary.changed ? "  snapshot updated" : "  snapshot unchanged");
  }

  const failed = Object.values(summary.sections).some((o) => o?.error);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

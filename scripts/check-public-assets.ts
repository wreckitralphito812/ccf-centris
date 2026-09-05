/**
 * Pre-deploy gate: every string literal that looks like a `/public`-relative
 * asset reference (e.g. "/videos/welcome-to-ccf.mp4", "/logos/ccf-mark.svg")
 * must resolve to a real file under `public/`. Catches a renamed or deleted
 * asset before it ships as a 404 in production, rather than after.
 *
 * Scans .ts/.tsx source under src/ for string literals starting with "/" that
 * have a file extension, and checks each against the public/ directory.
 */

import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");

// A public-relative path: leading slash, at least one segment, ends in a
// file extension. Excludes API routes and dynamic paths (those containing
// template interpolation are skipped since they aren't static literals).
const ASSET_LITERAL = /["'`](\/[a-zA-Z0-9._\-/]+\.[a-zA-Z0-9]{2,5})["'`]/g;

// Extensions actually served from public/ in this project. Anything else
// (e.g. "/api/foo.json" style dynamic routes) is not a public asset and is
// ignored rather than flagged.
const ASSET_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "svg",
  "gif",
  "webp",
  "avif",
  "ico",
  "mp4",
  "webm",
  "mov",
  "pdf",
  "woff",
  "woff2",
  "ttf",
]);

function findSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findSourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function extOf(path: string): string {
  const m = path.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "";
}

function main(): void {
  const files = findSourceFiles(join(ROOT, "src"));
  const missing: { file: string; ref: string }[] = [];
  let checked = 0;

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    for (const match of src.matchAll(ASSET_LITERAL)) {
      const ref = match[1];
      const ext = extOf(ref);
      if (!ASSET_EXTENSIONS.has(ext)) continue;

      checked += 1;
      const onDisk = join(PUBLIC_DIR, ref);
      const ok = existsSync(onDisk) && statSync(onDisk).isFile();
      if (!ok) {
        missing.push({ file: file.replace(ROOT + "\\", "").replace(ROOT + "/", ""), ref });
      }
    }
  }

  if (missing.length) {
    console.error(`Found ${missing.length} broken public asset reference(s):\n`);
    for (const { file, ref } of missing) {
      console.error(`  ${file} -> ${ref} (no file at public${ref})`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Checked ${checked} public asset reference(s) across ${files.length} file(s) — all resolved.`);
}

main();

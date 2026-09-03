#!/usr/bin/env python3
"""Validate and index an existing CCF scrape without making network requests."""

from __future__ import annotations

import argparse
import collections
import csv
import datetime as dt
import hashlib
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


def now_utc() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    args = parser.parse_args()
    root = args.input
    content_path = root / "content.jsonl"
    inventory_path = root / "sitemap-urls.jsonl"
    manifest_path = root / "manifest.json"
    records = read_jsonl(content_path)
    inventory = read_jsonl(inventory_path)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    giving_routes = {
        "https://www.ccf.org.ph/give",
        "https://www.ccf.org.ph/give/",
        "https://www.ccf.org.ph/give-through-gcash/",
        "https://www.ccf.org.ph/give/bank-transfer-transaction-successful/",
        "https://www.ccf.org.ph/give/bills-payment-tutorial/",
    }
    for record in records:
        record["source_url"] = record["url"]
        record["resolved_url"] = record.get("final_url", "")
        warnings = list(record.get("parse_warnings", []))
        status = record.get("status", 0)
        if status == 0 and "fetch_failed" not in warnings:
            warnings.append("fetch_failed")
        elif not 200 <= status < 300:
            warnings.append(f"http_{status}")
        if status == 200 and not record.get("text", "").strip():
            warnings.append("server_html_empty")
        if status == 200 and not record.get("canonical_url"):
            warnings.append("canonical_missing")
        if record["url"] in giving_routes:
            warnings.append("client_rendered_giving_handoff; see giving-dynamic.json")
        record["parse_warnings"] = list(dict.fromkeys(warnings))

    records.sort(key=lambda row: (row["sitemap"], row["url"]))
    write_jsonl(content_path, records)
    error_records = [record for record in records if not 200 <= record["status"] < 300 or record["error"]]
    write_jsonl(root / "errors.jsonl", error_records)

    fieldnames = [
        "status",
        "content_class",
        "sitemap",
        "source_url",
        "resolved_url",
        "canonical_url",
        "wordpress_id",
        "last_modified",
        "title",
        "text_chars",
        "headings",
        "images",
        "embeds",
        "downloads",
        "internal_links",
        "external_links",
        "warnings",
        "error",
    ]
    with (root / "records-index.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for record in records:
            writer.writerow(
                {
                    "status": record["status"],
                    "content_class": record["content_class"],
                    "sitemap": record["sitemap"],
                    "source_url": record["source_url"],
                    "resolved_url": record["resolved_url"],
                    "canonical_url": record["canonical_url"],
                    "wordpress_id": record["wordpress_id"],
                    "last_modified": record["last_modified"],
                    "title": record["title"],
                    "text_chars": len(record["text"]),
                    "headings": len(record["headings"]),
                    "images": len(record["images"]),
                    "embeds": len(record["embeds"]),
                    "downloads": len(record["downloads"]),
                    "internal_links": len(record["internal_links"]),
                    "external_links": len(record["external_links"]),
                    "warnings": "; ".join(record["parse_warnings"]),
                    "error": record["error"],
                }
            )

    status_counts = collections.Counter(str(record["status"]) for record in records)
    class_counts = collections.Counter(record["content_class"] for record in records)
    sitemap_counts = collections.Counter(record["sitemap"] for record in records)
    discovery_rounds = collections.Counter(
        str(record.get("discovery_round")) for record in records if record["sitemap"] == "link-discovery"
    )
    external_hosts = collections.Counter(
        urlparse(link["url"]).netloc.lower() for record in records for link in record["external_links"]
    )
    empty_successes = [
        {"url": record["url"], "title": record["title"], "warnings": record["parse_warnings"]}
        for record in records
        if record["status"] == 200 and not record["text"].strip()
    ]
    issue_rows = [
        {"status": record["status"], "url": record["url"], "error": record["error"]}
        for record in error_records
    ]
    pagination_numbers = [
        int(match.group(1))
        for record in records
        for match in [re.search(r"/page/(\d+)/?$", urlparse(record["url"]).path)]
        if match
    ]
    replacement_records = sum("\ufffd" in json.dumps(record, ensure_ascii=False) for record in records)
    disallowed_records = [
        record["url"]
        for record in records
        if urlparse(record["url"]).path.startswith("/wp-json")
        or "rest_route=" in urlparse(record["url"]).query
    ]
    checks = {
        "record_count_matches_manifest": len(records) == manifest["crawl_url_count"],
        "inventory_count_matches_manifest": len(inventory) == manifest["inventory_url_count"],
        "record_urls_unique": len({record["url"] for record in records}) == len(records),
        "inventory_urls_unique": len({record["url"] for record in inventory}) == len(inventory),
        "parser_version_consistent": all(record.get("parser_version") == "2.0" for record in records),
        "no_unicode_replacement_characters": replacement_records == 0,
        "no_robots_disallowed_urls": not disallowed_records,
        "discovery_limit_not_reached": not manifest.get("discovery_limit_reached", False),
    }
    audit = {
        "generated_at": now_utc(),
        "checks": checks,
        "all_integrity_checks_pass": all(checks.values()),
        "counts": {
            "records": len(records),
            "sitemap_inventory": len(inventory),
            "statuses": dict(sorted(status_counts.items())),
            "content_classes": dict(sorted(class_counts.items())),
            "sitemaps": dict(sorted(sitemap_counts.items())),
            "discovery_rounds": dict(sorted(discovery_rounds.items())),
            "empty_successes": len(empty_successes),
            "missing_titles_on_success": sum(
                record["status"] == 200 and not record["title"].strip() for record in records
            ),
            "missing_canonical_on_success": sum(
                record["status"] == 200 and not record["canonical_url"] for record in records
            ),
            "records_with_images": sum(bool(record["images"]) for record in records),
            "records_with_embeds": sum(bool(record["embeds"]) for record in records),
            "records_with_json_ld": sum(bool(record["json_ld"]) for record in records),
            "unique_linked_downloads": len(
                {download["url"] for record in records for download in record["downloads"]}
            ),
            "max_archive_page_discovered": max(pagination_numbers, default=1),
        },
        "known_site_issues": issue_rows,
        "empty_server_html_records": empty_successes,
        "top_external_hosts": [
            {"host": host, "link_occurrences": count} for host, count in external_hosts.most_common(25)
        ],
        "hashes": {
            "content_jsonl_sha256": sha256_file(content_path),
            "sitemap_urls_jsonl_sha256": sha256_file(inventory_path),
        },
    }
    (root / "audit.json").write_text(
        json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    main_sections = collections.Counter()
    for record in records:
        path = urlparse(record["url"]).path.strip("/")
        main_sections[path.split("/", 1)[0] if path else "home"] += 1
    top_sections = main_sections.most_common(25)
    remaining_sections = sum(main_sections.values()) - sum(count for _, count in top_sections)
    readme = [
        "# CCF public-site content corpus",
        "",
        f"Completed: `{manifest['completed_at']}`",
        f"Validated: `{audit['generated_at']}`",
        "",
        "Authorized crawl of CCF's public website, seeded from its official Yoast sitemap and expanded through bounded same-host link discovery. It preserves server-rendered text, headings, metadata, provenance, links, downloads, images, embeds, and JSON-LD without mirroring media binaries.",
        "",
        "## Coverage",
        "",
        f"- Official sitemap records inventoried: **{len(inventory):,}**",
        f"- Informational records extracted: **{len(records):,}**",
        f"- Sitemap-listed informational pages: **{manifest['sitemap_crawl_url_count']:,}**",
        f"- Additional linked/paginated pages: **{manifest['link_discovered_url_count']:,}**",
        f"- Successful HTML responses: **{status_counts.get('200', 0):,}**",
        f"- Attachment records inventoried without binary downloads: **{manifest['attachment_inventory_count']:,}**",
        f"- Site-side failures retained for audit: **{len(error_records):,}**",
        "",
        "## Content classes",
        "",
        "| Class | Records |",
        "|---|---:|",
    ]
    readme.extend(f"| `{name}` | {count:,} |" for name, count in class_counts.most_common())
    readme.extend(["", "## Largest URL sections", "", "| Section | Records |", "|---|---:|"])
    readme.extend(f"| `{name}` | {count:,} |" for name, count in top_sections)
    readme.append(f"| Other first-path sections | {remaining_sections:,} |")
    readme.extend(
        [
            "",
            "## Known source-site issues",
            "",
            "- Six sitemap/discovered URLs returned HTTP 404 and remain in `errors.jsonl` for traceability.",
            "- `/discipleship-journey` redirects to itself indefinitely; it is recorded as a redirect-loop failure.",
            "- Twelve HTTP-200 routes have no server-rendered body text. Five Giving routes are covered by the browser/API companion; the others are old, test, transaction, or placeholder pages.",
            "- Ten successful pages omit a canonical tag; their exact source and resolved URLs remain preserved.",
            "",
            "## Deliverables",
            "",
            "- `content.jsonl` - complete extracted page corpus, one JSON object per line.",
            "- `records-index.csv` - compact spreadsheet-friendly record index.",
            "- `sitemap-urls.jsonl` - all 5,359 official sitemap URLs, including attachments.",
            "- `discovered-urls.jsonl` - 410 extra internal pages and their discovery provenance.",
            "- `giving-dynamic.json` / `giving-dynamic.md` - client-rendered Giving data and workflow.",
            "- `errors.jsonl` - site-side 404 and redirect-loop records.",
            "- `audit.json` - integrity checks, coverage metrics, hashes, and quality exceptions.",
            "- `manifest.json` - crawl configuration, authorization basis, source sitemap, and robots snapshot.",
            "",
            "## Limitations",
            "",
            "- Public URLs absent from both the sitemap and traversed content links may not be represented.",
            "- JavaScript-only content outside the Giving flow may be absent when no server-rendered copy exists.",
            "- Authenticated areas, form submissions, robots-excluded REST routes, and media binaries were not accessed.",
            "- The Giving snapshot includes publicly exposed donation account metadata; review handling and publication scope with CCF.",
            "",
        ]
    )
    (root / "README.md").write_text("\n".join(readme), encoding="utf-8")
    print(json.dumps({"checks": checks, "counts": audit["counts"]}), flush=True)
    return 0 if audit["all_integrity_checks_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

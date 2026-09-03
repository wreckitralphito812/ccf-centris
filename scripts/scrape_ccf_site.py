#!/usr/bin/env python3
"""Authorized public-content crawl of ccf.org.ph from its official sitemap.

The crawler honors the site's robots.txt exclusions by never using WordPress
REST routes. It extracts text and structure, records media/document URLs, and
does not submit forms or enter authenticated areas.
"""

from __future__ import annotations

import argparse
import collections
import concurrent.futures
import datetime as dt
import hashlib
import html
import json
import re
import threading
import time
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

import requests


BASE_HOST = "www.ccf.org.ph"
ALLOWED_HOSTS = {BASE_HOST, "ccf.org.ph"}
ROBOTS_URL = f"https://{BASE_HOST}/robots.txt"
SITEMAP_INDEX = f"https://{BASE_HOST}/sitemap_index.xml"
USER_AGENT = "CCF-authorized-site-inventory/1.0 (+https://www.ccf.org.ph/)"
PARSER_VERSION = "2.0"
SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
ATTACHMENT_PREFIX = "attachment-sitemap"
SPACE_RE = re.compile(r"[ \t\f\v]+")
EMAIL_RE = re.compile(r"(?<![\w.+-])[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}(?![\w.-])")
PHONE_RE = re.compile(r"(?<!\w)(?:\+?\d[\d ()-]{6,}\d)(?!\w)")
DOWNLOAD_EXTENSIONS = {
    ".doc",
    ".docx",
    ".epub",
    ".m4a",
    ".mp3",
    ".mp4",
    ".pdf",
    ".ppt",
    ".pptx",
    ".wav",
    ".xls",
    ".xlsx",
    ".zip",
}
THREAD_LOCAL = threading.local()


def now_utc() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def decode_response(response: requests.Response) -> str:
    # The WordPress pages declare UTF-8 in markup, but some omit it in headers.
    return response.content.decode("utf-8", errors="replace")


def canonicalize_url(value: str, base: str) -> str:
    value = html.unescape(value.strip())
    if not value or value.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return ""
    parsed = urlparse(urljoin(base, value))
    if parsed.scheme not in {"http", "https"}:
        return ""
    path = re.sub(r"/{2,}", "/", parsed.path or "/")
    return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), path, "", parsed.query, ""))


def get_session() -> requests.Session:
    session = getattr(THREAD_LOCAL, "session", None)
    if session is None:
        session = requests.Session()
        session.headers.update(
            {
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.7",
                "Accept-Language": "en-US,en;q=0.8",
            }
        )
        THREAD_LOCAL.session = session
    return session


def fetch(url: str, timeout: float, retries: int = 3) -> requests.Response:
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            response = get_session().get(url, timeout=timeout, allow_redirects=True)
            if response.status_code in {429, 500, 502, 503, 504} and attempt < retries:
                time.sleep(1.5 * (attempt + 1))
                continue
            return response
        except requests.RequestException as error:
            last_error = error
            if attempt < retries:
                time.sleep(1.5 * (attempt + 1))
    assert last_error is not None
    raise last_error


class PageParser(HTMLParser):
    """Extract semantic text and linked resources from server-rendered HTML."""

    BLOCK_TAGS = {
        "address",
        "article",
        "aside",
        "blockquote",
        "dd",
        "div",
        "dl",
        "dt",
        "figcaption",
        "figure",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "li",
        "main",
        "p",
        "section",
        "td",
        "th",
        "time",
        "tr",
    }
    SKIP_TAGS = {"canvas", "footer", "form", "header", "nav", "noscript", "style", "svg", "template"}
    VOID_TAGS = {
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr",
    }
    SKIP_CLASS_OR_ID_RE = re.compile(
        r"(?:^|[\s_-])(?:cookie(?:[\s_-]|$)|mobmenu(?:[\s_-]|$)|mobile-menu(?:[\s_-]|$)|popup(?:[\s_-]|$))",
        re.IGNORECASE,
    )

    def __init__(self, base_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.skip_stack: list[str] = []
        self.title_parts: list[str] = []
        self.in_title = False
        self.body_tokens: list[str] = []
        self.heading_level = 0
        self.heading_parts: list[str] = []
        self.headings: list[dict[str, Any]] = []
        self.anchor_url = ""
        self.anchor_raw_href = ""
        self.anchor_parts: list[str] = []
        self.links: list[dict[str, str]] = []
        self.images: list[dict[str, str]] = []
        self.embeds: list[dict[str, str]] = []
        self.metadata: dict[str, str] = {}
        self.canonical_url = ""
        self.language = ""
        self.body_classes: list[str] = []
        self.json_ld: list[Any] = []
        self.in_json_ld = False
        self.json_ld_parts: list[str] = []

    @staticmethod
    def attrs(attrs: list[tuple[str, str | None]]) -> dict[str, str]:
        return {key.lower(): (value or "") for key, value in attrs}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        attr = self.attrs(attrs)
        if self.skip_stack:
            if tag not in self.VOID_TAGS:
                self.skip_stack.append(tag)
            return

        if tag == "script" and attr.get("type", "").lower() == "application/ld+json":
            self.in_json_ld = True
            self.json_ld_parts = []
            return
        class_and_id = f"{attr.get('class', '')} {attr.get('id', '')}"
        if (
            tag == "script"
            or tag in self.SKIP_TAGS
            or attr.get("aria-hidden", "").lower() == "true"
            or self.SKIP_CLASS_OR_ID_RE.search(class_and_id)
        ):
            if tag not in self.VOID_TAGS:
                self.skip_stack.append(tag)
            return

        if tag == "title":
            self.in_title = True
        elif tag == "html":
            self.language = attr.get("lang", "").strip()
        elif tag == "body":
            self.body_classes = attr.get("class", "").split()
        elif tag == "meta":
            key = (attr.get("name") or attr.get("property") or "").strip().lower()
            value = SPACE_RE.sub(" ", attr.get("content", "")).strip()
            if key and value and key in {
                "description",
                "og:description",
                "og:image",
                "og:site_name",
                "og:title",
                "og:type",
                "og:url",
                "robots",
                "article:modified_time",
                "article:published_time",
                "twitter:card",
                "twitter:description",
                "twitter:image",
                "twitter:title",
            }:
                self.metadata[key] = value
        elif tag == "link" and "canonical" in attr.get("rel", "").lower().split():
            self.canonical_url = canonicalize_url(attr.get("href", ""), self.base_url)
        elif tag == "a":
            raw_href = attr.get("href", "").strip()
            self.anchor_url = canonicalize_url(raw_href, self.base_url)
            self.anchor_parts = []
            self.anchor_raw_href = raw_href
        elif tag == "img":
            source = attr.get("data-src") or attr.get("data-lazy-src") or attr.get("src") or ""
            url = canonicalize_url(source, self.base_url)
            if url:
                self.images.append(
                    {
                        "url": url,
                        "raw_src": source,
                        "src": canonicalize_url(attr.get("src", ""), self.base_url),
                        "data_src": canonicalize_url(attr.get("data-src", ""), self.base_url),
                        "srcset": attr.get("data-srcset") or attr.get("srcset", ""),
                        "alt": SPACE_RE.sub(" ", attr.get("alt", "")).strip(),
                        "title": SPACE_RE.sub(" ", attr.get("title", "")).strip(),
                        "width": attr.get("width", "").strip(),
                        "height": attr.get("height", "").strip(),
                    }
                )
        elif tag in {"audio", "iframe", "source", "video"}:
            source = attr.get("data-src") or attr.get("src", "")
            url = canonicalize_url(source, self.base_url)
            if url:
                self.embeds.append(
                    {
                        "type": tag,
                        "url": url,
                        "src": canonicalize_url(attr.get("src", ""), self.base_url),
                        "data_src": canonicalize_url(attr.get("data-src", ""), self.base_url),
                        "title": attr.get("title", "").strip(),
                        "width": attr.get("width", "").strip(),
                        "height": attr.get("height", "").strip(),
                    }
                )

        if tag in self.BLOCK_TAGS:
            self.body_tokens.append("\n")
        if re.fullmatch(r"h[1-6]", tag):
            self.heading_level = int(tag[1])
            self.heading_parts = []

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if not self.skip_stack:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if self.skip_stack:
            if tag in self.skip_stack:
                reverse_index = self.skip_stack[::-1].index(tag)
                del self.skip_stack[len(self.skip_stack) - reverse_index - 1 :]
            return
        if tag == "script" and self.in_json_ld:
            raw = "".join(self.json_ld_parts).strip()
            if raw:
                try:
                    self.json_ld.append(json.loads(raw))
                except json.JSONDecodeError:
                    pass
            self.in_json_ld = False
            self.json_ld_parts = []
            return
        if tag == "title":
            self.in_title = False
        if tag == "a" and self.anchor_url:
            label = SPACE_RE.sub(" ", " ".join(self.anchor_parts)).strip()
            parsed = urlparse(self.anchor_url)
            self.links.append(
                {
                    "url": self.anchor_url,
                    "raw_href": self.anchor_raw_href,
                    "text": label,
                    "query": parsed.query,
                    "fragment": urlparse(urljoin(self.base_url, self.anchor_raw_href)).fragment,
                }
            )
            self.anchor_url = ""
            self.anchor_raw_href = ""
            self.anchor_parts = []
        if re.fullmatch(r"h[1-6]", tag) and self.heading_level:
            value = SPACE_RE.sub(" ", " ".join(self.heading_parts)).strip()
            if value:
                self.headings.append({"level": self.heading_level, "text": value})
            self.heading_level = 0
            self.heading_parts = []
        if tag in self.BLOCK_TAGS:
            self.body_tokens.append("\n")

    def handle_data(self, data: str) -> None:
        if self.skip_stack:
            return
        if self.in_json_ld:
            self.json_ld_parts.append(data)
            return
        value = SPACE_RE.sub(" ", data).strip()
        if not value:
            return
        if self.in_title:
            self.title_parts.append(value)
            return
        self.body_tokens.append(value + " ")
        if self.heading_level:
            self.heading_parts.append(value)
        if self.anchor_url:
            self.anchor_parts.append(value)

    @staticmethod
    def unique_dicts(items: list[dict[str, str]], key: str) -> list[dict[str, str]]:
        seen: set[str] = set()
        result = []
        for item in items:
            value = item[key]
            if value and value not in seen:
                seen.add(value)
                result.append(item)
        return result

    def result(self) -> dict[str, Any]:
        raw = "".join(self.body_tokens)
        blocks: list[str] = []
        seen_blocks: set[str] = set()
        for line in raw.splitlines():
            value = SPACE_RE.sub(" ", line).strip()
            normalized = value.casefold()
            if value and normalized not in seen_blocks:
                seen_blocks.add(normalized)
                blocks.append(value)
        text = "\n".join(blocks)
        links = self.unique_dicts(self.links, "url")
        internal_links = [item for item in links if urlparse(item["url"]).netloc.lower() in ALLOWED_HOSTS]
        external_links = [item for item in links if urlparse(item["url"]).netloc.lower() not in ALLOWED_HOSTS]
        downloads = [item for item in links if Path(urlparse(item["url"]).path).suffix.lower() in DOWNLOAD_EXTENSIONS]
        phones = sorted({SPACE_RE.sub(" ", match).strip() for match in PHONE_RE.findall(text)})
        return {
            "title": SPACE_RE.sub(" ", " ".join(self.title_parts)).strip(),
            "description": self.metadata.get("description", ""),
            "canonical_url": self.canonical_url,
            "language": self.language,
            "body_classes": self.body_classes,
            "metadata": self.metadata,
            "headings": self.headings,
            "text_blocks": blocks,
            "text": text,
            "emails": sorted(set(EMAIL_RE.findall(text))),
            "phones": phones,
            "internal_links": internal_links,
            "external_links": external_links,
            "downloads": downloads,
            "images": self.unique_dicts(self.images, "url"),
            "embeds": self.unique_dicts(self.embeds, "url"),
            "json_ld": self.json_ld,
        }


def sitemap_name(url: str) -> str:
    return Path(urlparse(url).path).stem


def parse_index(source: str) -> list[dict[str, str]]:
    root = ET.fromstring(source)
    rows = []
    for node in root.findall("sm:sitemap", SITEMAP_NS):
        url = node.findtext("sm:loc", default="", namespaces=SITEMAP_NS).strip()
        if url:
            rows.append(
                {
                    "name": sitemap_name(url),
                    "url": url,
                    "last_modified": node.findtext("sm:lastmod", default="", namespaces=SITEMAP_NS).strip(),
                }
            )
    return rows


def parse_sitemap(source: str, sitemap: dict[str, str]) -> list[dict[str, str]]:
    root = ET.fromstring(source)
    rows = []
    for node in root.findall("sm:url", SITEMAP_NS):
        url = node.findtext("sm:loc", default="", namespaces=SITEMAP_NS).strip()
        if url:
            rows.append(
                {
                    "url": url,
                    "last_modified": node.findtext("sm:lastmod", default="", namespaces=SITEMAP_NS).strip(),
                    "sitemap": sitemap["name"],
                    "sitemap_url": sitemap["url"],
                }
            )
    return rows


def infer_content_class(sitemap: str, body_classes: list[str], url: str) -> tuple[str, str, str]:
    class_set = set(body_classes)
    wordpress_type = ""
    if "single-sermon" in class_set:
        content_class, wordpress_type = "sermon", "sermon"
    elif "single-location" in class_set:
        content_class, wordpress_type = "location", "location"
    elif "single-post" in class_set:
        content_class, wordpress_type = "post", "post"
    elif "page" in class_set:
        content_class, wordpress_type = "page", "page"
    elif any(value.startswith("tax-") for value in class_set) or "archive" in class_set:
        content_class, wordpress_type = "taxonomy_archive", "taxonomy"
    elif sitemap.startswith("sermon-sitemap"):
        content_class, wordpress_type = "sermon", "sermon"
    elif sitemap == "location-sitemap":
        content_class, wordpress_type = "location", "location"
    elif sitemap.startswith("post"):
        content_class, wordpress_type = "post", "post"
    elif sitemap.endswith("-sitemap") and sitemap not in {"page-sitemap", "link-discovery"}:
        content_class, wordpress_type = "taxonomy_archive", "taxonomy"
    else:
        content_class, wordpress_type = "page", "page"
    if urlparse(url).path.startswith("/download/"):
        content_class = "download"
    wordpress_id = ""
    for value in body_classes:
        match = re.fullmatch(r"(?:page-id|postid|term)-(\d+)", value)
        if match:
            wordpress_id = match.group(1)
            break
    return content_class, wordpress_type, wordpress_id


def crawl_page(row: dict[str, str], timeout: float) -> dict[str, Any]:
    started = time.monotonic()
    result: dict[str, Any] = {**row, "fetched_at": now_utc(), "parser_version": PARSER_VERSION}
    try:
        response = fetch(row["url"], timeout=timeout)
        result.update(
            {
                "status": response.status_code,
                "final_url": response.url,
                "content_type": response.headers.get("content-type", ""),
                "elapsed_ms": round((time.monotonic() - started) * 1000),
                "error": "",
                "http": {
                    "status": response.status_code,
                    "content_type": response.headers.get("content-type", ""),
                    "content_length": response.headers.get("content-length", ""),
                    "content_disposition": response.headers.get("content-disposition", ""),
                    "etag": response.headers.get("etag", ""),
                    "last_modified": response.headers.get("last-modified", ""),
                    "x_robots_tag": response.headers.get("x-robots-tag", ""),
                },
                "sha256": hashlib.sha256(response.content).hexdigest(),
            }
        )
        if "html" in result["content_type"].lower():
            parser = PageParser(response.url)
            parser.feed(decode_response(response))
            result.update(parser.result())
        else:
            result.update(PageParser(response.url).result())
        content_class, wordpress_type, wordpress_id = infer_content_class(
            row["sitemap"], result["body_classes"], response.url
        )
        result.update(
            {
                "content_class": content_class,
                "wordpress_type": wordpress_type,
                "wordpress_id": wordpress_id,
                "parse_warnings": [],
            }
        )
    except Exception as error:
        result.update(
            {
                "status": 0,
                "final_url": "",
                "content_type": "",
                "elapsed_ms": round((time.monotonic() - started) * 1000),
                "error": f"{type(error).__name__}: {error}",
                "http": {},
                "sha256": "",
                **PageParser(row["url"]).result(),
                "content_class": "unknown",
                "wordpress_type": "",
                "wordpress_id": "",
                "parse_warnings": ["fetch_failed"],
            }
        )
    return result


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")


def discovery_candidate(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or parsed.netloc.lower() not in ALLOWED_HOSTS:
        return ""
    path_lower = parsed.path.lower()
    if path_lower.startswith(("/wp-admin", "/wp-json", "/wp-login", "/wp-content", "/wp-includes", "/xmlrpc")):
        return ""
    if path_lower.startswith("/download/") or Path(path_lower).suffix.lower() in DOWNLOAD_EXTENSIONS:
        return ""
    if path_lower.endswith(("/feed/", "/comments/")):
        return ""
    query = parse_qsl(parsed.query, keep_blank_values=True)
    allowed_query_keys = {"filter", "lang", "paged", "sf_paged"}
    if any(key not in allowed_query_keys for key, _ in query):
        return ""
    return urlunparse(
        (
            "https",
            BASE_HOST,
            re.sub(r"/{2,}", "/", parsed.path or "/"),
            "",
            urlencode(sorted(query)),
            "",
        )
    )


def summarize(manifest: dict[str, Any], records: list[dict[str, Any]]) -> str:
    by_sitemap = collections.Counter(record["sitemap"] for record in records)
    by_status = collections.Counter(str(record["status"]) for record in records)
    sections = collections.Counter()
    for record in records:
        path = urlparse(record["url"]).path.strip("/")
        sections[path.split("/", 1)[0] if path else "home"] += 1

    lines = [
        "# CCF public-site content corpus",
        "",
        f"Generated: `{manifest['completed_at']}`",
        "",
        "Authorized crawl of CCF's public website, discovered from its official Yoast sitemap. The corpus contains server-rendered text and structure plus linked asset URLs; it does not mirror media binaries.",
        "",
        "## Coverage",
        "",
        f"- Sitemap URL records: **{manifest['inventory_url_count']:,}**",
        f"- Informational URLs requested: **{manifest['crawl_url_count']:,}**",
        f"- Additional internal HTML URLs discovered: **{manifest['link_discovered_url_count']:,}**",
        f"- Successful HTML records: **{manifest['successful_html_count']:,}**",
        f"- Non-success or extraction errors: **{manifest['error_count']:,}**",
        f"- Attachment records inventoried without binary downloads: **{manifest['attachment_inventory_count']:,}**",
        "",
        "## Records by sitemap",
        "",
        "| Sitemap | Records |",
        "|---|---:|",
    ]
    lines.extend(f"| `{name}` | {count:,} |" for name, count in sorted(by_sitemap.items()))
    lines.extend(["", "## HTTP results", "", "| Status | Count |", "|---|---:|"])
    lines.extend(f"| `{status}` | {count:,} |" for status, count in sorted(by_status.items()))
    lines.extend(["", "## URL sections", "", "| First path segment | Records |", "|---|---:|"])
    lines.extend(f"| `{section}` | {count:,} |" for section, count in sections.most_common())
    lines.extend(
        [
            "",
            "## Deliverables",
            "",
            "- `content.jsonl`: one extracted informational page per line.",
            "- `sitemap-urls.jsonl`: complete sitemap inventory, including attachments.",
            "- `discovered-urls.jsonl`: additional internal pages found by bounded recursive link discovery.",
            "- `errors.jsonl`: records needing follow-up.",
            "- `manifest.json`: run metadata and explicit scope limitations.",
            "",
            "## Important limitations",
            "",
            "- Public URLs omitted from the official sitemap are not guaranteed to be present.",
            "- Text inserted only after client-side JavaScript execution may be absent.",
            "- Authenticated pages, form submissions, and robots-excluded REST endpoints were not accessed.",
            "- Media binaries were not downloaded; their public URLs and alt text are retained where exposed.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--limit", type=int, default=0, help="Limit pages for a validation run")
    parser.add_argument("--include-attachment-pages", action="store_true")
    parser.add_argument("--discovery-rounds", type=int, default=4)
    parser.add_argument("--max-discovered-pages", type=int, default=5000)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    started_at = now_utc()
    robots_response = fetch(ROBOTS_URL, args.timeout)
    robots_response.raise_for_status()
    robots_text = decode_response(robots_response).strip()
    if "Disallow: /wp-json/" not in robots_text or "Disallow: /?rest_route=" not in robots_text:
        raise RuntimeError("robots.txt changed; review crawl rules before continuing")

    index_response = fetch(SITEMAP_INDEX, args.timeout)
    index_response.raise_for_status()
    sitemaps = parse_index(decode_response(index_response))
    inventory: list[dict[str, str]] = []
    for sitemap in sitemaps:
        response = fetch(sitemap["url"], args.timeout)
        response.raise_for_status()
        inventory.extend(parse_sitemap(decode_response(response), sitemap))
    inventory.sort(key=lambda row: (row["sitemap"], row["url"]))
    write_jsonl(args.output / "sitemap-urls.jsonl", inventory)

    queue = [
        row
        for row in inventory
        if args.include_attachment_pages or not row["sitemap"].startswith(ATTACHMENT_PREFIX)
    ]
    if args.limit:
        queue = queue[: args.limit]

    partial_path = args.output / "content.partial.jsonl"
    completed_urls: set[str] = set()
    records: list[dict[str, Any]] = []
    if partial_path.exists():
        checkpoint_records = [
            json.loads(line)
            for line in partial_path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        if checkpoint_records and all(record.get("parser_version") == PARSER_VERSION for record in checkpoint_records):
            for record in checkpoint_records:
                completed_urls.add(record["url"])
                records.append(record)
        else:
            partial_path.unlink()
    pending = [row for row in queue if row["url"] not in completed_urls]
    discovered_rows: list[dict[str, Any]] = []

    with partial_path.open("a", encoding="utf-8", newline="\n") as checkpoint:
        def crawl_batch(batch: list[dict[str, Any]], label: str) -> list[dict[str, Any]]:
            batch_records: list[dict[str, Any]] = []
            if not batch:
                return batch_records
            with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
                futures = {executor.submit(crawl_page, row, args.timeout): row for row in batch}
                for number, future in enumerate(concurrent.futures.as_completed(futures), start=1):
                    record = future.result()
                    records.append(record)
                    batch_records.append(record)
                    completed_urls.add(record["url"])
                    checkpoint.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
                    if number % 25 == 0:
                        checkpoint.flush()
                    if number % 100 == 0 or number == len(batch):
                        print(f"{label}: {number}/{len(batch)} (total {len(records)})", flush=True)
            checkpoint.flush()
            return batch_records

        frontier = crawl_batch(pending, "sitemap")
        total_discovered = 0
        discovery_limit_reached = False
        for round_number in range(1, max(0, args.discovery_rounds) + 1):
            parents: dict[str, set[str]] = collections.defaultdict(set)
            for record in frontier:
                for link in record.get("internal_links", []):
                    candidate = discovery_candidate(link["url"])
                    if candidate and candidate not in completed_urls:
                        parents[candidate].add(record["url"])
            if not parents:
                break
            remaining = max(0, args.max_discovered_pages - total_discovered)
            if len(parents) > remaining:
                discovery_limit_reached = True
            selected = sorted(parents)[:remaining]
            if not selected:
                break
            batch = [
                {
                    "url": url,
                    "last_modified": "",
                    "sitemap": "link-discovery",
                    "sitemap_url": "",
                    "discovered_from": sorted(parents[url]),
                    "discovery_round": round_number,
                }
                for url in selected
            ]
            discovered_rows.extend(batch)
            total_discovered += len(batch)
            frontier = crawl_batch(batch, f"discovery-{round_number}")
            if discovery_limit_reached:
                break

    records.sort(key=lambda row: (row["sitemap"], row["url"]))
    write_jsonl(args.output / "content.jsonl", records)
    write_jsonl(args.output / "discovered-urls.jsonl", discovered_rows)
    errors = [record for record in records if not 200 <= record["status"] < 300 or record["error"]]
    write_jsonl(args.output / "errors.jsonl", errors)
    partial_path.unlink(missing_ok=True)

    attachment_count = sum(1 for row in inventory if row["sitemap"].startswith(ATTACHMENT_PREFIX))
    successful_html = sum(
        1 for record in records if 200 <= record["status"] < 300 and "html" in record["content_type"].lower()
    )
    manifest = {
        "authorization_basis": "User confirmed authorization to create a site for CCF on 2026-09-03.",
        "source": SITEMAP_INDEX,
        "robots_url": ROBOTS_URL,
        "robots_text": robots_text,
        "started_at": started_at,
        "completed_at": now_utc(),
        "inventory_url_count": len(inventory),
        "crawl_url_count": len(records),
        "sitemap_crawl_url_count": sum(1 for record in records if record["sitemap"] != "link-discovery"),
        "link_discovered_url_count": sum(1 for record in records if record["sitemap"] == "link-discovery"),
        "successful_html_count": successful_html,
        "error_count": len(errors),
        "attachment_inventory_count": attachment_count,
        "attachment_pages_requested": args.include_attachment_pages,
        "discovery_rounds_requested": args.discovery_rounds,
        "discovery_limit_reached": discovery_limit_reached,
        "sitemaps": [
            {
                **sitemap,
                "url_count": sum(1 for row in inventory if row["sitemap"] == sitemap["name"]),
            }
            for sitemap in sitemaps
        ],
        "limitations": [
            "Only public URLs advertised by the official sitemap are guaranteed in the inventory.",
            "WordPress REST endpoints disallowed by robots.txt were not accessed.",
            "Authenticated content and form submissions were not accessed.",
            "Client-rendered text may not exist in fetched server HTML.",
            "Media binaries were not downloaded.",
        ],
    }
    (args.output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (args.output / "README.md").write_text(summarize(manifest, records), encoding="utf-8")
    print(
        json.dumps(
            {
                "inventory_url_count": len(inventory),
                "crawl_url_count": len(records),
                "successful_html_count": successful_html,
                "error_count": len(errors),
            }
        ),
        flush=True,
    )
    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())

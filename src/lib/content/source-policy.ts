/**
 * Explicit allow/deny decisions for every URL the sync job might fetch.
 *
 * Network fetching is permitted only from the CCF-operated hosts below. For
 * `glc.ccf.org.ph` the allowance is further narrowed to the published library
 * and class/course pages; ordering, cart, checkout, account, and REST routes
 * are always rejected. Other CCF sibling hosts (school, events, IDC, CCF Beyond)
 * may be linked outbound but are never enqueued.
 *
 * Spec: docs/superpowers/specs/2026-09-03-live-content-sync-design.md
 */

import type { SourceDecision } from "./types";

const MAIN_HOSTS = new Set(["www.ccf.org.ph", "ccf.org.ph"]);
const GLC_HOST = "glc.ccf.org.ph";

/** WordPress REST surfaces, on any host. */
function isRestRoute(url: URL): boolean {
  if (url.pathname.startsWith("/wp-json/")) return true;
  if (url.searchParams.has("rest_route")) return true;
  return false;
}

/** Login, member-only, and admin areas. */
function isProtected(url: URL): boolean {
  const p = url.pathname.toLowerCase();
  return (
    p.startsWith("/wp-admin") ||
    p.includes("/login") ||
    p.includes("/my-account") ||
    p.includes("/account/") ||
    p.includes("dmember") ||
    p.includes("dleader") ||
    p.includes("dleaders-corner")
  );
}

/** Transaction result and commerce funnels. */
function isTransaction(url: URL): boolean {
  const p = url.pathname.toLowerCase();
  return (
    p.includes("/cart") ||
    p.includes("/checkout") ||
    p.includes("/order") ||
    p.includes("/give-success") ||
    p.includes("/give-failed") ||
    p.includes("/give-cancel") ||
    p.includes("payment-response") ||
    p.includes("transaction")
  );
}

/** Test, sandbox, staging, and superseded copies. */
function isStaging(url: URL): boolean {
  const p = url.pathname.toLowerCase();
  return (
    p.includes("sandbox") ||
    p.includes("staging") ||
    p.includes("/uat") ||
    p.includes("-test") ||
    p.includes("/test-") ||
    p.includes("old-version") ||
    p.includes("-old/") ||
    p.includes("maintenance")
  );
}

/** WordPress attachment shell pages. */
function isAttachment(url: URL): boolean {
  return url.searchParams.has("attachment_id") || /\/attachment\//.test(url.pathname);
}

/** Which GLC paths the pipeline is allowed to read. */
function isAllowedGlcPath(url: URL): boolean {
  const p = url.pathname.toLowerCase();
  return (
    p === "/" ||
    p.startsWith("/glc-library") ||
    p.startsWith("/library") ||
    p.startsWith("/course") ||
    p.startsWith("/courses") ||
    p.startsWith("/class") ||
    p.startsWith("/classes") ||
    p.startsWith("/track") ||
    p.startsWith("/series")
  );
}

export function classifySourceUrl(url: URL): SourceDecision {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { allowed: false, reason: "host" };
  }

  const host = url.hostname.toLowerCase();
  const known = MAIN_HOSTS.has(host) || host === GLC_HOST;
  if (!known) return { allowed: false, reason: "host" };

  if (isRestRoute(url)) return { allowed: false, reason: "rest" };
  if (isProtected(url)) return { allowed: false, reason: "protected" };
  if (isTransaction(url)) return { allowed: false, reason: "transaction" };
  if (isStaging(url)) return { allowed: false, reason: "staging" };
  if (isAttachment(url)) return { allowed: false, reason: "attachment" };

  if (host === GLC_HOST && !isAllowedGlcPath(url)) {
    return { allowed: false, reason: "protected" };
  }

  return { allowed: true, reason: "approved_public_source" };
}

/** True when a URL may be retained as an outbound link but never fetched. */
export function isCcfFamilyHost(url: URL): boolean {
  return /\.ccf\.org\.ph$/.test(url.hostname) || url.hostname === "ccf.org.ph";
}

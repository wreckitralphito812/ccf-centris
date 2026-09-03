#!/usr/bin/env python3
"""Capture the public data used by CCF's client-rendered Giving application."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path

import requests


APP_URL = "https://give-form.ccf.org.ph/"
API_URL = "https://give-api.ccf.org.ph/api/front/index"
ROBOTS_URL = "https://give-api.ccf.org.ph/robots.txt"
USER_AGENT = "CCF-authorized-site-inventory/1.0 (+https://www.ccf.org.ph/)"


def now_utc() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    headers = {"User-Agent": USER_AGENT, "Accept": "application/json", "Referer": APP_URL}
    robots_response = requests.get(ROBOTS_URL, timeout=30, headers=headers)
    robots_response.raise_for_status()
    robots_text = robots_response.content.decode("utf-8", errors="replace").strip()
    if "Disallow:" not in robots_text:
        raise RuntimeError("Unexpected Giving API robots.txt; review before continuing")

    observed_at = now_utc()
    response = requests.post(API_URL, timeout=30, headers=headers)
    response.raise_for_status()
    payload = response.json()
    if not payload.get("success") or not isinstance(payload.get("data"), dict):
        raise RuntimeError("Unexpected Giving API response")
    data = payload["data"]
    required = {"satellites", "missionaries", "banks", "bills_payment"}
    if not required.issubset(data):
        raise RuntimeError(f"Giving API response is missing keys: {sorted(required - set(data))}")

    snapshot = {
        "source": API_URL,
        "application": APP_URL,
        "robots_url": ROBOTS_URL,
        "robots_text": robots_text,
        "observed_at": observed_at,
        "authorization_basis": "User confirmed authorization to create a site for CCF on 2026-09-03.",
        "http": {
            "status": response.status_code,
            "content_type": response.headers.get("content-type", ""),
            "content_length": len(response.content),
            "etag": response.headers.get("etag", ""),
            "last_modified": response.headers.get("last-modified", ""),
        },
        "sha256": hashlib.sha256(response.content).hexdigest(),
        "counts": {
            "satellites": len(data["satellites"]),
            "missionaries": len(data["missionaries"]),
            "bank_records": len(data["banks"]),
            "qr_enabled_bank_records": sum(1 for item in data["banks"] if item.get("qr_code")),
            "bills_payment_steps": len(data["bills_payment"]),
        },
        "data": data,
    }
    (args.output / "giving-dynamic.json").write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    counts = snapshot["counts"]
    lines = [
        "# CCF Giving application: rendered and public-data inventory",
        "",
        f"Observed: `{observed_at}`",
        "",
        f"The WordPress Giving routes redirect in a real browser to [{APP_URL}]({APP_URL}). This companion capture covers content that is absent from their server-rendered HTML. No donation, recipient, contact, or payment form was submitted.",
        "",
        "## Rendered workflow",
        "",
        "1. Giving Method",
        "2. Amount Allocation",
        "3. Giving Details",
        "4. Contact Information",
        "5. Giving Summary",
        "",
        "Giving methods shown: Debit or Credit Card, Bank Transfer, Bills Payment, and PH QR Pay. The interface allows at most ten allocation recipients.",
        "",
        "Allocation entities and categories observed through non-submitting browser interaction:",
        "",
        "- CCFI - Christ's Commission Foundation Inc.: Tithe, Building Fund, Elevate Campus Missionaries, Ministries, Beyond - Missions, Others.",
        "- CCFMI - Christ's Commission Foundation Ministries Inc.: Donation, Tulong Tayo, Uplift, Sports, Others.",
        "",
        "The page instructs donors requesting a Certificate of Donation to select CCFMI.",
        "",
        "## Public application data",
        "",
        f"The application fetched [{API_URL}]({API_URL}) while rendering. Its [robots.txt]({ROBOTS_URL}) permits crawling.",
        "",
        f"- Satellites: **{counts['satellites']:,}**",
        f"- Missionaries: **{counts['missionaries']:,}**",
        f"- Bank records: **{counts['bank_records']:,}**",
        f"- QR-enabled bank records: **{counts['qr_enabled_bank_records']:,}**",
        f"- Bills-payment tutorial steps: **{counts['bills_payment_steps']:,}**",
        "",
        "The complete response, including bank/account metadata, satellite relationships, missionaries, QR references, and GCash/Metrobank tutorial steps, is stored in `giving-dynamic.json` with HTTP provenance and a SHA-256 checksum.",
        "",
        "## WordPress routes that hand off to the app",
        "",
        "- `https://www.ccf.org.ph/give`",
        "- `https://www.ccf.org.ph/give/`",
        "- `https://www.ccf.org.ph/give-through-gcash/`",
        "- `https://www.ccf.org.ph/give/bank-transfer-transaction-successful/`",
        "- `https://www.ccf.org.ph/give/bills-payment-tutorial/`",
        "",
    ]
    (args.output / "giving-dynamic.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps(counts), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

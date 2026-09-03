# CCF Giving application: rendered and public-data inventory

Observed: `2026-09-03T10:01:55+00:00`

The WordPress Giving routes redirect in a real browser to [https://give-form.ccf.org.ph/](https://give-form.ccf.org.ph/). This companion capture covers content that is absent from their server-rendered HTML. No donation, recipient, contact, or payment form was submitted.

## Rendered workflow

1. Giving Method
2. Amount Allocation
3. Giving Details
4. Contact Information
5. Giving Summary

Giving methods shown: Debit or Credit Card, Bank Transfer, Bills Payment, and PH QR Pay. The interface allows at most ten allocation recipients.

Allocation entities and categories observed through non-submitting browser interaction:

- CCFI - Christ's Commission Foundation Inc.: Tithe, Building Fund, Elevate Campus Missionaries, Ministries, Beyond - Missions, Others.
- CCFMI - Christ's Commission Foundation Ministries Inc.: Donation, Tulong Tayo, Uplift, Sports, Others.

The page instructs donors requesting a Certificate of Donation to select CCFMI.

## Public application data

The application fetched [https://give-api.ccf.org.ph/api/front/index](https://give-api.ccf.org.ph/api/front/index) while rendering. Its [robots.txt](https://give-api.ccf.org.ph/robots.txt) permits crawling.

- Satellites: **251**
- Missionaries: **135**
- Bank records: **154**
- QR-enabled bank records: **95**
- Bills-payment tutorial steps: **24**

The complete response, including bank/account metadata, satellite relationships, missionaries, QR references, and GCash/Metrobank tutorial steps, is stored in `giving-dynamic.json` with HTTP provenance and a SHA-256 checksum.

## WordPress routes that hand off to the app

- `https://www.ccf.org.ph/give`
- `https://www.ccf.org.ph/give/`
- `https://www.ccf.org.ph/give-through-gcash/`
- `https://www.ccf.org.ph/give/bank-transfer-transaction-successful/`
- `https://www.ccf.org.ph/give/bills-payment-tutorial/`

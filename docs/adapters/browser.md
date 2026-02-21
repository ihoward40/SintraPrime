---
sidebar_position: 6
title: Browser Operator
description: Playwright-powered browser automation with domain allowlists, CAPTCHA handling, and evidence-grade screenshots.
---

# Browser Operator

The Browser Operator provides governed browser automation powered by Playwright. It supports web navigation, form filling, screenshot capture, and data extraction — all within a domain-restricted, receipt-backed governance framework.

## Configuration

```bash title=".env"
BROWSER_HEADLESS=true
BROWSER_DOMAIN_ALLOWLIST=*.example.com,github.com,notion.so
BROWSER_TIMEOUT=30000
```

## Capabilities

| Capability | Description |
|:---|:---|
| **Navigation** | Visit URLs within the domain allowlist |
| **Screenshots** | Evidence-grade page captures with timestamps |
| **Form Filling** | Automated form completion |
| **Data Extraction** | Structured data extraction from web pages |
| **CAPTCHA Handling** | Detection and escalation of CAPTCHA challenges |
| **2FA Handling** | Support for two-factor authentication flows |
| **PDF Generation** | Convert web pages to PDF for evidence |

## Domain Allowlist

The Browser Operator only visits domains on the configured allowlist:

```json
{
  "domain_allowlist": [
    "*.example.com",
    "github.com",
    "notion.so",
    "*.google.com"
  ],
  "domain_blocklist": [
    "*.malware.com",
    "*.phishing.com"
  ]
}
```

:::warning Domain Restrictions
Attempting to navigate to a domain not on the allowlist will be blocked, and a denial receipt will be generated. This prevents agents from accessing unauthorized websites.
:::

## Evidence-Grade Screenshots

Screenshots captured by the Browser Operator include metadata for evidence purposes:

```json
{
  "screenshot_id": "ss_a1b2c3d4",
  "url": "https://example.com/policy",
  "timestamp": "2026-02-20T15:30:00.000Z",
  "viewport": {"width": 1920, "height": 1080},
  "hash": "sha256:a3f2b1c4d5e6f7...",
  "receipt_id": "rcpt_e5f6g7h8"
}
```

## Usage

```typescript
const result = await browserAdapter.execute({
  type: 'capture',
  params: {
    url: 'https://example.com/policy',
    screenshot: true,
    pdf: true,
    extract: { selector: '.policy-content', format: 'text' },
  },
  governance: { mode: 'SINGLE_RUN_APPROVED', receipt_required: true },
});
```

## Integration with Evidence Systems

The Browser Operator feeds directly into the [Web Snapshot system](../evidence-systems/web-snapshots) for:

- Periodic policy monitoring with diff detection
- Evidence-grade web captures for legal proceedings
- Automated change detection and alerting

## Next Steps

- [Web Snapshots](../evidence-systems/web-snapshots) — Evidence-grade web captures
- [SMS Adapter](./sms) — SMS messaging
- [Adapters Overview](./overview) — All available adapters

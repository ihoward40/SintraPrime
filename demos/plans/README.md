# Demo plans (competitive.brief.v1)

Rules that matter:

- Plan A first (localhost): fully reproducible, tight allowlist (`localhost`), HTTP enabled.
- Plan B optional (public): allowlist `www.consumerfinance.gov`, HTTPS only.
- Both are no-crawl: only the exact `payload.targets[]` URLs are visited — no recursion, no link-following, no exploration.

## Plan A (primary / reproducible): localhost

- File: `demos/plans/competitive-brief.localhost.no-crawl.plan.json`
- Intended target: `http://localhost:8000` (consumerfinance.gov local dev)
- Screenshot mode: `strict` (no subresources)

Env (tight + reproducible):

- `BROWSER_L0_ALLOWED_HOSTS=localhost`
- `BROWSER_L0_ALLOW_HTTP=1`
- `BROWSER_L0_ALLOW_HTTPS=0` (optional)
- `BROWSER_L0_MAX_REQUESTS=5`

## Plan B (secondary): public CFPB host

- File: `demos/plans/competitive-brief.cfpb-public.no-crawl.plan.json`
- Intended target: `https://www.consumerfinance.gov`
- Screenshot mode: `strict` (no subresources)

Env (tight allowlist):

- `BROWSER_L0_ALLOWED_HOSTS=www.consumerfinance.gov`
- `BROWSER_L0_ALLOW_HTTPS=1`
- `BROWSER_L0_ALLOW_HTTP=0`
- `BROWSER_L0_MAX_REQUESTS=5`

One-liner: run `npm test` before/after the demo to re-assert the no-extra-urls invariants.

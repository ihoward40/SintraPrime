# Visual Browser Demo (Playwright)

This is a **headed** (visible) browser demo intended to make execution observable: you can literally watch the cursor move, the field focus, and the query type.

It is designed to be:

- **Boring** (deterministic)
- **Visible** (headed browser, human-paced motion)
- **Auditable** (optional video + HAR + screenshot outputs)

## Install

From repo root:

```bash
npm install
npm install --save-dev playwright
npx playwright install
```

## Run (offline-first)

```bash
npm run demo:visual-browser
```

Outputs:

- `artifacts/visual-demo/final.offline.png`

## Run (network demo)

This intentionally hits a public website so you can watch a real page load.

```bash
npm run demo:visual-browser -- --mode duckduckgo --query "Playwright visual browser demo"
```

## Record video + HAR

```bash
npm run demo:visual-browser -- \
  --videoDir artifacts/visual-demo/video \
  --harPath artifacts/visual-demo/session.har
```

## Keep browser open

```bash
npm run demo:visual-browser -- --keepOpen
```

## Notes

- This demo is **operator-invoked** only. It does not run at boot.
- The offline mode uses a local HTML page under `scripts/visual-browser-demo/demo-page.html`.

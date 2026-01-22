# Autonomous Mode

Autonomous Mode turns SintraPrime into a periodic self-monitoring engine that emits events on the internal event bus.

## Enable

Set env:
- `AUTONOMOUS_ENABLED=1`

Optional env:
- `AUTONOMOUS_INTERVAL_MS` (default `300000` = 5 minutes; minimum enforced `10000`)
- `AUTONOMOUS_CHANNEL` (default `#all-ikesolutions`)
- `AUTONOMOUS_BRIEFING_HOUR` (default `9`)
- `AUTONOMOUS_BRIEFING_MINUTE` (default `0`)

## What it does today

- Emits `autonomous.tick` on an interval.
- Runs stub checks in [ui/intelligence/autonomousChecks.js](ui/intelligence/autonomousChecks.js).
- Registers autonomous subsystems:
  - [ui/intelligence/creditorClassifier.js](ui/intelligence/creditorClassifier.js)
  - [ui/documents/docGenerator.js](ui/documents/docGenerator.js)
  - [ui/filings/draftFilingEngine.js](ui/filings/draftFilingEngine.js)
  - [ui/enforcement/enforcementChain.js](ui/enforcement/enforcementChain.js)
- Emits:
  - `enforcement.event` (for overdue items)
  - `tiktok.lead` (for new leads)
  - `system.error` (for diagnostics/risk)
  - `briefing.voice` (Oracle/Judge/Dragon voice briefings)

## New events

- `creditor.observed` → `creditor.classified`
- `doc.generated` → `filing.draft.ready`
- `enforcement.chain.step`

## Template safety

Draft documents written to `output/docs/` are scaffolds. Replace placeholders with your approved templates and keep human review/sign-off in the loop.

## Safety

- Daily briefing runs at most once per day per process.
- Checks are stubs until wired to Notion/Gmail/TikTok.

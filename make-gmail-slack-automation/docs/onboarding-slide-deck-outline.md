# Loom Script → Slide Deck (Onboarding)

Slide-by-slide outline for Google Slides / Keynote / Canva.

## Slide 1 — Title

**Deterministic Gmail → Slack Alerts**
Label-Gated · Loop-Proof · Explainable

---

## Slide 2 — The Problem We Solved

- Slack spam
- Mystery triggers
- Automations that can’t explain themselves
- Unsafe side effects (delete + notify mixed)

---

## Slide 3 — Core Principle

**State lives in Gmail, not in Make.**

Labels define eligibility and history:

- `ALERT_SLACK`
- `ALERT_SLACK_POSTED`

---

## Slide 4 — Architecture Overview

- Scenario A: Gmail → Slack Notify (signals only)
- Scenario B: Gmail → Delete After Notify (cleanup only)
- Slack never triggers anything upstream

---

## Slide 5 — Why This Doesn’t Spam

- Gmail search query gates execution
- POSTED label makes reposting mechanically impossible
- Cleanup only runs after POSTED exists

---

## Slide 6 — Incident Response (60 seconds)

1. Disable Slack module
2. Inspect Gmail labels
3. Check Make execution history
4. Re-enable safely

---

## Slide 7 — Non-Negotiable Rules

- No Slack admin commands
- No mixed responsibilities
- No delete without POSTED label

---

## Slide 8 — Final Takeaway

This system is:

- Deterministic
- Auditable
- Safe under retries
- Explainable under pressure

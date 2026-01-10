# Notion Schema — Claim Summary DB

Purpose: make the claim total computational (monthly aggregation), not aspirational.

## Properties

| Name                    | Type    | Notes |
| ----------------------- | ------- | ----- |
| Month                   | Date    | Start of month (e.g. 2026-01-01) |
| Counterparty            | Select  | Verizon |
| Incidents               | Relation| Link to incidents in the month |
| Incident Count          | Rollup  | Count of linked incidents |
| Total Estimated Damages | Rollup  | Sum of numeric incident damages |
| Running Total           | Number  | **Write this from Make** (Notion formulas cannot reliably do running totals) |
| Claim Threshold Hit     | Formula | See below |

## Formula logic

**Claim Threshold Hit**

```notion
prop("Running Total") >= 875000
```

## Writes (Make)

- On each incident write/update:
  - Derive `Month` key
  - Upsert the month row
  - Ensure the incident is related to that month
  - Recompute `Running Total` deterministically (read previous month’s Running Total, add this month’s Total)

## Reads

- Demand letters
- Settlement packets
- Executive summaries

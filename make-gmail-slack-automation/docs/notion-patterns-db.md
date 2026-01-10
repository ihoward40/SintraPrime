# Notion Schema — Patterns DB (Memory Formalization)

Purpose: detect pattern-of-conduct over time.

## Properties

| Name                  | Type         | Notes |
| --------------------- | ------------ | ----- |
| Pattern Key           | Text         | Unique key (Counterparty + Violation Type) |
| Counterparty          | Select       | e.g. Verizon |
| Violation Type        | Multi-select | Derived from `issue_indicators[].type` |
| First Seen            | Date         | Earliest incident date |
| Last Seen             | Date         | Latest incident date |
| Incidents             | Relation     | Link to Verizon_Case_Tracker incidents |
| Occurrence Count      | Rollup       | Count of linked incidents |
| Severity Max          | Rollup       | Max severity observed across incidents |
| Pattern Threshold Met | Formula      | See below |
| Notes                 | Text         | Human annotation only |

## Formula logic

**Pattern Threshold Met**

```notion
and(
  prop("Occurrence Count") >= 3,
  dateBetween(prop("Last Seen"), prop("First Seen"), "days") <= 90
)
```

## Writes (Make)

- After Notion Incident creation, upsert Pattern by `Pattern Key`.
- Update `First Seen` / `Last Seen` deterministically from the incident date.
- Link the incident page to `Incidents` relation.

## Reads

- Complaint packet builder (pattern narrative + exhibit grouping)
- Executive summaries

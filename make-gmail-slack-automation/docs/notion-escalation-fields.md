# Notion Schema — Escalation Fields (Notice → Cure → Default)

Purpose: track Notice → Cure → Default mechanically.

## Properties

| Name              | Type     | Notes |
| ----------------- | -------- | ----- |
| Case Number       | Text     | Key (or relation to incident/case) |
| Stage             | Select   | Notice / Cure / Default |
| Notice Sent       | Date     | When notice was sent |
| Cure Deadline     | Date     | Deadline for cure |
| Default Triggered | Checkbox | Set true when default condition is met |
| Days Since Notice | Formula  | See below |
| Escalation Ready  | Formula  | See below |

## Formula logic

**Days Since Notice**

```notion
dateBetween(now(), prop("Notice Sent"), "days")
```

**Escalation Ready**

```notion
and(
  prop("Stage") == "Cure",
  prop("Days Since Notice") > 30
)
```

## Writes (Make)

- When notices are generated/sent: set `Stage=Notice`, set `Notice Sent`, set `Cure Deadline`.
- Daily scheduled check:
  - If `Stage=Notice` and `now() > Cure Deadline` → set `Stage=Cure`
  - If `Stage=Cure` and `Escalation Ready` → set `Stage=Default`, set `Default Triggered=true`, notify

## Reads

- Complaint packet builder (procedural timeline)
- Filing checklists

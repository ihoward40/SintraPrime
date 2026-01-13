# SintraPrime — Mode-Locked Run Orchestrator (Visual Map)

Left → Right flow (as shown in Make):
```
[ Notion: Watch Database Items ]
              |
              v
        [ ROUTER: MODE_GATE ]
           /            \
          /              \
         v                v
 [ VALID PATH ]      [ INVALID PATH ]
         |                |
         v                v
[ Append Mode Header ]  [ Update Page:
         |                Mode=OBSERVE ONLY
         v                + ENFORCEMENT HALT ]
[ ROUTER: MODE_BRANCH ]
   |        |        |        |
   v        v        v        v
 ACTIVE  OBSERVE  REFUSAL   AUDIT
   |        |        |        |
   v        v        v        v
 Generate   Log   Refusal   Audit
 Outputs   Only  Certificate Bundle
```

## Module labels (screenshot-equivalent)
- Module 1 (far left): 🟦 Notion — Watch Database Items
  - Database: SintraPrime Runs
  - Filter: Created By Automation = false
- Module 2 (center): 🟨 Router — MODE_GATE
  - Path A: VALID; Path B: INVALID (implicit else)
- INVALID PATH: 🟥 Notion — Update Page
  - Sets Mode Status → OBSERVE ONLY; prepends ENFORCEMENT HALT; scenario terminates
- VALID PATH: 🟩 Notion — Append Block(s)
  - Inserts Mode Declaration Header at top of page
- Module 3 (right-center): 🟨 Router — MODE_BRANCH
  - ACTIVE; OBSERVE ONLY; REFUSAL ISSUED; AUDIT RESPONSE (distinct permissions)
- End state: 🟦 Notion — Update Page
  - Sets Created By Automation → true; appends provenance footer

## Why it passes scrutiny
- Matches Make’s left-to-right model
- Shows explicit termination and fail-closed behavior
- Distinct branch permissions; no hidden modules

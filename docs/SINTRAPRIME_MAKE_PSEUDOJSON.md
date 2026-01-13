# SintraPrime — Make.com Export-Style Pseudo-JSON (Fail-Closed)

```json
{
  "scenario": {
    "name": "SintraPrime — Mode-Locked Run Orchestrator",
    "trigger": {
      "app": "notion",
      "module": "watch_database_items",
      "database": "SintraPrime Runs",
      "filters": [
        { "field": "Created By Automation", "operator": "is", "value": false }
      ]
    },
    "router": {
      "name": "MODE_GATE",
      "paths": [
        {
          "name": "VALID",
          "conditions": [
            { "field": "Mode Status", "operator": "is_not_empty" },
            { "field": "Scope", "operator": "is_not_empty" },
            { "field": "Mode Locked", "operator": "equals", "value": true },
            { "field": "Authority Basis", "operator": "equals", "value": "Documentary Evidence Only" }
          ],
          "next": "INSERT_MODE_HEADER"
        },
        {
          "name": "INVALID",
          "conditions": [ { "any": true } ],
          "next": "ENFORCEMENT_HALT"
        }
      ]
    },
    "modules": {
      "ENFORCEMENT_HALT": {
        "app": "notion",
        "module": "update_page",
        "actions": [
          { "set": { "Mode Status": "OBSERVE ONLY" } },
          { "prepend_block": "⛔ SINTRAPRIME MODE — ENFORCEMENT HALT\nReason: Missing or invalid mode declaration.\nNo execution permitted." }
        ],
        "terminate": true
      },
      "INSERT_MODE_HEADER": {
        "app": "notion",
        "module": "append_block",
        "content": "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🜂 SINTRAPRIME MODE — {{Mode Status}}\nGovernance: Locked · Scope: {{Scope}}\nAuthority Basis: Documentary Evidence Only\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "next": "MODE_BRANCH"
      },
      "MODE_BRANCH": {
        "router": {
          "ACTIVE": "GENERATE_OUTPUTS",
          "OBSERVE ONLY": "LOG_ONLY",
          "REFUSAL ISSUED": "GENERATE_REFUSAL_PACKET",
          "AUDIT RESPONSE": "GENERATE_AUDIT_BUNDLE"
        }
      },
      "GENERATE_OUTPUTS": { "note": "PDF / analysis allowed within scope" },
      "LOG_ONLY": { "note": "No generation permitted" },
      "GENERATE_REFUSAL_PACKET": { "note": "Refusal artifacts only" },
      "GENERATE_AUDIT_BUNDLE": { "note": "Evidence + clarification only" }
    }
  }
}
```

**Principle:** Any missing declaration halts execution (fail-closed). One router gates existence; one router changes behavior.

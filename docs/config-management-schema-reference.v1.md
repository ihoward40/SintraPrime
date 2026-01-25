# Config Management System — Schema Reference

**Version:** v1.0.0  
**Status:** Production-Ready  
**Last Updated:** 2026-01-25

This document provides a comprehensive reference for the configuration management and audit system schemas, including their relationships and usage.

---

## Overview

The SintraPrime configuration management system consists of 4 core databases with integrated audit trails:

1. **SP_Config_Change_Log** — Tracks all configuration changes with fingerprinting
2. **SP_Switchboard** — Single source of truth for system controls and gates
3. **SP_Execution_Receipts** — Audit trail for all actions (read and execute)
4. **SP_Canary_Packs** — Sealed validation artifacts for config changes

---

## Database Schemas

### 1. SP_Config_Change_Log

**Purpose:** Track all configuration changes that may affect production execution, with race-condition prevention via fingerprinting.

**Schema:** [`notion/schemas/SP_Config_Change_Log.schema.json`](../../notion/schemas/SP_Config_Change_Log.schema.json)

**Key Properties:**

| Property | Type | Purpose |
|----------|------|---------|
| `change_id` | String (CFG-NNNNNN) | Unique identifier |
| `config_domain` | Enum | Which config area changed (ACTION_REGISTRY, PAE, RATE_LIMITS, etc.) |
| `gates_prod_execute` | Boolean | **Critical:** Does this change gate PROD? |
| `config_fingerprint_sha256` | SHA-256 | Prevents race-condition canaries |
| `config_snapshot_b64` or `config_snapshot_url` | Text/URL | Full config snapshot for reproducibility |
| `fingerprint_matches_current` | PASS/FAIL | Validation check at re-enable time |
| `reenable_result` | PASS/FAIL | Final result of re-enable attempt |

**Gate Logic Formula:**
```
gates_prod_execute = true IF:
  environment = "PROD" 
  AND config_domain IN {
    ACTION_REGISTRY, PAE, RATE_LIMITS, 
    SWITCHBOARD, PACK_PIPELINE
  }
```

**Usage:** Every PROD config change creates a row. If `gates_prod_execute = true`, PROD execute gate locks until canary validates the change.

---

### 2. SP_Switchboard

**Purpose:** Single source of truth for all system control toggles and computed gate status.

**Schema:** [`notion/schemas/SP_Switchboard.schema.json`](../../notion/schemas/SP_Switchboard.schema.json)

**Key Properties:**

| Property | Type | Purpose |
|----------|------|---------|
| `control_name` | Enum | Unique name (EXECUTE_ENABLED, QUARANTINE_MODE, etc.) |
| `is_enabled` | Boolean | **Human-controlled** master switch |
| `config_gate_locked` | Boolean | **System-computed** lock based on pending changes |
| `config_gate_reason` | Text | Why gate is locked (references latest gating change) |
| `current_config_fingerprint_sha256` | SHA-256 | Current effective config fingerprint |
| `execute_gate_status` | PASS/BLOCKED | Final computed status |

**Execute Gate Formula:**
```notion
if(
  not EXECUTE_ENABLED,
  "BLOCKED — Master switch OFF",
  if(
    QUARANTINE_MODE,
    "BLOCKED — Emergency lockdown",
    if(
      CONFIG_GATE_LOCKED,
      "BLOCKED — " + CONFIG_GATE_REASON,
      "PASS — All gates clear"
    )
  )
)
```

**Control Separation:**
- **Human-controlled:** `EXECUTE_ENABLED`, `QUARANTINE_MODE` (strategic decisions)
- **System-computed:** `CONFIG_GATE_LOCKED` (tactical safety based on config state)
- **Final gate:** `execute_gate_status` (combines both)

---

### 3. SP_Execution_Receipts

**Purpose:** Immutable audit trail for every action attempt (successful, failed, or blocked).

**Schema:** [`notion/schemas/SP_Execution_Receipts.schema.json`](../../notion/schemas/SP_Execution_Receipts.schema.json)

**Key Properties:**

| Property | Type | Purpose |
|----------|------|---------|
| `receipt_id` | String (RCP-NNNNNN) | Unique identifier |
| `mode` | READ/EXECUTE | Action mode |
| `action_type` | Enum | What was attempted (VOICE_BOOKING, SMS_SEND, etc.) |
| `result` | PENDING/SUCCESS/FAILED/BLOCKED | Outcome |
| `evidence_json` | JSON String | **Source of truth** for all evidence |
| `missing_fields` | Text | Required fields that are missing |
| `blocked_reason_code` | Enum | Machine-readable block reason |
| `switchboard_snapshot_sha256` | SHA-256 | Switchboard state at execution time |
| `pae_snapshot_sha256` | SHA-256 | PAE state (if applicable) |
| `action_registry_snapshot_sha256` | SHA-256 | Action Registry state |
| `config_fingerprint_sha256` | SHA-256 | Overall config fingerprint |

**Universal Invariant:**
> **Every attempted action produces a receipt.**
> 
> **Every receipt links to snapshot hashes proving what config governed it.**

**Evidence JSON Example (VOICE_BOOKING):**
```json
{
  "action_type": "VOICE_BOOKING",
  "timestamp": "2026-01-25T14:30:00Z",
  "calendar_event_id": "evt_abc123",
  "service_name": "Trust Review Call",
  "start_time": "2026-01-27T10:00:00-05:00",
  "attendee_email": "client@example.com",
  "twilio_call_sid": "CA1234567890abcdef",
  "pae_check_result": "PASS"
}
```

---

### 4. SP_Canary_Packs

**Purpose:** Sealed validation artifacts proving that a config change was tested before production re-enable.

**Schema:** [`notion/schemas/SP_Canary_Packs.schema.json`](../../notion/schemas/SP_Canary_Packs.schema.json)

**Key Properties:**

| Property | Type | Purpose |
|----------|------|---------|
| `canary_pack_id` | String (CAN-YYYYMMDD-NNN) | Unique identifier |
| `config_change_id` | String (CFG-NNNNNN) | Linked config change |
| `canary_type` | Enum | What was tested (PAE, RATE_LIMITS, etc.) |
| `test_result` | PASS/FAIL/ERROR | Overall canary result |
| `config_fingerprint_sha256` | SHA-256 | Config fingerprint being validated |
| `test_receipts` | Array of RCP-IDs | Receipt IDs for test executions |
| `canary_pack_hash` | SHA-256 | Tamper-evident seal of pack |

**Canary Pack JSON Format:**
```json
{
  "canary_pack_version": "canary.v1",
  "canary_pack_id": "CAN-20260125-001",
  "config_change_id": "CFG-001234",
  "triggered_at": "2026-01-25T15:00:00Z",
  "canary_type": "PAE",
  "config_fingerprint_sha256": "abc123...",
  "test_receipts": [
    {
      "receipt_id": "RCP-999001",
      "action_type": "VOICE_BOOKING",
      "result": "SUCCESS",
      "receipt_hash": "def456..."
    }
  ],
  "test_result": "PASS",
  "tests_passed": 2,
  "tests_total": 2,
  "actual_pass_rate": 100,
  "pack_hash": "jkl012..."
}
```

---

## Relationships

```
SP_Config_Change_Log
  |
  ├─→ config_domain → determines gates_prod_execute
  ├─→ config_fingerprint_sha256 → used by Canary
  └─→ reenable_receipt_id → SP_Execution_Receipts
        |
        └─→ SP_Canary_Packs
              |
              └─→ test_receipts → SP_Execution_Receipts

SP_Switchboard
  |
  ├─→ latest_gating_config_change_id → SP_Config_Change_Log
  ├─→ config_gate_locked (computed from pending changes)
  └─→ execute_gate_status (final gate check)

SP_Execution_Receipts
  |
  ├─→ switchboard_snapshot_sha256 (proves config at execution time)
  ├─→ pae_snapshot_sha256
  ├─→ action_registry_snapshot_sha256
  └─→ config_fingerprint_sha256
```

---

## Workflows

### Config Change Workflow

```
1. Config Change Created
   └─→ SP_Config_Change_Log row created
       └─→ gates_prod_execute computed
           └─→ IF true:
               ├─→ SP_Switchboard.config_gate_locked = true
               ├─→ CONFIG_GATE_REASON = "Pending change CFG-XXXXXX"
               └─→ Cooldown starts

2. Cooldown Expires
   └─→ Canary Test Triggered
       └─→ SP_Canary_Packs row created (PENDING)
           └─→ Test actions executed
               └─→ SP_Execution_Receipts created for each test
                   └─→ canary_pack_json generated
                       └─→ canary_pack_hash computed

3. Canary Completes
   └─→ IF test_result = PASS:
       └─→ Check fingerprint_matches_current
           └─→ IF PASS:
               ├─→ SP_Config_Change_Log.reenable_result = PASS
               ├─→ SP_Switchboard.config_gate_locked = false
               └─→ SP_Execution_Receipts (reenable receipt) created
           └─→ IF FAIL:
               ├─→ SP_Config_Change_Log.reenable_result = FAIL
               ├─→ CONFIG_GATE_LOCKED stays true
               └─→ Operator notified (fingerprint mismatch)
```

### Execution Workflow

```
1. Action Attempted
   └─→ SP_Execution_Receipts created (PENDING)

2. Preflight Gate Check
   └─→ Read SP_Switchboard.execute_gate_status
       └─→ IF BLOCKED:
           ├─→ Receipt.result = BLOCKED
           ├─→ Receipt.blocked_reason_code = [from gate]
           └─→ STOP (do not execute)

3. Execute (if gates pass)
   └─→ Tool call executed
       └─→ Receipt updated:
           ├─→ result = SUCCESS/FAILED
           ├─→ evidence_json populated
           ├─→ snapshot hashes captured
           └─→ receipt_hash computed

4. Emit to Pack Chain
   └─→ Weekly pack includes receipt
   └─→ Canary pack (if test action)
```

---

## Integration with Existing Documentation

### Related Documents

1. **Gate Logic & Race Prevention:**
   [`docs/config-gate-logic-race-prevention.v1.md`](./config-gate-logic-race-prevention.v1.md)
   - Detailed implementation guide for all 8 critical upgrades
   - Formula examples and validation logic

2. **Notion Policy Database:**
   [`docs/notion-policy-database-implementation.v1.md`](./notion-policy-database-implementation.v1.md)
   - Policy Registry and Execution Receipts setup
   - Templates and formulas

3. **Switchboard & Verifier Pack System:**
   [`docs/switchboard-verifier-pack-system.v1.md`](./switchboard-verifier-pack-system.v1.md)
   - Switchboard database setup
   - Weekly verifier packs with hash chaining
   - Pack Verifier JSON format

---

## Schema Validation

All schemas can be validated using:

```bash
npm run validate:schemas
# or directly:
node scripts/validate-schemas.mjs
```

The validator checks:
- JSON parseability
- Required schema properties ($schema, title, type)
- Consistent structure across schemas

---

## Schema Versioning

All schemas use **JSON Schema Draft 2020-12**.

Schema URIs follow the pattern:
```
sintraprime://schemas/{database_name}.schema.json
```

**Version History:**
- v1.0.0 (2026-01-25) — Initial release with race-condition prevention and fingerprinting

---

## Migration Guide

### From Basic Receipts to Enhanced Receipts

**Steps:**
1. Add new columns to `SP_Execution_Receipts` database
2. Backfill `evidence_json` from existing evidence columns
3. Compute snapshot hashes for recent receipts
4. Update Make.com scenarios to populate new fields

**Priority Fields (must add first):**
- `evidence_json` (source of truth)
- `blocked_reason_code` (for analytics)
- `config_fingerprint_sha256` (for provenance)

**Can add incrementally:**
- Individual snapshot hashes (switchboard, pae, action_registry)
- Missing_fields (validation helper)

### From Manual Gates to Automated Gates

**Steps:**
1. Create `SP_Config_Change_Log` database
2. Add `config_gate_locked` to `SP_Switchboard`
3. Update execute gate formula to include config gate
4. Create Make.com scenario to monitor pending changes
5. Test with non-prod config change first

---

## Best Practices

### Config Fingerprinting

1. **Always snapshot before and after:** Capture config state before and after change
2. **Use canonical JSON:** Ensure reproducible hashes (sorted keys, no whitespace)
3. **Validate fingerprint match:** Before re-enabling, always check fingerprint matches current
4. **Store snapshots:** Keep snapshots in Drive for audit trail

### Evidence JSON

1. **JSON is source of truth:** Convenience columns are for display only
2. **Validate completeness:** Check all required fields before marking complete
3. **Include timestamps:** All evidence should have capture timestamp
4. **Schema validation:** Evidence JSON should match action type requirements

### Gate Logic

1. **Humans control strategy:** EXECUTE_ENABLED and QUARANTINE_MODE are human-controlled
2. **System controls safety:** CONFIG_GATE_LOCKED is computed, not manually toggled
3. **Latest change only:** Gate based on most recent relevant change, not count of all pending
4. **Clear reasons:** Always provide human-readable reason for blocked state

---

**Version:** v1.0.0  
**Status:** Production-Ready  
**Last Updated:** 2026-01-25

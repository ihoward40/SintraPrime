# Config Management Quick Reference Card

**Version:** v1.0.0  
**For:** Operators & Implementers

This is a condensed reference for the 8 critical config management upgrades. For full details, see [config-gate-logic-race-prevention.v1.md](./config-gate-logic-race-prevention.v1.md).

---

## 1. Gate Logic: Latest Relevant Change ✅

**Problem:** PROD stays locked due to old/irrelevant pending changes  
**Solution:** `gates_prod_execute` boolean on Config Change Log

**When true:**
- `Env = PROD` AND
- `Config_Domain` in {ACTION_REGISTRY, PAE, RATE_LIMITS, SWITCHBOARD, PACK_PIPELINE}

**When false:**
- Non-PROD changes (DEV, STAGING)
- Documentation-only changes

**Switchboard checks:** Most recent change where `gates_prod_execute = true`

---

## 2. Config Fingerprinting (Race Prevention) 🔒

**Problem:** Config changes during canary → re-enable against wrong config  
**Solution:** SHA-256 fingerprints

**Fields:**
- `Config_Fingerprint_SHA256` (Config Change Log)
- `Current_Config_Fingerprint_SHA256` (Switchboard)
- `Fingerprint_Matches_Current` (PASS/FAIL check)

**Re-enable rule:**
```
IF canary.fingerprint == current.fingerprint:
    PASS → Re-enable
ELSE:
    FAIL → Stay locked, notify operator
```

---

## 3. Hard Off vs Gate Off 🎛️

**Problem:** Ambiguity about who controls what

**Human-Controlled (Strategic):**
- `EXECUTE_ENABLED` - "Should PROD ever execute?"
- `QUARANTINE_MODE` - "Emergency stop"

**System-Computed (Tactical):**
- `CONFIG_GATE_LOCKED` - "Is it safe right now?"

**Final Gate:**
```
PASS IF:
  EXECUTE_ENABLED = true
  AND QUARANTINE_MODE = false
  AND CONFIG_GATE_LOCKED = false
```

---

## 4. Evidence JSON 📋

**Problem:** Can't validate arbitrary evidence fields dynamically

**Solution:** `Evidence_JSON` (Text) in Execution Receipts
- Canonical JSON string = source of truth
- Can keep convenience columns (sms_sid, pr_url, etc.)
- Validation happens pre-execute

**Example:**
```json
{
  "action_type": "VOICE_BOOKING",
  "calendar_event_id": "evt_123",
  "twilio_call_sid": "CA1234...",
  "pae_check_result": "PASS"
}
```

---

## 5. Universal Blocked Receipts 🧾

**Rule:**
> **Every attempted action produces a receipt**
> (even preflight failures)

**Workflow:**
1. Create receipt (PENDING)
2. Check gates
3. IF blocked → Update receipt (BLOCKED) + reason_code → STOP
4. ELSE → Execute → Update receipt (SUCCESS/FAILED)

**Result:** Zero blind spots in audit trail

---

## 6. Canary Packs (Sealed Artifacts) 📦

**Problem:** Canary needs to be auditable, not just a DB entry

**Solution:** Canary Pack database with JSON artifact

**Fields:**
- `Canary_Pack_ID` (CAN-YYYYMMDD-NNN)
- `Config_Change_ID` (linked)
- `Test_Result` (PASS/FAIL)
- `Test_Receipts` (array of receipt IDs)
- `Config_Fingerprint_SHA256`
- `Canary_Pack_Hash` (tamper-evident seal)

**Output:** Mini-pack proving what was tested

---

## 7. Snapshot Hashes in Receipts 🔐

**Problem:** Can't prove what config governed an action

**Solution:** Every receipt stores snapshot hashes:
- `Switchboard_Snapshot_SHA256`
- `PAE_Snapshot_SHA256` (if required)
- `ActionRegistry_Snapshot_SHA256`
- `Config_Fingerprint_SHA256`

**Benefit:** Receipts prove "that moment," weekly packs prove "that week"

---

## 8. Rate Limits Gate PROD ⚡

**Rule:** Rate limit changes trigger same flow as other PROD configs

**Changes that gate:**
- `MAX_SMS_PER_DAY` value changes
- Rate limit scope logic changes
- Receipt counting filter changes
- Time window changes (day → hour)

**Why:** Runaway loops hide in rate limits

---

## Quick Decision Tree

```
Config Change Submitted
├─→ Env = PROD?
│   ├─→ No → gates_prod_execute = false → No gate
│   └─→ Yes
│       └─→ Domain in {ACTION_REGISTRY, PAE, RATE_LIMITS, SWITCHBOARD, PACK_PIPELINE}?
│           ├─→ No → gates_prod_execute = false → No gate
│           └─→ Yes → gates_prod_execute = true
│               └─→ Switchboard: CONFIG_GATE_LOCKED = true
│                   └─→ Cooldown starts
│                       └─→ Canary runs
│                           └─→ Fingerprint matches?
│                               ├─→ Yes → Re-enable
│                               └─→ No → Stay locked
```

---

## Operator Checklist: Config Change

- [ ] Create Config Change Log row
- [ ] Set `gates_prod_execute` correctly
- [ ] Capture config snapshot → compute `Config_Fingerprint_SHA256`
- [ ] Wait for cooldown to expire
- [ ] Run canary tests (creates Canary Pack)
- [ ] Check `Fingerprint_Matches_Current`
- [ ] If PASS → clear `CONFIG_GATE_LOCKED`
- [ ] If FAIL → notify, investigate, repeat

---

## Operator Checklist: Execute Action

- [ ] Pre-flight creates receipt (PENDING)
- [ ] Check Switchboard `Execute_Gate_Status`
- [ ] If BLOCKED → receipt updated (BLOCKED + reason) → STOP
- [ ] If PASS → capture snapshot hashes
- [ ] Execute tool call
- [ ] Update receipt with `Evidence_JSON`
- [ ] Update receipt with result (SUCCESS/FAILED)
- [ ] Emit to pack chain

---

## Key Formulas

**Switchboard Execute Gate:**
```notion
if(not EXECUTE_ENABLED, "BLOCKED — Master OFF",
  if(QUARANTINE_MODE, "BLOCKED — Emergency",
    if(CONFIG_GATE_LOCKED, "BLOCKED — " + CONFIG_GATE_REASON,
      "PASS")))
```

**Receipt Completeness:**
```
IF Evidence_JSON missing required fields:
    INCOMPLETE
ELSE:
    COMPLETE
```

---

## Common Issues

**Issue:** PROD stays locked after canary passes  
**Check:** Did fingerprint match? Look at `Fingerprint_Matches_Current`

**Issue:** Receipt marked INCOMPLETE  
**Check:** `Missing_Fields` property shows what's missing

**Issue:** Can't tell why action blocked  
**Check:** `Blocked_Reason_Code` + `Blocked_Reason_Detail`

---

## Schema Files

- `notion/schemas/SP_Config_Change_Log.schema.json`
- `notion/schemas/SP_Switchboard.schema.json`
- `notion/schemas/SP_Execution_Receipts.schema.json`
- `notion/schemas/SP_Canary_Packs.schema.json`

**Validate:** `npm run validate:schemas`

---

**Version:** v1.0.0  
**Last Updated:** 2026-01-25  
**Full Guide:** [config-gate-logic-race-prevention.v1.md](./config-gate-logic-race-prevention.v1.md)

# SintraPrime Switchboard — Single-Source-of-Truth Control System

**Version:** v1.0.0  
**Status:** Production-Ready  
**Last Updated:** 2026-01-25

This document provides the complete implementation for upgrading SintraPrime to use a centralized Switchboard for all kill switches and control toggles, plus automated Weekly Verifier Pack generation with config snapshots and hash chaining.

---

## Part 1: Switchboard Database (The Control Center)

### Create Database: Switchboard (SintraPrime)

**Purpose:** Single source of truth for all system toggles and controls.

**Properties:**

| Property Name | Type | Options/Notes |
|---------------|------|---------------|
| `Control_ID` | Unique ID | Prefix: `CTL` |
| `Control_Name` | Title | Unique identifier for the control |
| `Scope` | Select | `GLOBAL`, `VOICE`, `EMAIL`, `GITHUB`, `CALENDAR`, `SMS`, `ALL` |
| `Is_Enabled` | Checkbox | The actual on/off switch |
| `Severity` | Select | `Info`, `Guardrail`, `Lockdown` |
| `Effective_From` | Date | Optional: when control becomes active |
| `Effective_To` | Date | Optional: auto-expire date |
| `Owner` | Person | Who manages this control |
| `Notes` | Text | Why it exists, when to toggle |
| `Last_Changed_By` | Person | Who last modified |
| `Last_Changed_At` | Last edited time | Auto-tracked |
| `Cooldown_Hours` | Number | Hours to wait after change before full execution |

### Required Control Rows (Create These)

**Row 1: VOICE_EXEC_ENABLED**
- Control_Name: `VOICE_EXEC_ENABLED`
- Scope: `VOICE`
- Is_Enabled: ✅ (or start OFF while wiring)
- Severity: `Guardrail`
- Notes: "Master kill switch for all voice execute actions (booking, transfer, SMS)"

**Row 2: QUARANTINE_MODE**
- Control_Name: `QUARANTINE_MODE`
- Scope: `GLOBAL`
- Is_Enabled: ☐ (default OFF)
- Severity: `Lockdown`
- Notes: "Global lockdown: blocks all external executes except pre-approved internal tasks"

**Optional But Recommended Rows:**

| Control_Name | Scope | Default | Notes |
|--------------|-------|---------|-------|
| `EXECUTE_MODE_ENABLED` | GLOBAL | ✓ | Master execute switch |
| `BREAK_GLASS_ENABLED` | GLOBAL | ✓ | Allow emergency overrides |
| `SMS_EXEC_ENABLED` | SMS | ✓ | SMS-specific toggle |
| `BOOKING_EXEC_ENABLED` | CALENDAR | ✓ | Booking-specific toggle |
| `CONFIG_COOLDOWN_ENABLED` | GLOBAL | ✓ | Enforce cooldown after config changes |

---

## Part 2: Link Switchboard to Execution Receipts

### Step 1: Add Relation

In **Execution Receipts (SintraPrime)** database, add:

**Property:** `Switchboard`
- **Type:** Relation
- **Target:** Switchboard (SintraPrime)
- **Two-way:** Yes (creates `Receipts` in Switchboard)

### Step 2: Add Rollups

Create two rollup properties:

**Property 1:** `SB_VOICE_EXEC_ENABLED`
- **Type:** Rollup
- **Relation:** Switchboard
- **Property:** Is_Enabled
- **Calculate:** Show original
- **Filter:** Control_Name is `VOICE_EXEC_ENABLED`

**Property 2:** `SB_QUARANTINE_MODE`
- **Type:** Rollup
- **Relation:** Switchboard
- **Property:** Is_Enabled
- **Calculate:** Show original
- **Filter:** Control_Name is `QUARANTINE_MODE`

### Step 3: Make Them Boolean Formulas

Because rollups can be awkward, add computed boolean fields:

**Property:** `VOICE_EXEC_ENABLED` (Formula)
```notion
contains(format(prop("SB_VOICE_EXEC_ENABLED")), "true")
```

**Property:** `QUARANTINE_MODE` (Formula)
```notion
contains(format(prop("SB_QUARANTINE_MODE")), "true")
```

### Step 4: Update Gate_Status Formula

Update your existing `Gate_Status` formula to check Switchboard first:

```notion
if(prop("QUARANTINE_MODE"),
  "BLOCKED — QUARANTINE_MODE",
  if(prop("Mode") = "READ",
    "PASS — READ MODE",
    if(not prop("Policy_OK"),
      "BLOCKED — Missing/Invalid Policy",
      if(and(
        or(
          prop("Action_Type") = "VOICE_BOOKING",
          prop("Action_Type") = "VOICE_TRANSFER",
          prop("Action_Type") = "SMS_SEND"
        ),
        not prop("VOICE_EXEC_ENABLED")
      ),
        "BLOCKED — VOICE_EXEC_DISABLED",
        if(not prop("Confirmed_By_User") and not(prop("Break_Glass_Used") and prop("Break_Glass_OK")),
          "BLOCKED — Consent Required",
          if(prop("PAE_Check_Result") = "FAIL",
            "BLOCKED — PAE FAIL",
            if(not prop("RateLimit_OK"),
              "BLOCKED — Rate Limit",
              if(not prop("Consent_OK"),
                "BLOCKED — Consent Registry",
                "PASS — EXECUTE APPROVED"
))))))))
```

### Step 5: Auto-Link Switchboard in Templates

Update all Receipt templates to automatically link Switchboard controls:

In **Receipt template settings**, set default **Relation values**:
- Switchboard includes: `VOICE_EXEC_ENABLED` and `QUARANTINE_MODE`

For existing receipts without Switchboard links:
1. Create view: `Receipts missing Switchboard`
   - Filter: `Switchboard` is empty
2. Bulk-select all → Edit property → Set Switchboard relation

---

## Part 3: Config Snapshots Database

### Create Database: Config Snapshots (SintraPrime)

**Purpose:** Immutable record of configuration state at specific points in time.

**Properties:**

| Property Name | Type | Notes |
|---------------|------|-------|
| `Snapshot_ID` | Title | Format: `CS-YYYYMMDD-HHMM` |
| `Snapshot_Type` | Select | `SWITCHBOARD`, `PAE`, `RATE_LIMITS`, `CONSENT_REGISTRY`, `OTHER` |
| `Applies_To_Pack` | Relation | → Verifier Packs |
| `Captured_At` | Created time | Auto-tracked |
| `Captured_By` | Person | Who triggered snapshot |
| `Snapshot_JSON` | Text | Canonical JSON of config state |
| `Snapshot_SHA256` | Text | Hash of Snapshot_JSON |
| `Canonicalization_Version` | Select | `canon.v1` |
| `Notes` | Text | Context |

---

## Part 4: Verifier Packs Database

### Create Database: Verifier Packs (SintraPrime)

**Purpose:** Weekly audit-ready export packages.

**Properties:**

| Property Name | Type | Notes |
|---------------|------|-------|
| `Pack_ID` | Title | Format: `VP-YYYY-WXX` |
| `Week_Start` | Date | Monday of pack week |
| `Week_End` | Date | Sunday of pack week |
| `Status` | Select | `DRAFT`, `SEALED`, `FAILED` |
| `Compliance_Score` | Number | 0-100 |
| `Blocked_Attempts` | Number | Count of blocked executes |
| `Total_Exec_Attempts` | Number | All execute attempts |
| `High_Risk_Exec_Attempts` | Number | Purchases, publishes, transfers |
| `Switchboard_Snapshot_JSON` | Text | Full switchboard state |
| `Switchboard_Snapshot_SHA256` | Text | Hash |
| `PAE_Snapshot_JSON` | Text | Full PAE state |
| `PAE_Snapshot_SHA256` | Text | Hash |
| `Receipts_Included` | Relation | → Execution Receipts |
| `Config_Snapshots` | Relation | → Config Snapshots |
| `PDF_File_URL` | URL | Link to generated PDF |
| `PDF_SHA256` | Text | Hash of PDF file |
| `Chain_Prev_Pack_SHA256` | Text | Previous pack's chain hash |
| `Chain_This_Pack_SHA256` | Text | This pack's chain hash |
| `Verifier_JSON_URL` | URL | Link to verifier JSON file |
| `Verifier_JSON_SHA256` | Text | Hash of verifier JSON |
| `Verifier_JSON_Version` | Select | `packverifier.v1` |
| `Receipt_Set_SHA256` | Text | Hash of canonical receipt set |
| `Receipt_Count` | Number | Count of receipts included |
| `Notes` | Text | Anomalies, incidents |

**Chain_This_Pack_SHA256 Calculation:**
```
Chain_This_Pack_SHA256 = SHA256(
  Chain_Prev_Pack_SHA256 + 
  Switchboard_Snapshot_SHA256 + 
  PAE_Snapshot_SHA256 + 
  PDF_SHA256
)
```

---

## Part 5: Canonical Snapshot Formats

### Switchboard Snapshot JSON (canon.v1)

**Rules:**
- Sort controls by `Control_Name` ascending
- Booleans as `true`/`false` (not "✅")
- Timestamps in ISO 8601
- Stable field ordering

**Example:**
```json
{
  "snapshot_version": "canon.v1",
  "type": "SWITCHBOARD",
  "captured_at": "2026-01-25T10:00:00-05:00",
  "controls": [
    {
      "control_name": "BREAK_GLASS_ENABLED",
      "scope": "GLOBAL",
      "is_enabled": true,
      "severity": "Guardrail",
      "effective_from": null,
      "effective_to": null,
      "last_changed_at": "2026-01-20T14:22:00-05:00",
      "last_changed_by": "System"
    },
    {
      "control_name": "QUARANTINE_MODE",
      "scope": "GLOBAL",
      "is_enabled": false,
      "severity": "Lockdown",
      "effective_from": null,
      "effective_to": null,
      "last_changed_at": "2026-01-24T18:12:02-05:00",
      "last_changed_by": "Isiah"
    },
    {
      "control_name": "VOICE_EXEC_ENABLED",
      "scope": "VOICE",
      "is_enabled": true,
      "severity": "Guardrail",
      "effective_from": null,
      "effective_to": null,
      "last_changed_at": "2026-01-24T09:01:11-05:00",
      "last_changed_by": "Isiah"
    }
  ]
}
```

### PAE Snapshot JSON (canon.v1)

**Example:**
```json
{
  "snapshot_version": "canon.v1",
  "type": "PAE",
  "captured_at": "2026-01-25T10:00:00-05:00",
  "pae_id": "PAE — Production",
  "timezone": "America/New_York",
  "hours": {
    "monday": [["09:00", "17:00"]],
    "tuesday": [["09:00", "17:00"]],
    "wednesday": [["09:00", "17:00"]],
    "thursday": [["09:00", "17:00"]],
    "friday": [["09:00", "17:00"]],
    "saturday": [],
    "sunday": []
  },
  "buffers": {
    "before_minutes": 10,
    "after_minutes": 10
  },
  "services": [
    {
      "name": "Trust Review Call",
      "duration_min": 45,
      "enabled": true
    },
    {
      "name": "Intake Consultation",
      "duration_min": 30,
      "enabled": true
    }
  ],
  "transfer_numbers": {
    "primary": "+1***1234",
    "backup": "+1***9876"
  },
  "voice_exec_enabled_required": true,
  "max_bookings_per_day": 10,
  "config_version": "v1.2.0"
}
```

**Note:** Phone numbers are masked in snapshots for privacy.

---

## Part 6: Pack Verifier JSON (Independent Verification Artifact)

### Purpose

The Pack Verifier JSON is a machine-readable artifact that ships alongside the PDF and enables independent verification of:
- The PDF file wasn't altered
- Switchboard + PAE snapshots are exactly as claimed
- Receipt set is complete per selection logic
- Hash chain links to prior pack (tamper-evident continuity)
- Optional: Digital signature for authenticity

### File Naming Convention

```
VP-YYYY-WW.verifier.json
```

Example: `VP-2026-04.verifier.json`

### Pack Verifier JSON Format (packverifier.v1)

**Core Principle:** Everything hashed is based on canonical bytes, stored as base64 for exact reproducibility.

**Complete Specification:**

```json
{
  "pack_verifier_version": "packverifier.v1",
  "pack_id": "VP-2026-04",
  "generated_at": "2026-01-25T09:05:00-05:00",
  "generated_by": "System",
  
  "week": {
    "start": "2026-01-19T00:00:00-05:00",
    "end": "2026-01-25T23:59:59-05:00",
    "timezone": "America/New_York"
  },

  "artifacts": {
    "pdf": {
      "filename": "VP-2026-04.pdf",
      "sha256": "a1b2c3d4e5f6...",
      "url": "https://drive.google.com/...",
      "size_bytes": 245678
    },
    "verifier_json": {
      "filename": "VP-2026-04.verifier.json",
      "sha256": "f1e2d3c4b5a6...",
      "url": "https://drive.google.com/...",
      "size_bytes": 12345
    }
  },

  "snapshots": {
    "switchboard": {
      "snapshot_id": "CS-20260125-0905",
      "canon_version": "canon.v1",
      "canon_utf8_b64": "eyJzbmFwc2hvdF92ZXJzaW9uIjoiY2Fub24udjEi...",
      "sha256": "abc123def456...",
      "control_count": 5,
      "captured_at": "2026-01-25T09:05:00-05:00"
    },
    "pae": {
      "snapshot_id": "CS-20260125-0906",
      "canon_version": "canon.v1",
      "canon_utf8_b64": "eyJzbmFwc2hvdF92ZXJzaW9uIjoiY2Fub24udjEi...",
      "sha256": "def456abc123...",
      "timezone": "America/New_York",
      "captured_at": "2026-01-25T09:05:00-05:00"
    },
    "rate_limits": {
      "snapshot_id": "CS-20260125-0907",
      "canon_version": "canon.v1",
      "canon_utf8_b64": "eyJzbmFwc2hvdF92ZXJzaW9uIjoiY2Fub24udjEi...",
      "sha256": "789ghi012jkl...",
      "limit_count": 8,
      "captured_at": "2026-01-25T09:05:00-05:00"
    }
  },

  "receipts": {
    "selection_logic": "All blocked + all high-risk + sample of success",
    "total_in_week": 127,
    "included_count": 43,
    "receipt_hashes": [
      {
        "receipt_id": "RCP-001234",
        "timestamp": "2026-01-19T10:15:00-05:00",
        "mode": "EXECUTE",
        "action_type": "VOICE_BOOKING",
        "result": "SUCCESS",
        "sha256": "aaa111bbb222..."
      },
      {
        "receipt_id": "RCP-001235",
        "timestamp": "2026-01-19T11:22:00-05:00",
        "mode": "EXECUTE",
        "action_type": "SMS_SEND",
        "result": "BLOCKED",
        "sha256": "bbb222ccc333..."
      }
    ],
    "receipt_set_sha256": "xyz789abc456..."
  },

  "compliance": {
    "score": 94,
    "total_attempts": 127,
    "blocked_attempts": 8,
    "success_attempts": 115,
    "failed_attempts": 4,
    "high_risk_attempts": 12
  },

  "hash_chain": {
    "prev_pack_sha256": "prev123pack456...",
    "switchboard_snapshot_sha256": "abc123def456...",
    "pae_snapshot_sha256": "def456abc123...",
    "pdf_sha256": "a1b2c3d4e5f6...",
    "this_pack_sha256": "chain123hash456...",
    "computation": "SHA256(prev_pack_sha256 + switchboard_snapshot_sha256 + pae_snapshot_sha256 + pdf_sha256)"
  },

  "verification_instructions": {
    "step_1": "Verify PDF hash: sha256sum VP-2026-04.pdf",
    "step_2": "Verify verifier JSON hash: sha256sum VP-2026-04.verifier.json",
    "step_3": "Decode snapshots: base64 -d snapshots.*.canon_utf8_b64 | sha256sum",
    "step_4": "Verify chain: echo -n '{prev+sb+pae+pdf}' | sha256sum",
    "step_5": "Optional: Verify signature with public key"
  },

  "signature": {
    "algorithm": "Ed25519",
    "public_key_fingerprint": "SHA256:abc123...",
    "signature_b64": "optional_signature_here...",
    "signed_at": "2026-01-25T09:05:30-05:00",
    "signer": "system@sintraprime.local"
  }
}
```

### Receipt Set Hash Calculation

**Purpose:** Prove the receipt set is complete and unaltered.

**Method:**
1. Sort receipts by `receipt_id` ascending
2. For each receipt, compute canonical hash (includes: receipt_id, timestamp, mode, action_type, result, policy_id, external_ref)
3. Concatenate all receipt hashes
4. SHA256 the concatenated string

**Pseudocode:**
```python
def compute_receipt_set_hash(receipts):
    sorted_receipts = sorted(receipts, key=lambda r: r['receipt_id'])
    hash_string = ""
    for receipt in sorted_receipts:
        canonical = json.dumps({
            "receipt_id": receipt['receipt_id'],
            "timestamp": receipt['timestamp'],
            "mode": receipt['mode'],
            "action_type": receipt['action_type'],
            "result": receipt['result'],
            "policy_id": receipt['policy_id'],
            "external_ref": receipt['external_ref']
        }, sort_keys=True, separators=(',', ':'))
        receipt_hash = hashlib.sha256(canonical.encode('utf-8')).hexdigest()
        hash_string += receipt_hash
    
    return hashlib.sha256(hash_string.encode('utf-8')).hexdigest()
```

### Verification Workflow

**Manual Verification (Auditor/Third Party):**

1. **Download artifacts:**
   ```bash
   # Download from Drive/storage
   wget https://drive.google.com/.../VP-2026-04.pdf
   wget https://drive.google.com/.../VP-2026-04.verifier.json
   ```

2. **Verify PDF hash:**
   ```bash
   sha256sum VP-2026-04.pdf
   # Compare to artifacts.pdf.sha256 in verifier JSON
   ```

3. **Verify Verifier JSON hash:**
   ```bash
   sha256sum VP-2026-04.verifier.json
   # Compare to Notion field Verifier_JSON_SHA256
   ```

4. **Verify snapshot hashes:**
   ```bash
   # Extract and decode Switchboard snapshot
   jq -r '.snapshots.switchboard.canon_utf8_b64' VP-2026-04.verifier.json | base64 -d > sb_snapshot.json
   sha256sum sb_snapshot.json
   # Compare to snapshots.switchboard.sha256
   
   # Repeat for PAE
   jq -r '.snapshots.pae.canon_utf8_b64' VP-2026-04.verifier.json | base64 -d > pae_snapshot.json
   sha256sum pae_snapshot.json
   # Compare to snapshots.pae.sha256
   ```

5. **Verify hash chain:**
   ```bash
   # Extract chain components
   PREV=$(jq -r '.hash_chain.prev_pack_sha256' VP-2026-04.verifier.json)
   SB=$(jq -r '.hash_chain.switchboard_snapshot_sha256' VP-2026-04.verifier.json)
   PAE=$(jq -r '.hash_chain.pae_snapshot_sha256' VP-2026-04.verifier.json)
   PDF=$(jq -r '.hash_chain.pdf_sha256' VP-2026-04.verifier.json)
   
   # Compute chain hash
   echo -n "${PREV}${SB}${PAE}${PDF}" | sha256sum
   # Compare to hash_chain.this_pack_sha256
   ```

6. **Verify receipt set (optional deep check):**
   ```bash
   # Extract receipt hashes from verifier JSON
   jq -r '.receipts.receipt_hashes[].sha256' VP-2026-04.verifier.json | sort | sha256sum
   # Should match receipts.receipt_set_sha256
   ```

7. **Verify signature (if present):**
   ```bash
   # Extract public key and verify signature
   openssl dgst -sha256 -verify pubkey.pem -signature sig.bin VP-2026-04.verifier.json
   ```

**Automated Verification Script:**

```bash
#!/bin/bash
# verify-pack.sh

PACK_ID=$1
VERIFIER_JSON="${PACK_ID}.verifier.json"

echo "Verifying Pack: ${PACK_ID}"

# 1. Verify PDF hash
PDF_FILENAME=$(jq -r '.artifacts.pdf.filename' $VERIFIER_JSON)
PDF_EXPECTED=$(jq -r '.artifacts.pdf.sha256' $VERIFIER_JSON)
PDF_ACTUAL=$(sha256sum $PDF_FILENAME | awk '{print $1}')

if [ "$PDF_EXPECTED" = "$PDF_ACTUAL" ]; then
  echo "✓ PDF hash verified"
else
  echo "✗ PDF hash mismatch!"
  exit 1
fi

# 2. Verify Verifier JSON hash
VERIFIER_EXPECTED=$(jq -r '.artifacts.verifier_json.sha256' $VERIFIER_JSON)
VERIFIER_ACTUAL=$(sha256sum $VERIFIER_JSON | awk '{print $1}')

if [ "$VERIFIER_EXPECTED" = "$VERIFIER_ACTUAL" ]; then
  echo "✓ Verifier JSON hash verified"
else
  echo "✗ Verifier JSON hash mismatch!"
  exit 1
fi

# 3. Verify snapshot hashes
jq -r '.snapshots.switchboard.canon_utf8_b64' $VERIFIER_JSON | base64 -d > /tmp/sb.json
SB_EXPECTED=$(jq -r '.snapshots.switchboard.sha256' $VERIFIER_JSON)
SB_ACTUAL=$(sha256sum /tmp/sb.json | awk '{print $1}')

if [ "$SB_EXPECTED" = "$SB_ACTUAL" ]; then
  echo "✓ Switchboard snapshot hash verified"
else
  echo "✗ Switchboard snapshot hash mismatch!"
  exit 1
fi

# 4. Verify chain
PREV=$(jq -r '.hash_chain.prev_pack_sha256' $VERIFIER_JSON)
SB=$(jq -r '.hash_chain.switchboard_snapshot_sha256' $VERIFIER_JSON)
PAE=$(jq -r '.hash_chain.pae_snapshot_sha256' $VERIFIER_JSON)
PDF=$(jq -r '.hash_chain.pdf_sha256' $VERIFIER_JSON)
EXPECTED_CHAIN=$(jq -r '.hash_chain.this_pack_sha256' $VERIFIER_JSON)

ACTUAL_CHAIN=$(echo -n "${PREV}${SB}${PAE}${PDF}" | sha256sum | awk '{print $1}')

if [ "$EXPECTED_CHAIN" = "$ACTUAL_CHAIN" ]; then
  echo "✓ Hash chain verified"
else
  echo "✗ Hash chain mismatch!"
  exit 1
fi

echo ""
echo "✓✓✓ All verifications passed ✓✓✓"
echo "Pack: ${PACK_ID}"
echo "Compliance Score: $(jq -r '.compliance.score' $VERIFIER_JSON)"
echo "Receipts: $(jq -r '.receipts.included_count' $VERIFIER_JSON) of $(jq -r '.receipts.total_in_week' $VERIFIER_JSON)"
```

### Integration with Make.com Automation

Add these modules to the Weekly Verifier Pack scenario:

#### New Module: Build Verifier JSON

**After Module 15 (Hash PDF):**

```
Tools → Text Operations: Compose Verifier JSON
- Build complete packverifier.v1 JSON structure
- Include all hashes, snapshots (base64), receipts, chain
- Store in variable: verifier_json
```

#### New Module: Hash Verifier JSON

```
Tools → Crypto
- Algorithm: SHA-256
- Input: verifier_json
- Output: verifier_json_hash
```

#### New Module: Upload Verifier JSON

```
Google Drive → Upload File
- File: verifier_json
- Folder: "Verifier Packs / {{year}}"
- Filename: "{{pack_id}}.verifier.json"
- Get: verifier_json_url
```

#### Update Module 18 (Seal Pack)

Add these properties:
```
- Verifier_JSON_URL = verifier_json_url
- Verifier_JSON_SHA256 = verifier_json_hash
- Verifier_JSON_Version = "packverifier.v1"
- Receipt_Set_SHA256 = receipt_set_hash
- Receipt_Count = receipt_count
```

### Benefits of Pack Verifier JSON

**For Auditors:**
- Independent verification without trusting Notion/Drive
- Command-line tools work on any platform
- Deterministic, reproducible checks
- No special access required

**For Compliance:**
- Machine-readable audit trail
- Automated compliance monitoring
- Chain-of-custody proof
- Tamper-evidence at multiple levels

**For Operations:**
- Catch data corruption early
- Verify backup/restore integrity
- Cross-environment validation
- Export compliance data to external systems

**For Security:**
- Optional digital signatures
- Public key infrastructure ready
- Time-stamping support (RFC-3161)
- Non-repudiation when signed

### Optional: Digital Signatures

**Generate signing key pair:**
```bash
# Ed25519 (recommended)
ssh-keygen -t ed25519 -f sintraprime-packverifier-key

# Or RSA
openssl genrsa -out private.pem 4096
openssl rsa -in private.pem -pubout -out public.pem
```

**Sign Verifier JSON:**
```bash
# Create signature
openssl dgst -sha256 -sign private.pem -out VP-2026-04.sig VP-2026-04.verifier.json

# Encode as base64 for JSON inclusion
base64 VP-2026-04.sig
```

**Add to Make.com scenario:**
1. After creating verifier JSON, call signing service (Cloud Function / VPS endpoint)
2. Include signature in verifier JSON `signature` field
3. Upload both signed verifier JSON and public key

**Public key distribution:**
- Store in repository: `docs/public-keys/packverifier.pub`
- Include fingerprint in Notion Switchboard
- Publish via HTTPS with TLS for TOFU (Trust On First Use)

---

## Part 7: Make.com Weekly Verifier Pack Automation

### Scenario: WEEKLY_VERIFIER_PACK_EXPORT

**Trigger:** Scheduler → Weekly (Monday 09:05)

**Module-by-Module Flow:**

#### Module 1: Set Week Range
```
Tools → Set Variables
- week_start = start of last week
- week_end = end of last week
- pack_id = "VP-{{YYYY}}-{{WW}}"
- timestamp = now()
```

#### Module 2: Fetch Switchboard Controls
```
Notion → Search Objects
- Database: Switchboard (SintraPrime)
- Filter: (none - get all)
- Sort: Control_Name ascending
```

#### Module 3: Build Switchboard Canonical JSON
```
Tools → Iterator
- Array: Switchboard results

Tools → Array Aggregator
- Build array of control objects
- Ensure stable ordering (by Control_Name)

Tools → Text Operations
- Compose canonical JSON (canon.v1 format)
- Store in variable: sb_json
```

#### Module 4: Hash Switchboard Snapshot
```
Tools → Crypto
- Algorithm: SHA-256
- Input: sb_json
- Output variable: sb_hash
```

#### Module 5: Create Config Snapshot (Switchboard)
```
Notion → Create Database Item
- Database: Config Snapshots
- Properties:
  - Snapshot_Type = "SWITCHBOARD"
  - Snapshot_JSON = sb_json
  - Snapshot_SHA256 = sb_hash
  - Canonicalization_Version = "canon.v1"
  - Captured_By = "System"
- Save Snapshot_ID for later
```

#### Module 6: Fetch PAE Config
```
Notion → Search Objects
- Database: PAE Config
- Filter: Active = true
```

#### Module 7: Build PAE Canonical JSON
```
Tools → Text Operations
- Compose canonical JSON (canon.v1 format)
- Mask phone numbers (replace with +1***XXXX)
- Store in variable: pae_json

Tools → Crypto
- Hash: pae_hash = SHA256(pae_json)
```

#### Module 8: Create Config Snapshot (PAE)
```
Notion → Create Database Item
- Database: Config Snapshots
- Properties:
  - Snapshot_Type = "PAE"
  - Snapshot_JSON = pae_json
  - Snapshot_SHA256 = pae_hash
  - Canonicalization_Version = "canon.v1"
```

#### Module 9: Fetch Execution Receipts for Week
```
Notion → Search Objects
- Database: Execution Receipts
- Filter: Timestamp within [week_start, week_end]
- Filter: Mode = "EXECUTE"

Tools → Aggregator
- Count total_attempts
- Count blocked_attempts (Gate_Status contains "BLOCKED")
- Count high_risk_attempts (Action_Type in [VOICE_TRANSFER, SMS_SEND, PUBLISH, BUY])
- Count success_attempts (Result = "SUCCESS")
```

#### Module 10: Compute Compliance Score
```
Tools → Math Operations
- Start: 100
- Subtract: blocked_attempts * 2 (cap at -30)
- Subtract: failed_attempts * 5
- Subtract: break_glass_count * 10
- Maximum: 100, Minimum: 0
- Store in: compliance_score
```

#### Module 11: Fetch Previous Pack Hash
```
Notion → Search Objects
- Database: Verifier Packs
- Filter: Status = "SEALED"
- Sort: Week_End descending
- Limit: 1
- Get: Chain_This_Pack_SHA256
- Store in: prev_pack_hash (or empty string if first pack)
```

#### Module 12: Create Verifier Pack Row (DRAFT)
```
Notion → Create Database Item
- Database: Verifier Packs
- Properties:
  - Pack_ID = pack_id
  - Week_Start = week_start
  - Week_End = week_end
  - Status = "DRAFT"
  - Compliance_Score = compliance_score
  - Blocked_Attempts = blocked_attempts
  - Total_Exec_Attempts = total_attempts
  - High_Risk_Exec_Attempts = high_risk_attempts
  - Switchboard_Snapshot_JSON = sb_json
  - Switchboard_Snapshot_SHA256 = sb_hash
  - PAE_Snapshot_JSON = pae_json
  - PAE_Snapshot_SHA256 = pae_hash
  - Chain_Prev_Pack_SHA256 = prev_pack_hash
- Link Config_Snapshots relation to snapshot IDs from steps 5 & 8
- Save Pack page URL
```

#### Module 13: Build PDF HTML
```
Tools → Text Operations
- Compose HTML document with sections:

  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: sans-serif; max-width: 800px; margin: 40px auto; }
      h1, h2 { color: #333; }
      table { border-collapse: collapse; width: 100%; margin: 20px 0; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
      .metadata { background: #f9f9f9; padding: 15px; border-radius: 5px; }
      .hash { font-family: monospace; font-size: 0.9em; word-break: break-all; }
    </style>
  </head>
  <body>
    <h1>SintraPrime Verifier Pack</h1>
    <div class="metadata">
      <strong>Pack ID:</strong> {{pack_id}}<br>
      <strong>Week:</strong> {{week_start}} to {{week_end}}<br>
      <strong>Generated:</strong> {{timestamp}}<br>
      <strong>Status:</strong> SEALED
    </div>

    <h2>Executive Summary</h2>
    <p><strong>Compliance Score:</strong> {{compliance_score}}/100</p>
    <p><strong>Total Execute Attempts:</strong> {{total_attempts}}</p>
    <p><strong>Blocked Attempts:</strong> {{blocked_attempts}}</p>
    <p><strong>High Risk Attempts:</strong> {{high_risk_attempts}}</p>

    <h2>Switchboard Snapshot</h2>
    <p class="hash"><strong>SHA-256:</strong> {{sb_hash}}</p>
    <table>
      <tr>
        <th>Control</th>
        <th>Enabled</th>
        <th>Scope</th>
        <th>Severity</th>
        <th>Last Changed</th>
      </tr>
      {{#each controls}}
      <tr>
        <td>{{control_name}}</td>
        <td>{{is_enabled}}</td>
        <td>{{scope}}</td>
        <td>{{severity}}</td>
        <td>{{last_changed_at}}</td>
      </tr>
      {{/each}}
    </table>

    <h2>PAE Snapshot</h2>
    <p class="hash"><strong>SHA-256:</strong> {{pae_hash}}</p>
    <p><strong>Timezone:</strong> {{timezone}}</p>
    <p><strong>Hours:</strong> {{hours_summary}}</p>
    <p><strong>Buffers:</strong> {{buffer_before}}/{{buffer_after}} minutes</p>
    <p><strong>Transfer Numbers:</strong> {{transfer_numbers_masked}}</p>

    <h2>Key Receipts</h2>
    <table>
      <tr>
        <th>Receipt ID</th>
        <th>Action</th>
        <th>Result</th>
        <th>Gate Status</th>
      </tr>
      {{#each key_receipts}}
      <tr>
        <td>{{receipt_id}}</td>
        <td>{{action_type}}</td>
        <td>{{result}}</td>
        <td>{{gate_status}}</td>
      </tr>
      {{/each}}
    </table>

    <h2>Hash Chain</h2>
    <p class="hash"><strong>Previous Pack:</strong> {{prev_pack_hash}}</p>
    <p class="hash"><strong>Switchboard:</strong> {{sb_hash}}</p>
    <p class="hash"><strong>PAE:</strong> {{pae_hash}}</p>
    <p class="hash"><strong>PDF:</strong> (computed after generation)</p>
    <p class="hash"><strong>This Pack:</strong> (computed after generation)</p>
  </body>
  </html>
```

#### Module 14: Generate PDF
```
PDF Generator → Create PDF from HTML
- Input: HTML from step 13
- Output format: PDF
- Store file in variable: pdf_file
```

#### Module 15: Hash PDF
```
Tools → Crypto
- Algorithm: SHA-256
- Input: pdf_file (base64 or bytes)
- Output: pdf_hash
```

#### Module 16: Compute Pack Chain Hash
```
Tools → Crypto
- Algorithm: SHA-256
- Input: prev_pack_hash + sb_hash + pae_hash + pdf_hash
- Output: pack_chain_hash
```

#### Module 17: Upload PDF to Drive
```
Google Drive → Upload File
- File: pdf_file
- Folder: "Verifier Packs / {{year}}"
- Filename: "{{pack_id}}.pdf"
- Get: file_url
```

#### Module 18: Seal Verifier Pack
```
Notion → Update Database Item
- Item: Verifier Pack from step 12
- Properties:
  - Status = "SEALED"
  - PDF_File_URL = file_url
  - PDF_SHA256 = pdf_hash
  - Chain_This_Pack_SHA256 = pack_chain_hash
```

#### Module 19: Send Slack Notification
```
Slack → Post Message
- Channel: #alerts-compliance
- Message:
  ```
  📦 **Verifier Pack Ready: {{pack_id}}**
  
  **Compliance Score:** {{compliance_score}}/100
  **Blocked Attempts:** {{blocked_attempts}}
  **Total Attempts:** {{total_attempts}}
  
  **Controls This Week:**
  • VOICE_EXEC_ENABLED: {{voice_enabled}}
  • QUARANTINE_MODE: {{quarantine_mode}}
  
  **PDF:** {{file_url}}
  **Pack Hash:** `{{pack_chain_hash}}`
  
  [View in Notion]({{pack_page_url}})
  ```
```

#### Module 20: Error Handler (Critical)
```
Error Handler → On Any Error
- Create/Update Verifier Pack with Status = "FAILED"
- Create Incident row
- Slack alert to #alerts-compliance:
  "🚨 Verifier Pack Generation Failed: {{pack_id}}"
  "Error: {{error_message}}"
  "Last successful module: {{last_module}}"
```

---

## Part 8: Make.com Scenario Enforcement Pattern

### Pattern: Read Switchboard Before Every Execute

**In every execute scenario:**

#### Step 1: Fetch Switchboard State
```
Notion → Search Objects
- Database: Switchboard
- Filter: Control_Name in ["QUARANTINE_MODE", "VOICE_EXEC_ENABLED", ...]
- Store results
```

#### Step 2: Set Variables
```
Tools → Set Variables
- quarantine_mode = (find control QUARANTINE_MODE).Is_Enabled
- voice_exec_enabled = (find control VOICE_EXEC_ENABLED).Is_Enabled
```

#### Step 3: Router Guard (Fail Closed)
```
Router
├─ Route 1: BLOCKED
│  Condition: quarantine_mode = true
│  OR (action is voice AND voice_exec_enabled = false)
│  
└─ Route 2: EXECUTE
   Condition: quarantine_mode = false
   AND (if voice action → voice_exec_enabled = true)
```

#### Step 4: Create Receipt (Both Routes)
```
Notion → Create Database Item (Execution Receipt)
- If BLOCKED: Result = "BLOCKED", Gate_Status reason
- If EXECUTE: Result = "PENDING" → then SUCCESS/FAILED
- Always link Switchboard controls
```

---

## Part 9: Config Cooldown + Canary Protection

### Add Canary Runs Database

**Create Database:** `Canary Runs (SintraPrime)`

**Properties:**

| Property Name | Type |
|---------------|------|
| `Run_ID` | Title |
| `Week` | Date |
| `Status` | Select: `PASS`, `FAIL` |
| `Receipts` | Relation → Execution Receipts |
| `Run_SHA256` | Text |
| `Notes` | Text |
| `Triggered_By` | Select: `Scheduled`, `ConfigChange`, `Manual` |

### Canary Scenario (Weekly or After Config Change)

**Trigger:** Scheduler (weekly) OR Switchboard row updated

**Flow:**
1. Run known-good workflow (test booking, test transfer, test SMS)
2. Verify expected receipts created
3. Compute SHA-256 of receipt set
4. Compare to baseline
5. If PASS: continue
6. If FAIL: Auto-enable QUARANTINE_MODE + Slack alert + Incident

### Config Cooldown Rule

**In Execute scenarios:**
```
if (last_switchboard_change_at < now - cooldown_hours)
  AND (latest_canary.Status = "PASS")
  → ALLOW
else
  → BLOCK with reason "CONFIG_COOLDOWN_ACTIVE"
```

---

## Part 10: Verifier Pack Index View

### Create Notion Page: Verifier Pack Index

**Add these views:**

**View 1: Last 12 Packs**
- Database: Verifier Packs
- Filter: Status = "SEALED"
- Sort: Week_End descending
- Limit: 12
- Show properties: Pack_ID, Compliance_Score, Blocked_Attempts, PDF_File_URL, Chain_This_Pack_SHA256

**View 2: Compliance Trend Chart**
- Type: Chart (Line)
- X-axis: Week_End
- Y-axis: Compliance_Score
- Color: By Status

**View 3: Blocked Attempts Trend**
- Type: Chart (Line)
- X-axis: Week_End
- Y-axis: Blocked_Attempts

---

## Part 11: Extra Security Features

### 1. Snapshot Masking Rules

**Never store in plaintext:**
- Full phone numbers (use `+1***1234`)
- API keys (use hash or `sk_***4321`)
- Personal identifiers

**Store only:**
- Masked versions in Snapshot_JSON
- Hashes for verification if needed

### 2. Rate Limits Snapshot

Add Snapshot_Type: `RATE_LIMITS`

**Canonical format:**
```json
{
  "snapshot_version": "canon.v1",
  "type": "RATE_LIMITS",
  "captured_at": "2026-01-25T10:00:00-05:00",
  "limits": [
    {
      "action_type": "VOICE_BOOKING",
      "window_seconds": 60,
      "max_count": 3,
      "scope": "GLOBAL"
    },
    {
      "action_type": "SMS_SEND",
      "window_seconds": 86400,
      "max_count": 10,
      "scope": "GLOBAL"
    }
  ]
}
```

### 3. TSA Timestamping (Optional Nuclear Option)

For maximum audit-grade provenance:

**After sealing pack:**
1. Send `Chain_This_Pack_SHA256` to RFC-3161 timestamp authority
2. Store timestamp token in pack or separate ledger
3. Include in PDF as appendix

**Services:**
- DigiCert TSA
- GlobalSign TSA
- FreeTSA.org (free option)

---

## Part 12: What You Just Built

With this complete system, you now have:

✅ **Single-Source-of-Truth Toggles** — All kill switches in one place  
✅ **Automatic Rollups** — Receipts always reflect current Switchboard state  
✅ **Config Snapshots** — Immutable record of what was allowed when  
✅ **Weekly Verifier Packs** — Audit-ready PDFs with embedded config proofs  
✅ **Pack Verifier JSON** — Independent verification artifact with canonical snapshots  
✅ **Hash Chain** — Tamper-evident ledger linking all packs  
✅ **Slack Alerts** — Operational awareness  
✅ **Failure Handling** — Adult supervision  
✅ **Cooldown + Canary** — Protection against timezone disasters  
✅ **12-Pack Index** — Trend visibility  
✅ **Independent Verification** — Command-line tools for auditors  

This is **"agents are cool"** upgraded to **"agents are governed."**

---

## Part 13: Quick Start Checklist

- [ ] Create Switchboard database with control rows
- [ ] Update Execution Receipts with Switchboard relation + rollups
- [ ] Update Gate_Status formula to check Switchboard
- [ ] Create Config Snapshots database
- [ ] Create Verifier Packs database (include new verifier JSON fields)
- [ ] Create Canary Runs database
- [ ] Build Make.com Weekly Pack scenario (add verifier JSON modules)
- [ ] Build Make.com Canary scenario
- [ ] Update all execute scenarios to read Switchboard first
- [ ] Create Verifier Pack Index page
- [ ] Test: Toggle QUARANTINE_MODE → Verify receipts blocked
- [ ] Test: Generate weekly pack → Verify PDF + verifier JSON + hashes
- [ ] Test: Chain hash verifies against previous pack
- [ ] Test: Run verification script on generated pack

---

## Next-Level Enhancements

1. **Automated Compliance Reports** — Monthly rollup across packs
2. **External Auditor Access** — Read-only Notion guest access to packs
3. **Retention Policy** — Auto-archive packs after N months
4. **Pack Comparison Tool** — Diff two weeks' config snapshots
5. **Digital Signatures** — Sign verifier JSON with organizational key
6. **TSA Timestamping** — RFC-3161 timestamps for legal-grade proof
7. **Multi-Sig Approval** — Require 2-of-3 signatures for config changes
8. **Compliance Dashboard** — Real-time monitoring with alerts

---

**Version:** v1.0.0  
**Status:** Production-Ready  
**Last Updated:** 2026-01-25

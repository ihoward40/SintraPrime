# Notion Database Schemas

This directory contains JSON Schema definitions for all Notion databases used in SintraPrime.

## Configuration Management & Audit System (NEW v1.0.0)

The following schemas implement a production-grade configuration management and audit system with race-condition prevention and full provenance tracking:

### Core Schemas

1. **[SP_Config_Change_Log.schema.json](./SP_Config_Change_Log.schema.json)**
   - Tracks all configuration changes with fingerprinting
   - Implements `gates_prod_execute` logic to determine which changes gate PROD
   - Includes fingerprint validation and canary re-enable tracking
   - **Key Fields:** `config_fingerprint_sha256`, `gates_prod_execute`, `fingerprint_matches_current`

2. **[SP_Switchboard.schema.json](./SP_Switchboard.schema.json)**
   - Single source of truth for system control toggles
   - Separates human-controlled switches from system-computed locks
   - Implements final execute gate computation
   - **Key Fields:** `is_enabled` (human), `config_gate_locked` (system), `execute_gate_status` (final)

3. **[SP_Execution_Receipts.schema.json](./SP_Execution_Receipts.schema.json)**
   - Immutable audit trail for every action attempt
   - Includes evidence JSON, snapshot hashes, and blocked reason codes
   - Links to configuration fingerprints for provenance
   - **Key Fields:** `evidence_json`, `switchboard_snapshot_sha256`, `blocked_reason_code`

4. **[SP_Canary_Packs.schema.json](./SP_Canary_Packs.schema.json)**
   - Sealed validation artifacts for configuration changes
   - Proves that config was tested before production re-enable
   - Includes test receipts and pass/fail results
   - **Key Fields:** `test_result`, `config_fingerprint_sha256`, `canary_pack_hash`

### Documentation

For comprehensive implementation guide and best practices, see:
- [Config Gate Logic & Race Prevention](../../docs/config-gate-logic-race-prevention.v1.md)
- [Config Management Schema Reference](../../docs/config-management-schema-reference.v1.md)

### Schema Validation

To validate all schemas:
```bash
npm run validate:schemas
```

## Legacy Schemas

These schemas are part of the existing governance and tracking systems:

- **FOIA_Packet_Manifest.schema.json** - FOIA packet variant tracking
- **Mailing_Record.schema.json** - USPS certified mail tracking with delivery status
- **Cases.schema.json** - (empty placeholder)
- **FOIA_Requests.schema.json** - (empty placeholder)
- **Mailings.schema.json** - (empty placeholder)
- **Runs_Ledger.schema.json** - (empty placeholder)
- **Scenario_Registry.schema.json** - (empty placeholder)

## Schema Format

All schemas follow JSON Schema Draft 2020-12:
- `$schema`: Draft version
- `$id`: Unique schema identifier (sintraprime://schemas/...)
- `title`: Human-readable name
- `description`: Purpose and usage
- `type`: Object structure
- `required`: Mandatory fields
- `properties`: Field definitions with validation rules

## Integration

These schemas define the structure for Notion databases. When implementing in Notion:

1. Create database with matching name (e.g., "SP_Switchboard")
2. Add properties matching schema field definitions
3. Set property types according to schema (text → Text, boolean → Checkbox, etc.)
4. Implement computed fields (formulas, rollups) as documented
5. Link related databases via Relations

For detailed implementation steps, see the documentation links above.

---

**Version:** v1.0.0  
**Last Updated:** 2026-01-25

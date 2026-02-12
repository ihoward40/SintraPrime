# SintraPrime Credit Monitoring & Forensics

## Overview

Gold-standard monitoring system for automation runs with:

- Severity classification (SEV0-SEV4)
- Slack alerts with Notion case links
- Credit forensics (weekly top-5 reports)
- Misconfig vs. legitimate high-volume detection

## Architecture

```
config/monitoring-policy.v1.json  →  SeverityClassifier
                                        ↓
RunRecord  →  classify()  →  severity + risk_flags
                                        ↓
                              RunLogger (runs/MONITOR_<id>/)
                                        ↓
                              CaseManager (Notion CASES)
                                        ↓
                              SlackAlertFormatter (Alerts)
```

## Severity Taxonomy

| Severity | Credit Multiplier | Exposure Band | Actions |
|----------|------------------|---------------|---------|
| **SEV0** | ≥10× or PII leak | Regulatory | Quarantine, Block Dispatch, Create Case, Escalate |
| **SEV1** | ≥5× or retry loop | Financial | Create Case, Alert, Require Ack |
| **SEV2** | ≥2× | Operational | Optional Case, Weekly Review |
| **SEV3** | ≥1.5× | Operational | Ledger Only, Optional Review |
| **SEV4** | <1.5× | None | Ledger Only |

## Risk Flags

### Misconfig Indicators (High Weight)
- `retry_loop` (weight: 3) - Failed runs with repeated attempts
- `unbounded_iterator` (weight: 4) - Loops without proper bounds
- `missing_idempotency` (weight: 4) - Duplicate processing risk
- `sudden_prompt_growth` (weight: 2) - Unexpected prompt expansion
- `deployment_spike` (weight: 3) - Post-deployment anomaly

### Legitimate Load Indicators (Positive Weight)
- `batch_job` (weight: 3) - Scheduled batch processing
- `backfill_mode` (weight: 4) - Historical data reconciliation
- `linear_scaling` (weight: 2) - Expected volume increase

## Usage

### CLI Commands

**Classify a run:**
```bash
node --loader tsx src/cli/run-monitor.ts classify tests/monitoring/fixtures/high-credit-spike.json
```

**Generate Slack alert:**
```bash
node --loader tsx src/cli/run-monitor.ts alert tests/monitoring/fixtures/pii-exposure.json
```

**Generate weekly credit report:**
```bash
node --loader tsx src/cli/run-monitor.ts report runs/all_runs.json
```

### Programmatic API

```typescript
import { SeverityClassifier } from './src/monitoring/severityClassifier.js';
import { RunLogger } from './src/monitoring/runLogger.js';
import { CaseManager } from './src/monitoring/caseManager.js';

// Load policy
const policy = JSON.parse(fs.readFileSync('config/monitoring-policy.v1.json', 'utf-8'));

// Classify run
const classifier = new SeverityClassifier(policy);
const result = classifier.classify({
  run_id: 'TEST-001',
  credits_total: 5000,
  baseline_expected_credits: 1000,
  status: 'Success'
});

console.log(result);
// {
//   severity: 'SEV1',
//   misconfig_likelihood: 'Low',
//   risk_flags: [],
//   risk_summary: '5.00× baseline | Misconfig: Low | Flags: none'
// }
```

## Audit Trail

All monitoring data is written to append-only logs in `runs/MONITOR_<id>/`:

```
runs/MONITOR_TEST-001/
├── run_record.json          # Complete run data
├── run_record.json.sha256   # SHA-256 verification
└── ledger.jsonl             # Append-only event log
```

## Testing

Run the test suite:

```bash
node --loader tsx tests/monitoring/severityClassifier.test.ts
```

Expected output:
```
✓ SEV0 classification test passed
✓ SEV1 classification test passed
✓ SEV4 legit backfill test passed
```

## Weekly Credit Review Process

1. **Run credit aggregator:**
   ```bash
   node --loader tsx src/cli/run-monitor.ts report
   ```

2. **Review top scenarios by spend:**
   - Identify scenarios consuming most credits
   - Compare against expected baselines
   - Flag anomalies for investigation

3. **Analyze top spikes:**
   - Review high-multiplier runs
   - Determine if misconfig or legitimate
   - Update baselines if legitimate growth

4. **Update monitoring policy:**
   - Add new risk flag patterns
   - Adjust severity thresholds
   - Document learnings in case notes

## Integration with SintraPrime Governance

✅ **Append-only audit trails** - All events logged to JSONL ledger  
✅ **SHA-256 sidecars** - Every artifact cryptographically verified  
✅ **Non-authoritative observation** - Monitoring suggests, doesn't execute  
✅ **Explicit operator control** - All auto-actions require policy approval  
✅ **Offline verifiable** - Use `verify-run.js` pattern for validation  

## Case Management

Cases are created for SEV0/SEV1 incidents and tracked in Notion:

**Case ID Format:** `CASE-YYYYMMDD-RANDOM6`

**Case Workflow:**
1. Open → Investigating
2. Investigating → Mitigating
3. Mitigating → Resolved

**Required Actions:**
- Document root cause
- Apply fix/patch
- Prevent recurrence measures
- Update monitoring policy

## Notion Schema

See complete schemas:
- `notion/schemas/Runs_Ledger.schema.json`
- `notion/schemas/Cases.schema.json`

## Configuration

Edit `config/monitoring-policy.v1.json` to adjust:
- Severity thresholds
- Risk flag weights
- Review windows
- Auto-action policies

**Always regenerate SHA-256 after editing:**
```bash
sha256sum config/monitoring-policy.v1.json | awk '{print $1}' > config/monitoring-policy.v1.json.sha256
```

## Support

For questions or issues with the monitoring system:
1. Review this documentation
2. Check test fixtures for examples
3. Examine run logs in `runs/MONITOR_*/`
4. Consult monitoring policy JSON schema

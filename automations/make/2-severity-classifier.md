# Make.com Scenario 2: Severity Classifier

## Overview

The Severity Classifier analyzes DeepThink run outputs and assigns severity scores (1-5) based on analysis type, content, and identified issues.

## Purpose

- **Classify**: Assign severity levels to completed runs
- **Prioritize**: Identify high-priority runs for immediate attention
- **Filter**: Enable severity-based routing to downstream scenarios
- **Audit**: Maintain severity history for trend analysis

## Configuration

### Trigger

- **Type**: Scheduled
- **Interval**: Every 15 minutes
- **Module**: Data Store search for unclassified runs

### Required Variables

From `fieldmap.manifest.v1.json`:

- `repo_path`: Path to SintraPrime repository
- `runs_dir`: Relative path to runs directory
- `severity_threshold`: Minimum severity for alerts (default: 3)

### Modules in Scenario

1. **Data Store (Search)**
   - Query: Runs logged but not yet classified
   - Filter: `classified = false` OR `classified IS NULL`

2. **Iterate Runs**
   - Loop through unclassified runs

3. **Read output.json**
   - Path: `{{repo_path}}/{{runs_dir}}/{{run_id}}/output.json`
   - Parse: Analysis results

4. **Classify Severity**
   - Use Router module with severity rules (see below)

5. **Update Data Store**
   - Set: `severity`, `classified`, `classified_at`
   - Mark: Run as processed

6. **Set Variable (for alerts)**
   - `high_severity_runs`: Array of runs with severity >= threshold

## Severity Classification Rules

### Level 5: Critical

- Analysis type: `security_vulnerability`
- Output contains: `CRITICAL` or `IMMEDIATE_ACTION_REQUIRED`
- Signature verification failed on Tier-1 run
- TPM attestation missing on expected Tier-2 run

### Level 4: High

- Analysis type: `integrity_violation`
- Output contains: `ERROR` or `FAILED_VERIFICATION`
- Multiple hash mismatches detected
- Signature present but verification pending

### Level 3: Medium

- Analysis type: `anomaly_detection`
- Output contains: `WARNING` or `REVIEW_RECOMMENDED`
- Single hash mismatch detected
- Run completed without signature (Tier-0)

### Level 2: Low

- Analysis type: `routine_check`
- Output: All verifications passed
- No issues detected
- Signed run with valid signature

### Level 1: Informational

- Analysis type: `audit_log`
- Output: Status update only
- No verification performed
- Monitoring-only run

## Router Configuration

```
IF output.analysisType = "security_vulnerability" THEN severity = 5
ELSE IF output.status = "FAILED_VERIFICATION" THEN severity = 4
ELSE IF output.contains("WARNING") THEN severity = 3
ELSE IF output.status = "complete" AND signature.exists THEN severity = 2
ELSE severity = 1
```

## Output

### Updated Data Store Entry

```json
{
  "run_id": "DEEPTHINK_20260123_094830_abc123",
  "severity": 3,
  "severity_reason": "Anomaly detected: hash mismatch in output.json",
  "classified": true,
  "classified_at": "2026-01-23T10:03:15Z",
  "requires_alert": true,
  "classifier_version": "1.0.0"
}
```

## Error Handling

- **Missing output.json**: Severity = 4, reason = "Incomplete run"
- **Malformed JSON**: Severity = 3, reason = "Parse error"
- **Unknown analysis type**: Severity = 2, assign based on status field

## Maintenance

### Daily

- Review severity distribution (should be bell curve)
- Check for misclassifications
- Verify threshold is appropriate

### Weekly

- Analyze false positives/negatives
- Update severity rules if needed
- Document rule changes

## Testing Checklist

- [ ] Level 5 runs are correctly identified
- [ ] Level 1-2 runs do not trigger alerts
- [ ] Classification completes within 15 minutes of run detection
- [ ] Data store is correctly updated
- [ ] Severity threshold is respected
- [ ] Error conditions are handled gracefully

## Notes

- Severity is **derived**, never asserted by the run itself
- Classification is non-governing (does not affect execution)
- Operators can override severity manually in data store
- Consider adding ML-based classification in future iterations

# Make.com Scenario 1: Runs Logger

## Overview

The Runs Logger scenario continuously monitors the SintraPrime `runs/` directory for new run artifacts and maintains a structured log of all execution events.

## Purpose

- **Monitor**: Watch for new `DEEPTHINK_*` run directories
- **Log**: Create timestamped entries for each new run
- **Index**: Maintain a searchable index of all runs
- **Alert**: Notify downstream scenarios when new runs are detected

## Configuration

### Trigger

- **Type**: Scheduled
- **Interval**: Every 15 minutes
- **Module**: `Watch Folder` or custom `List Directory` module

### Required Variables

From `fieldmap.manifest.v1.json`:

- `repo_path`: Path to SintraPrime repository
- `runs_dir`: Relative path to runs directory (default: `runs`)
- `node_path`: Path to Node.js executable

### Modules in Scenario

1. **List Directory**
   - Path: `{{repo_path}}/{{runs_dir}}`
   - Filter: `DEEPTHINK_*`
   - Output: Array of directory names

2. **Parse Directory Name**
   - Extract: `analysis_id`, `timestamp`
   - Validate: Directory naming convention

3. **Check for manifest.json**
   - Path: `{{repo_path}}/{{runs_dir}}/{{directory}}/manifest.json`
   - Verify: File exists and is readable

4. **Read manifest.json**
   - Parse JSON
   - Extract: `analysisType`, `status`, `timestamp`

5. **Data Store (Append)**
   - Store: Run metadata
   - Fields:
     - `run_id`: Full directory name
     - `analysis_id`: Extracted ID
     - `detected_at`: Current timestamp
     - `manifest_status`: Parse status
     - `has_signature`: Check for `.sig` file
     - `tier`: Derived tier (1 if signed, 0 if unsigned)

6. **Set Variable (for downstream)**
   - `new_runs_count`: Number of new runs detected
   - `latest_run_id`: Most recent run directory

## Output

### Data Store Structure

```json
{
  "run_id": "DEEPTHINK_20260123_094830_abc123",
  "analysis_id": "abc123",
  "detected_at": "2026-01-23T09:48:30Z",
  "manifest_exists": true,
  "manifest_status": "complete",
  "has_signature": true,
  "tier": 1,
  "logged_by": "scenario-1-runs-logger"
}
```

## Error Handling

- **Missing manifest.json**: Log as incomplete run, skip downstream processing
- **Permission errors**: Alert operator, continue with remaining runs
- **Parse errors**: Log error, mark run for manual review

## Maintenance

### Daily

- Verify data store is accumulating entries
- Check for stuck runs (detected but never completed)

### Weekly

- Review error logs
- Archive old data store entries (optional)

## Testing Checklist

- [ ] Scenario detects new run directory within 15 minutes
- [ ] manifest.json is correctly parsed
- [ ] Signature files are correctly detected
- [ ] Tier is correctly derived
- [ ] Data store entry is created with all fields
- [ ] Downstream scenarios receive notification

## Notes

- This scenario is the foundation for all other Make.com monitoring
- Runs are logged **as detected**, not as executed
- Signature verification happens in downstream scenarios
- Consider adding a "last seen" timestamp for run cleanup logic

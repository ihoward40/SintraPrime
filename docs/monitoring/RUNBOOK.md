# Credit Monitoring Operator Runbook

This runbook provides step-by-step procedures for operating the Credit Monitoring System in accordance with the audit-first governance model (see `docs/CONSTITUTION.v1.md`).

## Operator Roles

### O1 — Viewer
- May view run artifacts in `runs/CREDIT_MONITORING/`
- May verify audit bundles
- **Must not** execute live commands
- **Must not** possess secrets

### O2 — Read Operator
- May query ledger and generate reports
- May view Notion RUNS_LEDGER and CASES (read-only)
- Has scoped Notion token (read-only)
- **Must not** approve case resolutions or modify policy

### O3 — Approver
- May approve case resolutions and root cause assessments
- May approve baseline updates for stable scenarios
- May approve policy configuration changes
- Must maintain audit trail of all approvals

---

## SEV0 Response (Critical - PII/Regulatory)

**Trigger:** Run classified as SEV0 due to PII/regulatory exposure + credit spike ≥10×

### Immediate Actions (Auto-Applied)

The system automatically:
1. **Quarantines** artifacts to `runs/QUARANTINE/<run_id>/`
2. **Blocks** downstream dispatch
3. **Locks** Notion page (read-only)
4. **Creates** case in Notion CASES
5. **Escalates** to `#ops-critical` Slack channel

### Operator Response (Within 15 Minutes)

**Step 1: Acknowledge Alert**
```bash
# Post to Slack thread
"ACK - O2 <your_name> investigating CASE-<id>"
```

**Step 2: Verify Quarantine**
```bash
# Check that artifacts are quarantined
ls -la runs/QUARANTINE/RUN-<id>/
# Verify no downstream dispatch occurred
grep "dispatch_blocked" runs/CREDIT_MONITORING/<date>/run_<id>.json
```

**Step 3: Assess PII/Regulatory Exposure**
- Open the case in Notion
- Review Risk_Flags field (pii_exposure, regulatory_data)
- Check if sensitive data was actually accessed (not just flagged)
- Document assessment in case notes

**Step 4: Escalate if Real Exposure**
If PII/regulatory data was actually exposed:
```bash
# Escalate to security team
# (Follow incident response plan - out of scope for this runbook)
```

**Step 5: Determine Root Cause**
Common SEV0 root causes:
- **Misconfig:** Unbounded iterator + PII data source
- **Legit Load:** Backfill job processed more records than expected
- **External Dependency:** Third-party API returned unexpected volume

Update case in Notion:
- Set `Root_Cause` field
- Add `Slack_Thread_URL`
- Update `Status` to "Investigating"

**Step 6: Prevent Recurrence**
- If misconfig: Update scenario config (max_items, idempotency key)
- If legit load: Update baseline and document expected variance
- If external: Add rate limiting or batch size controls

**Step 7: Resolve Case**
Once mitigated:
```bash
# Update case status
# In Notion: Status → "Resolved", add Resolved_At timestamp
```

**Documentation Required:**
- Root cause analysis in case notes
- Mitigation steps taken
- Evidence of no actual data exposure (if applicable)
- Baseline adjustment rationale (if applicable)

---

## SEV1 Response (High - Significant Credit Spike)

**Trigger:** Run classified as SEV1 due to credit spike ≥5× baseline

### Immediate Actions (Auto-Applied)

The system automatically:
1. **Creates** case in Notion CASES
2. **Alerts** `#ops-alerts` Slack channel
3. **Requires** acknowledgment before rerun

### Operator Response (Within 1 Hour)

**Step 1: Review Alert**
- Check Slack alert in `#ops-alerts`
- Open case URL and run URL
- Review:
  - Credits: actual vs baseline (variance multiplier)
  - Misconfig likelihood (High/Medium/Low)
  - Risk flags

**Step 2: Investigate Root Cause**

**Quick Checks:**
```bash
# View run record
cat runs/CREDIT_MONITORING/<date>/run_<id>.json | jq .

# Check for retry loops
jq '.retry_count' runs/CREDIT_MONITORING/<date>/run_<id>.json

# Check for unbounded iteration
jq '.has_max_items_config' runs/CREDIT_MONITORING/<date>/run_<id>.json

# Check job type
jq '.Job_Type' runs/CREDIT_MONITORING/<date>/run_<id>.json
```

**Common SEV1 Scenarios:**

| Risk Flags | Likely Cause | Action |
|------------|--------------|--------|
| `retry_loop`, `unbounded_iterator` | Misconfig | Fix scenario config, update max_items |
| `batch_job`, `linear_scaling` | Legit load | Update baseline, document expected variance |
| `sudden_prompt_growth` | Prompt change | Review prompt, consider reverting or optimizing |
| `deployment_correlation` | Recent deploy | Check for bugs in new code |

**Step 3: Classify Root Cause**
Update case in Notion:
- `Root_Cause`: Misconfig / Legit Load / External Dependency / Unknown
- `Status`: "Investigating"

**Step 4: Mitigate**

**If Misconfig:**
```bash
# Fix scenario config
# Example: Add max_items limit
jq '.max_items = 1000' config/scenarios/<scenario_id>.json > tmp.json
mv tmp.json config/scenarios/<scenario_id>.json

# Document change in case notes
```

**If Legit Load:**
```bash
# Update baseline (requires O3 approval)
# Document rationale in case notes
# Run baseline update script
node --import tsx src/monitoring/baseline-calculator.ts update --scenario <scenario_id>
```

**Step 5: Approve Rerun (if needed)**
If scenario needs to rerun:
```bash
# Post approval in Slack thread
"APPROVED for rerun - misconfig fixed, max_items now 1000"

# Clear quarantine flag (if set)
# Allow rerun to proceed
```

**Step 6: Resolve Case**
Once mitigated and rerun successful:
```bash
# Update case in Notion
# Status → "Resolved"
# Add Resolved_At timestamp
# Link successful rerun to case (Related_Run_IDs)
```

---

## SEV2 Response (Medium - Moderate Variance)

**Trigger:** Run classified as SEV2 due to credit spike ≥2× baseline

### Immediate Actions (Auto-Applied)

The system automatically:
1. **Logs** run to ledger with SEV2 classification
2. **Flags** for weekly review
3. **Optionally** creates case (if persistent pattern)

### Operator Response (Weekly Review)

SEV2 incidents are reviewed in batch during weekly credit review (not immediately).

**During Weekly Review:**
1. Open weekly report in `runs/CREDIT_REVIEWS/weekly_<date>.json`
2. Review `top_spike_runs` section
3. Look for patterns:
   - Same scenario spiking repeatedly → baseline drift
   - Multiple scenarios spiking → systemic issue
   - Isolated spikes → transient load

**If Pattern Detected:**
- Create case in Notion
- Investigate root cause
- Update baseline or fix misconfig

**If Isolated:**
- Document in weekly review notes
- No further action required

---

## Weekly Review Procedure

**Schedule:** Every Monday at 10:00 AM

**Step 1: Generate Report**
```bash
node --import tsx src/monitoring/credit-aggregator.ts generate-weekly-report
```

**Output:**
- `runs/CREDIT_REVIEWS/weekly_<date>.json`
- `runs/CREDIT_REVIEWS/weekly_<date>.json.sha256`
- Slack summary posted to `#ops-review`

**Step 2: Review Top Scenarios**
Open report JSON and review:
```bash
cat runs/CREDIT_REVIEWS/weekly_<date>.json | jq '.top_scenarios_by_total'
```

Check for:
- Top 5 scenarios by total credits
- Variance from baseline (>2× is notable)
- Run count (sudden increase?)

**Step 3: Review Spike Runs**
```bash
cat runs/CREDIT_REVIEWS/weekly_<date>.json | jq '.top_spike_runs'
```

For each spike run:
- Check if case was created
- If SEV2 with no case, assess if case is warranted
- Document decision in weekly review notes

**Step 4: Review Policy Violations**
```bash
cat runs/CREDIT_REVIEWS/weekly_<date>.json | jq '.policy_violations'
```

Verify:
- All SEV0/SEV1 incidents have cases
- Cases are in appropriate status (not stale)
- Root causes documented

**Step 5: Identify Baseline Candidates**
```bash
cat runs/CREDIT_REVIEWS/weekly_<date>.json | jq '.baseline_candidates'
```

Scenarios eligible for baseline update:
- Variance < 1.2× current baseline
- At least 10 runs in period
- No SEV0/SEV1 incidents
- Coefficient of variation < 0.3

**Step 6: Update Baselines (O3 Approval Required)**
```bash
# For each stable scenario:
node --import tsx src/monitoring/baseline-calculator.ts update --scenario <scenario_id>
```

Document in weekly review notes:
- Which baselines were updated
- Old vs new baseline values
- Approval timestamp

---

## Baseline Update Procedure

**When to Update:**
- Weekly review identifies stable scenario
- Major scenario change (new features, prompt optimization)
- After resolution of persistent SEV1/SEV2 issues

**Prerequisites:**
- Scenario is stable (no SEV0/SEV1 in last 2 weeks)
- At least 30 days of healthy runs
- Coefficient of variation < 0.3
- **O3 approval** for baseline change

**Step 1: Calculate New Baseline**
```bash
node --import tsx src/monitoring/baseline-calculator.ts calculate --scenario <scenario_id> --days 30
```

Output:
```
[baseline-calculator] Calculated baseline for BINDER_EXPORT_WEEKLY: 1250.50 (from 28 healthy runs)
```

**Step 2: Review Change**
```bash
# Compare to current baseline
jq '.baselines[] | select(.scenario_id == "<scenario_id>")' config/credit-baselines.json

# Check if change is reasonable (typically <20% drift)
# If >50% change, investigate further before applying
```

**Step 3: Document Rationale**
Create a note in `runs/BASELINE_UPDATES/update_<date>.md`:
```markdown
# Baseline Update: <scenario_id>

**Date:** 2024-01-23
**Operator:** O3 <name>
**Approval:** O3-<name>-<timestamp>

**Old Baseline:** 1250.50 credits
**New Baseline:** 1425.75 credits
**Change:** +14.0%

**Rationale:**
- Prompt optimization deployed on 2024-01-15
- New prompt increases context window by 15%
- Variance stable over last 2 weeks
- No SEV0/SEV1 incidents since optimization

**Sample Size:** 28 healthy runs over 30 days
**Coefficient of Variation:** 0.18 (stable)
```

**Step 4: Apply Update**
```bash
node --import tsx src/monitoring/baseline-calculator.ts update --scenario <scenario_id> --approve
```

**Step 5: Verify**
```bash
# Check updated config
jq '.baselines[] | select(.scenario_id == "<scenario_id>")' config/credit-baselines.json

# Verify last_updated timestamp is current
```

---

## Quarantine Procedures

**When Quarantine is Applied:**
- SEV0 incidents (automatic)
- Manual quarantine requested by O3

**Step 1: Verify Quarantine Status**
```bash
ls -la runs/QUARANTINE/<run_id>/
```

**Step 2: Review Quarantined Artifacts**
```bash
# Check run record
cat runs/QUARANTINE/<run_id>/run_<id>.json | jq .

# Verify SHA-256 integrity
cat runs/QUARANTINE/<run_id>/run_<id>.json.sha256
sha256sum runs/QUARANTINE/<run_id>/run_<id>.json
```

**Step 3: Assess Release Criteria**
Artifacts can be released from quarantine if:
- PII/regulatory exposure confirmed as false positive
- Mitigation applied (e.g., data redacted)
- Case resolved and documented
- **O3 approval** obtained

**Step 4: Release from Quarantine (O3 Only)**
```bash
# Move artifacts back to main run directory
mv runs/QUARANTINE/<run_id>/* runs/CREDIT_MONITORING/<date>/

# Update case status
# In Notion: Add note "Quarantine released on <date> by O3 <name>"

# Unblock downstream dispatch (if applicable)
```

---

## Rerun Approval Gates

**When Approval is Required:**
- SEV0 incidents (always)
- SEV1 incidents (always)
- SEV2 incidents (if flagged as misconfig)

**Step 1: Review Rerun Request**
Check Slack thread for rerun request from automation or operator.

**Step 2: Verify Mitigation**
Before approving:
- Confirm root cause identified
- Verify mitigation applied (config change, code fix, etc.)
- Check that mitigation addresses the risk flags

**Step 3: Approve or Deny**

**If Approved:**
```bash
# Post in Slack thread
"APPROVED for rerun - [brief mitigation description]"
# Example: "APPROVED for rerun - max_items limit added, retry_loop fixed"

# Set approval flag in system (implementation-specific)
```

**If Denied:**
```bash
# Post in Slack thread
"DENIED - [reason]"
# Example: "DENIED - root cause not yet identified, investigation ongoing"
```

**Step 4: Monitor Rerun**
After approval:
- Watch for new run completion
- Verify credits within expected range
- If rerun also spikes → escalate for deeper investigation

---

## Troubleshooting Common Issues

### Issue: "Baseline not found for scenario"

**Symptom:** Run classified as SEV1 but should be normal operation.

**Cause:** Baseline never calculated for this scenario.

**Resolution:**
```bash
# Calculate initial baseline
node --import tsx src/monitoring/baseline-calculator.ts calculate --scenario <scenario_id> --days 30

# If insufficient data, use manual baseline
jq '.baselines += [{"scenario_id": "<scenario_id>", "median_credits": <value>, "calculated_at": "'$(date -Iseconds)'", "sample_size": 0, "last_updated": "'$(date -Iseconds)'"}]' config/credit-baselines.json > tmp.json
mv tmp.json config/credit-baselines.json

# Document manual baseline rationale
```

### Issue: "Notion sync failing"

**Symptom:** Runs logged locally but not appearing in Notion RUNS_LEDGER.

**Cause:** Notion API token expired, rate limit, or database ID misconfigured.

**Resolution:**
```bash
# Check environment variables
echo $NOTION_TOKEN
echo $NOTION_RUNS_LEDGER_DB_ID

# Verify Notion API access
curl -H "Authorization: Bearer $NOTION_TOKEN" \
     -H "Notion-Version: 2022-06-28" \
     https://api.notion.com/v1/databases/$NOTION_RUNS_LEDGER_DB_ID

# If API works, check rate limits (429 responses)
# If rate limited, sync will automatically retry with exponential backoff

# Check sync lag
grep "Would write to Notion" runs/CREDIT_MONITORING/*/run_*.json | tail -10
```

### Issue: "False positive PII flag"

**Symptom:** Run flagged with pii_exposure but no PII actually accessed.

**Cause:** Data classification heuristic too aggressive.

**Resolution:**
```bash
# Review run record
cat runs/CREDIT_MONITORING/<date>/run_<id>.json | jq '.Risk_Flags'

# If confirmed false positive:
# 1. Update case notes in Notion
# 2. Adjust data classification rules (if pattern detected)
# 3. Release from quarantine (O3 approval required)

# Document false positive pattern in weekly review
```

### Issue: "Baseline drift after legitimate change"

**Symptom:** Persistent SEV2/SEV3 alerts after known scenario change (e.g., prompt optimization).

**Cause:** Baseline not updated after change.

**Resolution:**
```bash
# Verify change was intentional
git log --oneline --grep="<scenario_id>" | head -5

# Calculate new baseline (requires 2 weeks of stable runs post-change)
node --import tsx src/monitoring/baseline-calculator.ts calculate --scenario <scenario_id> --days 14

# Document change in baseline update notes
# Obtain O3 approval
# Apply update
```

### Issue: "Weekly report shows no data"

**Symptom:** Weekly report JSON has empty arrays.

**Cause:** No runs in ledger for the period, or ledger file missing.

**Resolution:**
```bash
# Check ledger exists
ls -la runs/CREDIT_MONITORING/ledger.jsonl

# Check for runs in period
grep -E "2024-01-(16|17|18|19|20|21|22|23)" runs/CREDIT_MONITORING/ledger.jsonl | wc -l

# If ledger exists but empty, check run logger
# Ensure runs are being logged (check recent run artifacts)
ls -la runs/CREDIT_MONITORING/$(date +%Y-%m-%d)/
```

---

## Escalation Procedures

### Level 1: SEV2/SEV3 → Weekly Review
- No immediate escalation
- Reviewed in batch during weekly credit review
- Operator can self-resolve with documentation

### Level 2: SEV1 → O2 Investigation → O3 Approval
- O2 investigates within 1 hour
- O2 proposes mitigation
- O3 reviews and approves mitigation
- O3 approves rerun or baseline update

### Level 3: SEV0 → Immediate O3 + Security Team
- O3 notified immediately via `#ops-critical`
- O3 assesses PII/regulatory exposure within 15 minutes
- If real exposure: Escalate to security incident response team
- If false positive: Document and release from quarantine

### Escalation Contacts
- **O3 On-Call:** Slack `@oncall-o3`
- **Security Team:** `#security-incidents`
- **Eng Lead (Policy Changes):** Slack `@eng-lead`

---

## Audit and Compliance

### Daily Checks (O2)
- Verify ledger.jsonl is append-only (no modifications)
- Check SHA-256 integrity of recent runs
- Ensure no unacknowledged SEV0/SEV1 alerts

### Weekly Checks (O2)
- Generate and review weekly credit report
- Verify all open cases have recent activity
- Update baselines for stable scenarios (with O3 approval)
- Archive resolved cases older than 30 days

### Monthly Checks (O3)
- Review policy configuration for necessary adjustments
- Audit O3 approval trail (all approvals documented?)
- Verify baseline update rationale for all changes
- Review false positive rate for PII flags

### Quarterly Checks (O3 + Eng Lead)
- Review severity thresholds (are multipliers still appropriate?)
- Assess risk flag weights (misconfig vs legit signals)
- Update operator training based on incident patterns
- Document policy changes in governance log

---

## Emergency Procedures

### "Kill Switch" - Disable Monitoring Alerts

**When to Use:** Alert storm due to systemic issue (e.g., API outage).

**Procedure (O3 Only):**
```bash
# Temporarily disable Slack alerts
export SLACK_WEBHOOK_URL_SEV0=""
export SLACK_WEBHOOK_URL_SEV1=""
export SLACK_WEBHOOK_URL_SEV2=""

# Monitoring continues, alerts suppressed
# Runs still logged to ledger

# Document in incident notes
# Re-enable after issue resolved
```

### "Backfill Mode" - Bulk Rerun Without Alerts

**When to Use:** Reprocessing historical data after fix.

**Procedure (O3 Only):**
```bash
# Set backfill flag for scenario
jq '.is_backfill = true' config/scenarios/<scenario_id>.json > tmp.json
mv tmp.json config/scenarios/<scenario_id>.json

# Backfill runs get legit_weight bonus (reduces false positives)
# Still logged and monitored, but SEV1 threshold relaxed

# Document backfill start/end times
# Remove flag after backfill complete
```

---

## Reference

### Key Files
- `config/sintraprime-policy.json` - Severity thresholds and policy actions
- `config/credit-baselines.json` - Per-scenario baseline credits
- `runs/CREDIT_MONITORING/ledger.jsonl` - Append-only run log
- `runs/CREDIT_REVIEWS/` - Weekly forensics reports
- `runs/QUARANTINE/` - Quarantined run artifacts

### Key Commands
```bash
# Generate weekly report
node --import tsx src/monitoring/credit-aggregator.ts generate-weekly-report

# Calculate baseline
node --import tsx src/monitoring/baseline-calculator.ts calculate --scenario <id>

# Update baseline (O3 approval required)
node --import tsx src/monitoring/baseline-calculator.ts update --scenario <id>

# Verify run integrity
sha256sum runs/CREDIT_MONITORING/<date>/run_<id>.json
cat runs/CREDIT_MONITORING/<date>/run_<id>.json.sha256

# Query ledger
jq 'select(.Severity == "SEV0")' runs/CREDIT_MONITORING/ledger.jsonl
```

### Useful Queries
```bash
# Count runs by severity (last 7 days)
jq -s 'group_by(.Severity) | map({severity: .[0].Severity, count: length})' \
  runs/CREDIT_MONITORING/ledger.jsonl

# Top scenarios by credit spend (last 7 days)
jq -s 'group_by(.Scenario_ID) | map({scenario: .[0].Scenario_ID, total: map(.Credits_Total) | add}) | sort_by(.total) | reverse | .[0:5]' \
  runs/CREDIT_MONITORING/ledger.jsonl

# Find runs with specific risk flag
jq 'select(.Risk_Flags[]? == "retry_loop")' runs/CREDIT_MONITORING/ledger.jsonl
```

---

**Version:** 1.0  
**Last Updated:** 2024-01-23  
**Owner:** O3 Operations Team

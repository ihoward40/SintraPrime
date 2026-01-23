# SintraPrime Monitoring & Forensics

This directory contains the operational documentation for the SintraPrime credit forensics system, designed to work with Make.com for plug-and-play automation.

## Quick Start

For non-technical operators, start here:

**[`../automations/OPERATOR_GUIDE.md`](../automations/OPERATOR_GUIDE.md)**

This guide provides:
- Step-by-step instructions for extracting top 5 scenarios from Make.com usage UI
- Scenario setup and configuration
- Monitoring and troubleshooting
- Common operations (triggering scenarios, viewing logs, etc.)

## System Architecture

### Make.com Scenarios

The monitoring system consists of 4 interconnected Make.com scenarios:

1. **Runs Logger** ([`../automations/make/1-runs-logger.md`](../automations/make/1-runs-logger.md))
   - Monitors `runs/` directory for new DeepThink artifacts
   - Logs run metadata to Make.com data store
   - Runs every 15 minutes

2. **Severity Classifier** ([`../automations/make/2-severity-classifier.md`](../automations/make/2-severity-classifier.md))
   - Analyzes run outputs and assigns severity (1-5)
   - Classifies based on analysis type, status, and signature presence
   - Runs every 15 minutes

3. **Slack Alerts** ([`../automations/make/3-slack-alerts.md`](../automations/make/3-slack-alerts.md))
   - Sends notifications for high-severity runs
   - Configurable threshold (default: severity >= 3)
   - Runs every 5 minutes

4. **Weekly Credit Review** ([`../automations/make/4-weekly-credit-review.md`](../automations/make/4-weekly-credit-review.md))
   - Generates weekly usage summaries
   - Identifies top 5 operation consumers
   - Runs every Monday at 9:00 AM

### Data Flow

```
SintraPrime runs/
    ↓
1. Runs Logger (detects new runs)
    ↓
Make.com Data Store (sintraprime_runs)
    ↓
2. Severity Classifier (analyzes & scores)
    ↓
Make.com Data Store (updated with severity)
    ↓
3. Slack Alerts (notifies on high-severity)
    ↓
Slack Channel (#sintraprime-alerts)

(parallel)
4. Weekly Credit Review (analyzes Make.com usage)
    ↓
Report saved & Slack summary sent
```

## Environment Configuration

### Field Mapping

**[`../automations/fieldmap.manifest.v1.json`](../automations/fieldmap.manifest.v1.json)**

This manifest defines the environment variables needed for Make.com scenarios:

- `SINTRAPRIME_REPO_PATH`: Absolute path to repository
- `SINTRAPRIME_RUNS_DIR`: Relative path to runs directory
- `SLACK_WEBHOOK_URL`: Slack incoming webhook (sensitive)
- `SLACK_CHANNEL`: Target Slack channel
- `SEVERITY_THRESHOLD`: Minimum severity for alerts (1-5)
- `NODE_PATH`: Path to Node.js executable
- `VERIFY_SCRIPT_PATH`: Path to verify-run.js

**SHA-256 Integrity**: [`../automations/fieldmap.manifest.v1.json.sha256`](../automations/fieldmap.manifest.v1.json.sha256)

### Setup Checklist

Before activating scenarios:

- [ ] Install Make.com and create account
- [ ] Configure environment variables in Make.com
- [ ] Create `sintraprime_runs` data store
- [ ] Set up Slack webhook and channel
- [ ] Import all 4 scenarios
- [ ] Test each scenario individually
- [ ] Activate scenarios in order (1 → 2 → 3 → 4)

See [OPERATOR_GUIDE.md](../automations/OPERATOR_GUIDE.md#scenario-setup-and-configuration) for detailed instructions.

## Monitoring

### Daily Health Checks

1. **Scenario Status**: All 4 scenarios should be "On" with recent executions
2. **Data Store Growth**: New entries added as runs are detected
3. **Slack Alerts**: High-severity runs generate alerts within 5 minutes
4. **Success Rate**: All scenarios should maintain > 95% success rate

### Weekly Reviews

1. **Credit Review**: Review weekly report for operations usage
2. **Top Consumers**: Identify scenarios consuming most operations
3. **Optimization**: Adjust schedules or filters to reduce costs
4. **Audit**: Compare actual Make.com invoice to forecasts

### Troubleshooting

Common issues and solutions:

- **Scenario not running**: Check schedule, verify "On" status
- **No data store entries**: Verify paths and Node.js accessibility
- **Slack alerts not sending**: Test webhook, check severity threshold
- **High operations usage**: Review weekly report, adjust intervals

See [`../automations/OPERATOR_GUIDE.md`](../automations/OPERATOR_GUIDE.md#monitoring-and-troubleshooting) for detailed troubleshooting.

## Security & Privacy

### Sensitive Data

- **Slack Webhook URL**: Stored in Make.com secrets, never in code
- **Repository Paths**: May contain identifying information
- **Run Artifacts**: Contain analysis results, handle according to data policy

### Best Practices

- ✅ Use organization-level variables for shared configuration
- ✅ Restrict Make.com access to authorized operators only
- ✅ Regularly audit scenario permissions
- ✅ Export data store periodically for backup
- ✅ Review Slack channel access

## Integration with SintraPrime

### DeepThink Runs

The monitoring system watches for `runs/DEEPTHINK_*` directories created by:

```bash
npm run deepthink -- deepthink/fixtures/deepthink_request.example.json
```

### Signature Verification

The system detects and reports on:

- **Tier-0**: Unsigned runs (no `.sig` file)
- **Tier-1**: Ed25519 signed runs (`manifest.json.sig`)
- **Tier-2**: TPM attested runs (if `tpm_attestation.json` present)

### Run Integrity

Scenarios use SintraPrime's built-in verification:

```bash
node verify-run.js runs --json > verify.json
```

Gate on exit code for pass/fail status.

## Cost Estimation

### Operations per Scenario (typical)

- Runs Logger: ~15 operations per execution
- Severity Classifier: ~15 operations per execution
- Slack Alerts: ~5 operations per execution
- Weekly Credit Review: ~150 operations per execution

### Monthly Estimate

Assuming 1 new run per hour:

- Runs Logger: 4 executions/hour × 15 ops = 60 ops/hour = ~43,200 ops/month
- Severity Classifier: 4 executions/hour × 15 ops = ~43,200 ops/month
- Slack Alerts: 12 executions/hour × 5 ops = ~43,200 ops/month
- Weekly Credit Review: 4 executions/month × 150 ops = ~600 ops/month

**Total**: ~130,000 operations/month

At Make.com's pricing (~$0.001 per operation), this is approximately **$130/month**.

Adjust schedules to optimize costs vs. latency.

## Support

### Documentation

- **Operator Guide**: [`../automations/OPERATOR_GUIDE.md`](../automations/OPERATOR_GUIDE.md)
- **Scenario Guides**: [`../automations/make/`](../automations/make/)
- **Fieldmap**: [`../automations/fieldmap.manifest.v1.json`](../automations/fieldmap.manifest.v1.json)

### External Resources

- [Make.com Documentation](https://www.make.com/en/help/home)
- [Make.com API Reference](https://www.make.com/en/api-documentation)
- [Make.com Community](https://community.make.com/)

### Getting Help

1. Check scenario execution logs in Make.com
2. Review troubleshooting section in OPERATOR_GUIDE.md
3. Test scenarios individually to isolate issues
4. Consult technical team for complex problems

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-23 | 1.0.0 | Initial monitoring & forensics documentation |

---

## Dependencies

This monitoring system is dependent on the first "monitoring & forensics" code PR, which implements:

- DeepThink analysis runner
- Run artifact structure (`runs/DEEPTHINK_*/`)
- Signature verification (`manifest.json.sig`)
- Integrity verification (`verify-run.js`)

Ensure the base system is deployed before activating Make.com scenarios.

---

*This documentation is part of the SintraPrime credit forensics system. For governance and auditability, see [`docs/governance/index.md`](../docs/governance/index.md).*

# SintraPrime Make.com Blueprints Skill

**Version**: 1.0.0  
**Category**: Automation, Governance  
**Complexity**: Advanced  
**Prerequisites**: Make.com account, HMAC verification setup

---

## Purpose

This skill enforces policy packs for Make.com scenario blueprints, ensuring all automation workflows follow governance rules, budget constraints, and approval gates defined in AGENTS.md.

---

## When to Use

Use this skill when:

- Creating new Make.com scenarios
- Modifying existing automation workflows
- Reviewing Make.com blueprints for compliance
- Generating run receipts for audit trails
- Validating scenario configurations before deployment

---

## Core Capabilities

### 1. Tag Lint Validation

Validates that all Make.com scenarios have proper tags:

- **Required tags**: `environment` (dev/staging/prod), `owner`, `cost-center`
- **Optional tags**: `project`, `priority`, `risk-level`
- **Validation rules**: No duplicate tags, valid tag formats, required tags present

### 2. Budget/Risk Lint Checking

Analyzes scenarios for budget and risk compliance:

- **Budget checks**: Estimated operations per month, cost per operation, total monthly cost
- **Risk checks**: External API calls, data transformations, error handling
- **Thresholds**: Daily ($100), Weekly ($500), Monthly ($2000)
- **Alerts**: Warn when approaching limits, block when exceeding

### 3. Approval Gate Enforcement

Enforces approval requirements based on risk level:

- **LOW risk**: Auto-approve (documentation changes, test scenarios)
- **MEDIUM risk**: Single approver required (new features, integrations)
- **HIGH risk**: Two approvers required (production changes, financial operations)
- **CRITICAL risk**: Owner approval + security review (data deletion, schema changes)

### 4. Run Receipt Generation

Generates immutable receipts for all scenario executions:

```json
{
  "receipt_id": "uuid-v4",
  "timestamp": "2026-02-16T14:30:00Z",
  "scenario_id": "make-scenario-123",
  "scenario_name": "Legal Document Processing",
  "action": "execute_scenario",
  "actor": "agent:sintraprime-v2",
  "operations_used": 150,
  "cost": 0.75,
  "outcome": "success",
  "evidence_hash": "sha256:abc123...",
  "signature": "ed25519:def456..."
}
```

---

## Usage Instructions

### Step 1: Validate Scenario Tags

```javascript
// Check if scenario has required tags
const validateTags = (scenario) => {
  const requiredTags = ['environment', 'owner', 'cost-center'];
  const scenarioTags = scenario.tags || [];
  
  const missingTags = requiredTags.filter(tag => 
    !scenarioTags.some(st => st.key === tag)
  );
  
  if (missingTags.length > 0) {
    throw new Error(`Missing required tags: ${missingTags.join(', ')}`);
  }
  
  return true;
};
```

### Step 2: Check Budget Compliance

```javascript
// Estimate scenario cost
const checkBudget = (scenario) => {
  const operationsPerRun = scenario.modules.length;
  const runsPerDay = scenario.scheduling.interval_minutes 
    ? (24 * 60) / scenario.scheduling.interval_minutes 
    : 1;
  
  const dailyCost = operationsPerRun * runsPerDay * 0.005; // $0.005 per operation
  
  if (dailyCost > 100) {
    throw new Error(`Daily cost ($${dailyCost}) exceeds limit ($100)`);
  }
  
  return { operationsPerRun, runsPerDay, dailyCost };
};
```

### Step 3: Enforce Approval Gates

```javascript
// Determine approval requirements
const getApprovalRequirements = (scenario) => {
  const riskLevel = scenario.tags.find(t => t.key === 'risk-level')?.value || 'medium';
  
  const approvalMatrix = {
    'low': { approvers: 0, autoApprove: true },
    'medium': { approvers: 1, autoApprove: false },
    'high': { approvers: 2, autoApprove: false },
    'critical': { approvers: 2, requiresOwner: true, requiresSecurityReview: true }
  };
  
  return approvalMatrix[riskLevel];
};
```

### Step 4: Generate Run Receipt

```javascript
// Create immutable receipt
const generateReceipt = (scenarioRun) => {
  const receipt = {
    receipt_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    scenario_id: scenarioRun.scenario_id,
    scenario_name: scenarioRun.scenario_name,
    action: 'execute_scenario',
    actor: 'agent:sintraprime-v2',
    operations_used: scenarioRun.operations_used,
    cost: scenarioRun.operations_used * 0.005,
    outcome: scenarioRun.status,
    evidence_hash: hashEvidence(scenarioRun),
    signature: signReceipt(scenarioRun)
  };
  
  // Store in audit trail
  await storeReceipt(receipt);
  
  return receipt;
};
```

---

## Policy Pack Rules

### Rule 1: No Production Scenarios Without Approval

All scenarios tagged with `environment:production` must have:
- At least one approval
- Valid cost estimate
- Error handling configured
- Monitoring enabled

### Rule 2: High-Cost Scenarios Require Justification

Scenarios with estimated monthly cost >$500 must include:
- Business justification in description
- Cost-benefit analysis
- Alternative solutions considered
- Owner approval

### Rule 3: External API Calls Require Security Review

Scenarios making external API calls must:
- Use HMAC verification for webhooks
- Store API keys in secrets vault
- Implement rate limiting
- Have retry logic with exponential backoff

### Rule 4: Data Transformations Require Validation

Scenarios that transform data must:
- Validate input data format
- Handle edge cases (null, empty, malformed)
- Log transformation errors
- Implement rollback mechanism

---

## Integration with Make.com

### Webhook Setup

Configure Make.com webhook to send scenario events:

```javascript
// Webhook endpoint: /api/make/webhook
// Method: POST
// Headers: X-Make-Signature (HMAC-SHA256)

const verifyWebhook = (req) => {
  const signature = req.headers['x-make-signature'];
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.MAKE_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
};
```

### Scenario Metadata

Add metadata to all Make.com scenarios:

```json
{
  "scenario_id": "123456",
  "name": "Legal Document Processing",
  "description": "Processes incoming legal documents and extracts key information",
  "tags": [
    { "key": "environment", "value": "production" },
    { "key": "owner", "value": "ihoward40" },
    { "key": "cost-center", "value": "legal-ops" },
    { "key": "risk-level", "value": "medium" }
  ],
  "scheduling": {
    "type": "interval",
    "interval_minutes": 15
  },
  "estimated_operations": 1000,
  "monitoring": {
    "enabled": true,
    "alert_on_failure": true,
    "alert_threshold": 3
  }
}
```

---

## Monitoring & Alerts

### Severity Classification

- **SEV0 (Critical)**: Scenario failure affecting production, data loss, security breach
- **SEV1 (High)**: Scenario failure affecting non-critical features, performance degradation
- **SEV2 (Medium)**: Scenario warning, approaching budget limits, rate limit warnings
- **SEV3 (Low)**: Informational, successful runs, configuration changes

### Alert Channels

- **Slack**: High-severity alerts (SEV0-SEV2)
- **Email**: Weekly summary reports
- **Webhook**: Real-time events to monitoring dashboard

---

## Compliance Checklist

Before deploying a Make.com scenario:

- [ ] All required tags present
- [ ] Budget estimate within limits
- [ ] Approval gates satisfied
- [ ] Error handling configured
- [ ] Monitoring enabled
- [ ] HMAC verification setup
- [ ] Secrets properly stored
- [ ] Run receipt generation enabled
- [ ] Rollback plan documented
- [ ] AGENTS.md constitution followed

---

## Examples

### Example 1: Low-Risk Scenario (Auto-Approve)

```json
{
  "name": "Test Email Notification",
  "tags": [
    { "key": "environment", "value": "dev" },
    { "key": "owner", "value": "ihoward40" },
    { "key": "cost-center", "value": "testing" },
    { "key": "risk-level", "value": "low" }
  ],
  "estimated_operations": 10,
  "estimated_cost": 0.05
}
```

**Result**: Auto-approved, no manual review required

### Example 2: High-Risk Scenario (Two Approvers)

```json
{
  "name": "Production Payment Processing",
  "tags": [
    { "key": "environment", "value": "production" },
    { "key": "owner", "value": "ihoward40" },
    { "key": "cost-center", "value": "finance" },
    { "key": "risk-level", "value": "high" }
  ],
  "estimated_operations": 5000,
  "estimated_cost": 25.00
}
```

**Result**: Requires two approvers, security review, and owner approval

---

## Troubleshooting

### Issue: Scenario Rejected Due to Budget

**Solution**: Optimize scenario to reduce operations, or request budget increase

### Issue: Missing Required Tags

**Solution**: Add required tags (environment, owner, cost-center) to scenario metadata

### Issue: HMAC Verification Failed

**Solution**: Verify webhook secret matches Make.com configuration

---

## References

- [AGENTS.md Constitution](../../AGENTS.md)
- [Make.com API Documentation](https://www.make.com/en/api-documentation)
- [HMAC Verification Guide](https://www.make.com/en/help/webhooks/hmac-verification)

---

**END OF SKILL**

# SintraPrime Integration Guide

## Overview

SintraPrime is a comprehensive governance and automation framework integrated into the IKE Tax Agent platform. It provides enterprise-grade features including:

- **Kilo Code Governance** - Fail-closed operation rules and badge honesty
- **Cryptographic Audit Trail** - Immutable receipt ledger with SHA-256 verification
- **Policy Gates & Spending Controls** - Daily/weekly/monthly caps with approval workflows
- **Monitoring & Forensics** - Real-time system health and forensic analysis
- **DeepThink Analysis** - AI-powered legal and financial strategy analysis
- **Enhanced Browser Automation** - PACER access and court filing automation
- **Howard Trust Navigator** - Specialized trust administration modules

---

## Architecture

### Core Components

```
.kilocode/skills/          # Agent skills with progressive disclosure
scripts/github/            # GitHub automation and productization
server/lib/
  ├── receiptLedger.ts     # Cryptographic audit trail
  ├── policyGates.ts       # Spending controls and approval workflows
  ├── monitoring.ts        # System health and forensics
  ├── deepThink.ts         # AI analysis engine
  ├── browserAutomation.ts # Browser automation utilities
  ├── trustAdmin.ts        # Trust administration module
  └── skillRegistry.ts     # Skill discovery and loading
```

### Governance Files

- **AGENTS.md** - Agent constitution with fail-closed prime directive
- **productize.config.json** - GitHub repository management configuration
- **CODEOWNERS** - Critical file protection rules

---

## Receipt Ledger

The receipt ledger provides an immutable audit trail with cryptographic verification.

### Creating Receipts

```typescript
import { createReceipt } from './server/lib/receiptLedger';

const receipt = await createReceipt({
  action: 'payment_processed',
  actor: 'user:123',
  details: {
    amount: 5000,
    payment_method: 'stripe',
    invoice_id: 'inv_abc123',
  },
  outcome: 'success',
  severity: 'medium',
  requiresReview: false,
  metadata: {
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0...',
  },
});
```

### Verifying Receipts

```typescript
import { verifyReceiptIntegrity } from './server/lib/receiptLedger';

const isValid = await verifyReceiptIntegrity(receipt.id);
// Returns true if signature and evidence hash are valid
```

### Querying Receipt Chain

```typescript
import { getReceiptChain } from './server/lib/receiptLedger';

// Get all receipts for an action
const receipts = await getReceiptChain({ action: 'payment_processed' });

// Get receipts for an actor
const userReceipts = await getReceiptChain({ actor: 'user:123' });

// Get receipts in date range
const recentReceipts = await getReceiptChain({
  startDate: new Date('2026-02-01'),
  endDate: new Date('2026-02-16'),
});
```

### Logging Blocked Actions

```typescript
import { logBlockedAction } from './server/lib/receiptLedger';

await logBlockedAction(
  'unauthorized_access',
  'user:456',
  'Attempted to access admin panel without permissions'
);
```

---

## Policy Gates

Policy gates enforce spending limits and approval workflows.

### Checking Policy Gates

```typescript
import { checkPolicyGate } from './server/lib/policyGates';

const result = await checkPolicyGate(
  userId,
  'llm_api_call',
  2500 // $25.00 in cents
);

if (!result.allowed) {
  if (result.requiresApproval) {
    // Create approval request
    const approvalId = await createApprovalRequest({
      userId,
      action: 'llm_api_call',
      estimatedCost: 2500,
      justification: 'Deep analysis required for case strategy',
    });
  } else {
    // Blocked by spending limit
    console.error(result.reason);
  }
}
```

### Recording Spending

```typescript
import { recordSpending } from './server/lib/policyGates';

await recordSpending(
  userId,
  'llm_api_call',
  2347 // Actual cost in cents
);
```

### Idempotency Checks

```typescript
import { checkIdempotency, markOperationExecuted } from './server/lib/policyGates';

const operationId = `payment_${invoiceId}`;

if (await checkIdempotency(operationId)) {
  throw new Error('Operation already executed');
}

// Execute operation
await processPayment(invoiceId);

// Mark as executed
await markOperationExecuted(operationId);
```

---

## Monitoring & Forensics

### System Health

```typescript
import { getSystemHealth } from './server/lib/monitoring';

const health = await getSystemHealth();

console.log(`Compliance Score: ${health.compliance.score}%`);
console.log(`Total Receipts: ${health.receipts.total}`);
console.log(`Receipts (24h): ${health.receipts.last24h}`);
console.log(`Requires Review: ${health.receipts.requiresReview}`);
```

### Forensic Analysis

```typescript
import { performForensicAnalysis } from './server/lib/monitoring';

const analysis = await performForensicAnalysis(
  new Date('2026-02-01'),
  new Date('2026-02-16')
);

console.log(`Total Actions: ${analysis.totalActions}`);
console.log(`Failure Rate: ${analysis.failureRate.toFixed(2)}%`);
console.log(`Blocked Actions: ${analysis.blockedActions}`);
console.log(`Integrity: ${analysis.integrityStatus.valid ? 'PASS' : 'FAIL'}`);
```

### Credit Monitoring

```typescript
import { monitorCreditUsage } from './server/lib/monitoring';

const monitoring = await monitorCreditUsage(userId);

console.log(`Current Balance: $${monitoring.currentBalance / 100}`);
console.log(`Total Spent: $${monitoring.totalSpent / 100}`);
console.log(`Projected Monthly: $${monitoring.projectedMonthlySpend / 100}`);

monitoring.alerts.forEach(alert => {
  console.log(`[${alert.severity.toUpperCase()}] ${alert.message}`);
});
```

---

## DeepThink Analysis

AI-powered analysis for legal strategy, financial planning, and compliance review.

### Running Analysis

```typescript
import { runDeepThinkAnalysis } from './server/lib/deepThink';

const result = await runDeepThinkAnalysis({
  userId: 123,
  scenario: 'Client is facing debt collection lawsuit with potential FDCPA violations',
  context: {
    debt_amount: 15000,
    collector: 'ABC Collections LLC',
    violations: ['improper validation', 'harassment', 'false threats'],
    state: 'California',
  },
  analysisType: 'legal_strategy',
  depth: 'deep',
});

console.log('Findings:', result.findings);
console.log('Recommendations:', result.recommendations);
console.log('Risks:', result.risks);
console.log('Confidence:', result.confidence);
```

### Analysis Types

- **legal_strategy** - Legal case strategy and tactics
- **financial_analysis** - Financial planning and tax optimization
- **trust_planning** - Trust structure and administration
- **compliance_review** - Regulatory compliance assessment

### Analysis Depth

- **shallow** - Quick analysis with top 3 findings
- **medium** - Balanced analysis with detailed findings
- **deep** - Exhaustive analysis with comprehensive recommendations

### Generating Reports

```typescript
import { generateAnalysisReport } from './server/lib/deepThink';

const markdown = generateAnalysisReport(result);
// Returns formatted Markdown report
```

---

## Trust Administration

Howard Trust Navigator provides specialized trust administration features.

### Creating Trusts

```typescript
import { createTrust } from './server/lib/trustAdmin';

const trustId = await createTrust({
  name: 'Howard Family Irrevocable Trust',
  trustType: 'irrevocable',
  settlor: 'Isiah Howard',
  establishedDate: new Date('2024-01-15'),
  purpose: 'Asset protection and estate planning',
  terms: 'Full trust document text...',
  createdBy: userId,
});
```

### Adding Trustees

```typescript
import { addTrustee } from './server/lib/trustAdmin';

const trusteeId = await addTrustee({
  trustId,
  name: 'Jane Smith',
  role: 'primary',
  contactEmail: 'jane@example.com',
  contactPhone: '555-0123',
  appointedDate: new Date(),
});
```

### Recording Fiduciary Duties

```typescript
import { recordFiduciaryDuty } from './server/lib/trustAdmin';

await recordFiduciaryDuty({
  trustId,
  trusteeId,
  dutyType: 'accounting',
  actionTaken: 'Prepared quarterly financial statement',
  outcome: 'Completed and filed',
  performedBy: userId,
});
```

### Compliance Status

```typescript
import { getTrustComplianceStatus } from './server/lib/trustAdmin';

const status = await getTrustComplianceStatus(trustId);

console.log(`Compliance Score: ${status.compliance_score}%`);
console.log(`Active Trustees: ${status.active_trustees}`);
console.log(`Issues:`, status.issues);
```

---

## Browser Automation

Enhanced browser automation for PACER access and court filings.

### PACER Search

```typescript
import { createPacerSearchTask, executeBrowserTask } from './server/lib/browserAutomation';

const task = createPacerSearchTask({
  caseNumber: '2:24-cv-12345',
  court: 'cacd', // Central District of California
  credentials: {
    username: process.env.PACER_USERNAME!,
    password: process.env.PACER_PASSWORD!,
  },
});

const result = await executeBrowserTask(task, userId);
```

### Document Downloads

```typescript
import { batchDownloadDocuments } from './server/lib/browserAutomation';

const results = await batchDownloadDocuments([
  'https://ecf.cacd.uscourts.gov/doc1/12345',
  'https://ecf.cacd.uscourts.gov/doc1/67890',
], userId);

results.forEach(r => {
  if (r.success) {
    console.log(`Downloaded: ${r.url} -> ${r.path}`);
  } else {
    console.error(`Failed: ${r.url} - ${r.error}`);
  }
});
```

---

## Agent Skills

Skills provide specialized capabilities with progressive disclosure.

### Available Skills

1. **sintraprime-make-blueprints** - Make.com scenario blueprints
2. **sintraprime-github-productize** - GitHub repository productization
3. **sintraprime-ci-badges-honesty** - CI badge verification

### Skill Structure

```
.kilocode/skills/{skill-name}/
  ├── SKILL.md           # Skill instructions
  ├── templates/         # Optional templates
  └── examples/          # Optional examples
```

### Loading Skills

```typescript
import { scanProjectSkills, loadSkillInstructions } from './server/lib/skillRegistry';

// Scan for available skills
const skills = await scanProjectSkills();

// Load specific skill
const instructions = await loadSkillInstructions('sintraprime-github-productize');
```

---

## GitHub Automation

Automated repository productization and badge management.

### Running Productize Script

```bash
node scripts/github/productize.mjs --repo owner/repo-name
```

### Features

- Updates repository description and topics
- Adds/updates README badges
- Verifies CI and CodeQL workflows
- Creates pull requests for changes
- Enforces badge honesty (only shows passing CI when actually passing)

### Configuration

Edit `productize.config.json`:

```json
{
  "repository": {
    "description": "Your project description",
    "homepage": "https://example.com",
    "topics": ["tag1", "tag2"]
  },
  "badges": {
    "style": "flat-square",
    "verify_ci": true
  }
}
```

---

## Testing

Run the SintraPrime integration test suite:

```bash
pnpm test server/sintraprime.test.ts
```

### Test Coverage

- Receipt ledger creation and verification
- Policy gate enforcement
- Spending controls and approval workflows
- System health monitoring
- Forensic analysis
- DeepThink AI analysis
- Kilo Code governance enforcement

---

## Security Considerations

### Secrets Management

- Never print secrets to logs or console
- Use environment variables for credentials
- Rotate API keys regularly
- Implement least-privilege access

### Audit Trail

- All critical operations create receipts
- Receipts are cryptographically signed
- Receipt chain integrity is verifiable
- Blocked actions are logged with high severity

### Spending Controls

- Daily/weekly/monthly limits prevent runaway costs
- Approval workflows for high-risk operations
- Idempotency checks prevent duplicate charges
- Real-time monitoring and alerts

---

## Troubleshooting

### Receipt Verification Failures

If receipt verification fails:

1. Check database connectivity
2. Verify JWT_SECRET environment variable
3. Ensure receipt hasn't been tampered with
4. Check system clock synchronization

### Policy Gate Rejections

If actions are blocked unexpectedly:

1. Check current spending with `getSpendingSummary()`
2. Verify spending limits in policy configuration
3. Review recent receipts for spending history
4. Check for pending approval requests

### DeepThink Analysis Errors

If analysis fails:

1. Verify LLM API credentials
2. Check network connectivity
3. Ensure scenario and context are well-formed
4. Review LLM API rate limits

---

## Best Practices

1. **Always create receipts** for critical operations
2. **Check policy gates** before expensive operations
3. **Use idempotency checks** for financial transactions
4. **Monitor system health** regularly
5. **Review blocked actions** for security issues
6. **Run forensic analysis** weekly
7. **Keep governance files** under version control
8. **Test integrations** before production deployment

---

## Support

For issues or questions:

1. Review this documentation
2. Check test suite for examples
3. Review AGENTS.md for governance rules
4. Contact platform support at https://help.manus.im

---

*SintraPrime Integration - Version 1.0.0*

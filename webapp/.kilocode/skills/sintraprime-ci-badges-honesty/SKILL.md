# SintraPrime CI Badges Honesty Skill

**Version**: 1.0.0  
**Category**: CI/CD, Badge Verification, Governance  
**Complexity**: Intermediate  
**Prerequisites**: GitHub Actions, CI workflows configured

---

## Purpose

This skill prevents misleading CI badges by enforcing verification that workflows exist, are passing on the default branch, and follow the "no fake-green" policy from AGENTS.md.

---

## When to Use

Use this skill when:

- Adding CI badges to README.md
- Updating existing CI badges
- Verifying CI status before displaying badges
- Auditing repository badge honesty
- Creating automated badge update workflows
- Ensuring compliance with AGENTS.md constitution

---

## Core Principles

### Principle 1: Fail-Closed Operation

**NEVER** assume a CI workflow is passing. Always verify:

1. Workflow file exists
2. Workflow has run
3. Latest run is on default branch
4. Conclusion is "success"

If any verification step fails, **DO NOT** display a passing badge.

### Principle 2: Transparency Over Aesthetics

It's better to show "no status" than to show a fake green badge.

**Good**:
- `![CI](https://img.shields.io/badge/CI-no%20status-lightgrey)`

**Bad**:
- `![CI](https://img.shields.io/badge/CI-passing-brightgreen)` (without verification)

### Principle 3: Verification Before Display

Every badge update must include verification:

1. Fetch latest workflow runs from GitHub API
2. Check conclusion of latest run
3. Document verification result
4. Only display badge if verification passes

---

## Badge Honesty Workflow

### Step 1: Check Workflow File Exists

```javascript
import { promises as fs } from 'fs';
import path from 'path';

async function workflowFileExists(repoPath, workflowFile) {
  try {
    const workflowPath = path.join(repoPath, '.github', 'workflows', workflowFile);
    await fs.access(workflowPath);
    return true;
  } catch (error) {
    return false;
  }
}

// Usage
const exists = await workflowFileExists('/path/to/repo', 'ci.yml');
if (!exists) {
  console.log('❌ Workflow file does not exist - cannot display badge');
}
```

### Step 2: Verify Workflow Runs on Default Branch

```javascript
import { getLatestWorkflowRun } from './lib/gh.mjs';

async function verifyWorkflowRuns(client, owner, repo, workflowFile, defaultBranch) {
  const latestRun = await getLatestWorkflowRun(client, owner, repo, workflowFile, defaultBranch);
  
  if (!latestRun) {
    return {
      verified: false,
      reason: 'No workflow runs found on default branch'
    };
  }
  
  return {
    verified: true,
    run: latestRun
  };
}

// Usage
const verification = await verifyWorkflowRuns(client, 'owner', 'repo', 'ci.yml', 'main');
if (!verification.verified) {
  console.log('❌ No workflow runs found');
}
```

### Step 3: Check Workflow Conclusion

```javascript
function checkWorkflowConclusion(workflowRun) {
  const { status, conclusion } = workflowRun;
  
  if (status !== 'completed') {
    return {
      passing: false,
      reason: `Workflow is ${status}, not completed`
    };
  }
  
  if (conclusion !== 'success') {
    return {
      passing: false,
      reason: `Workflow conclusion is ${conclusion}, not success`
    };
  }
  
  return {
    passing: true,
    reason: 'Workflow is passing on default branch'
  };
}

// Usage
const result = checkWorkflowConclusion(latestRun);
if (!result.passing) {
  console.log('❌ Workflow is not passing:', result.reason);
}
```

### Step 4: Generate Honest Badge

```javascript
function generateHonestBadge(owner, repo, workflowFile, verification) {
  if (!verification.passing) {
    // Show "no status" badge instead of fake green
    return `![CI](https://img.shields.io/badge/CI-no%20status-lightgrey?style=flat-square)`;
  }
  
  // Show actual status badge with link to workflow
  const badgeUrl = `https://img.shields.io/github/actions/workflow/status/${owner}/${repo}/${workflowFile}?style=flat-square&label=CI`;
  const workflowUrl = `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`;
  
  return `[![CI](${badgeUrl})](${workflowUrl})`;
}

// Usage
const badge = generateHonestBadge('owner', 'repo', 'ci.yml', verification);
console.log(badge);
```

---

## Verification Checklist

Before displaying any CI badge:

- [ ] Workflow file exists in `.github/workflows/`
- [ ] Workflow has run at least once
- [ ] Latest run is on default branch (main/master)
- [ ] Latest run status is "completed"
- [ ] Latest run conclusion is "success"
- [ ] Badge URL points to actual workflow
- [ ] Verification result documented in commit/PR

---

## Badge States

### State 1: Passing (Green)

**Conditions**:
- Workflow exists
- Latest run on default branch
- Status: completed
- Conclusion: success

**Badge**:
```markdown
[![CI](https://img.shields.io/github/actions/workflow/status/owner/repo/ci.yml?style=flat-square&label=CI)](https://github.com/owner/repo/actions/workflows/ci.yml)
```

### State 2: Failing (Red)

**Conditions**:
- Workflow exists
- Latest run on default branch
- Status: completed
- Conclusion: failure

**Badge**:
```markdown
[![CI](https://img.shields.io/github/actions/workflow/status/owner/repo/ci.yml?style=flat-square&label=CI)](https://github.com/owner/repo/actions/workflows/ci.yml)
```

**Note**: Display failing badge to show transparency, but mark as "needs attention"

### State 3: In Progress (Yellow)

**Conditions**:
- Workflow exists
- Latest run on default branch
- Status: in_progress

**Badge**:
```markdown
![CI](https://img.shields.io/badge/CI-in%20progress-yellow?style=flat-square)
```

**Note**: Do not display as "passing" until completed

### State 4: No Status (Grey)

**Conditions**:
- Workflow file does not exist, OR
- No runs on default branch, OR
- Cannot verify status

**Badge**:
```markdown
![CI](https://img.shields.io/badge/CI-no%20status-lightgrey?style=flat-square)
```

**Note**: Always prefer "no status" over fake green

---

## Automated Verification

### GitHub Action for Badge Verification

```yaml
name: Verify Badges

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
      
      - name: Install dependencies
        run: npm install @octokit/rest
      
      - name: Verify badges
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/github/verify-badges.mjs
      
      - name: Create issue if badges are dishonest
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '⚠️ Badge Honesty Violation Detected',
              body: 'Automated verification found dishonest badges in README.md. Please run productize script to fix.',
              labels: ['badge-honesty', 'governance']
            })
```

### Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Verify badges before commit
if git diff --cached --name-only | grep -q "README.md"; then
  echo "Verifying badges in README.md..."
  node scripts/github/verify-badges.mjs
  
  if [ $? -ne 0 ]; then
    echo "❌ Badge verification failed. Commit aborted."
    echo "Run 'node scripts/github/productize.mjs' to fix badges."
    exit 1
  fi
  
  echo "✅ Badge verification passed"
fi
```

---

## Common Violations

### Violation 1: Fake Green Badge

**Example**:
```markdown
![CI](https://img.shields.io/badge/CI-passing-brightgreen)
```

**Problem**: Static badge, not linked to actual CI status

**Fix**: Use GitHub Actions badge with verification
```markdown
[![CI](https://img.shields.io/github/actions/workflow/status/owner/repo/ci.yml)](https://github.com/owner/repo/actions/workflows/ci.yml)
```

### Violation 2: Badge for Non-Existent Workflow

**Example**:
```markdown
[![CI](https://img.shields.io/github/actions/workflow/status/owner/repo/ci.yml)](...)
```

**Problem**: Workflow file `ci.yml` does not exist

**Fix**: Either create the workflow or remove the badge

### Violation 3: Badge Showing Passing When Failing

**Example**: Badge shows green, but latest CI run failed

**Problem**: Badge cache not updated, or using wrong branch

**Fix**: Force badge refresh, verify default branch

---

## Enforcement

### Automated Enforcement

1. **Daily verification**: Run badge verification workflow daily
2. **Pre-commit hook**: Verify badges before allowing commit
3. **Pull request checks**: Require badge verification in CI
4. **Issue creation**: Auto-create issue when violation detected

### Manual Enforcement

1. **Code review**: Reviewers must verify badges in PRs
2. **Audit trail**: Document badge verification in commit messages
3. **Governance review**: Quarterly audit of all repository badges

---

## Compliance Report

Generate compliance report:

```javascript
import { getCISummary } from './lib/ci-status.mjs';

async function generateComplianceReport(client, owner, repo, defaultBranch) {
  const summary = await getCISummary(client, owner, repo, defaultBranch);
  
  const report = {
    repository: `${owner}/${repo}`,
    timestamp: new Date().toISOString(),
    total_workflows: summary.total,
    passing: summary.passing,
    failing: summary.failing,
    unknown: summary.unknown,
    compliance_rate: (summary.passing / summary.total * 100).toFixed(2) + '%',
    workflows: summary.workflows
  };
  
  console.log('Compliance Report:');
  console.log(JSON.stringify(report, null, 2));
  
  return report;
}
```

---

## References

- [AGENTS.md Constitution](../../AGENTS.md)
- [GitHub Actions Badge Documentation](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/adding-a-workflow-status-badge)
- [Shields.io Documentation](https://shields.io/)

---

**END OF SKILL**

# SintraPrime GitHub Productize Skill

**Version**: 1.0.0  
**Category**: GitHub, Automation, Badge Honesty  
**Complexity**: Intermediate  
**Prerequisites**: GitHub account, GITHUB_TOKEN environment variable

---

## Purpose

This skill productizes GitHub repositories with honest badges by verifying CI status before displaying badges, following the badge honesty principles from AGENTS.md.

---

## When to Use

Use this skill when:

- Setting up a new GitHub repository
- Updating repository metadata (description, topics, homepage)
- Adding or updating CI/CD badges
- Ensuring badge honesty (only showing passing CI)
- Creating pull requests for badge updates
- Auditing repository compliance

---

## Core Capabilities

### 1. Repository Metadata Management

Updates repository information:

- **Description**: Clear, concise repository description
- **Homepage**: Project website or documentation URL
- **Topics**: Relevant tags for discoverability (max 20)
- **Visibility**: Public/private settings
- **License**: Open source license type

### 2. CI Status Verification

Verifies CI workflows before displaying badges:

- **Workflow existence**: Checks if `.github/workflows/*.yml` files exist
- **Workflow runs**: Fetches latest run status from GitHub API
- **Default branch**: Only considers runs on main/master branch
- **Conclusion**: Verifies workflow conclusion is "success"
- **Badge honesty**: Only displays green badge if CI is actually passing

### 3. Badge Generation

Generates honest badges with verification:

- **CI badges**: GitHub Actions workflow status
- **CodeQL badges**: Security scanning status
- **License badges**: Repository license type
- **Version badges**: Package version from package.json
- **Custom badges**: Project-specific badges (Kilo Code, Governance)

### 4. Automated Pull Requests

Creates pull requests for badge updates:

- **Branch creation**: Creates feature branch for changes
- **README updates**: Adds/updates badges in README.md
- **Commit message**: Follows conventional commits format
- **PR description**: Includes risk assessment and verification checklist
- **Reviewers**: Assigns appropriate reviewers

---

## Usage Instructions

### Step 1: Configure productize.config.json

```json
{
  "version": "1.0.0",
  "repositories": [
    {
      "owner": "ihoward40",
      "repo": "sintraprime",
      "description": "Revolutionary legal technology platform",
      "homepage": "https://sintraprime.manus.space",
      "topics": ["legal-tech", "ai-agents", "kilo-code"],
      "badges": {
        "style": "flat-square",
        "ci": {
          "enabled": true,
          "workflow": "ci.yml",
          "verifyBeforeDisplay": true
        },
        "codeql": {
          "enabled": true,
          "workflow": "codeql.yml",
          "verifyBeforeDisplay": true
        }
      }
    }
  ],
  "settings": {
    "verifyCI": true,
    "dryRun": false,
    "verbose": true
  }
}
```

### Step 2: Run Productize Script

```bash
# Set GitHub token
export GITHUB_TOKEN="your_github_token"

# Run productize script
node scripts/github/productize.mjs

# Dry run (no changes)
node scripts/github/productize.mjs --dry-run
```

### Step 3: Review Pull Request

The script will create a pull request with:

- Updated repository metadata
- Verified CI badges
- Risk assessment
- Verification checklist

### Step 4: Merge and Deploy

After review and approval:

1. Merge the pull request
2. Badges will automatically update
3. Repository metadata will be live

---

## Badge Honesty Rules

### Rule 1: Never Display Fake Green Badges

**NEVER** show a passing badge unless:

1. Workflow file exists in `.github/workflows/`
2. Workflow has run on the default branch
3. Latest run conclusion is "success"
4. Workflow is not skipped or cancelled

### Rule 2: Use "No Status" for Unverified Workflows

If CI status cannot be verified:

- Display "no status" badge (grey)
- Do not assume workflow is passing
- Do not hide the badge (transparency)

### Rule 3: Verify Before Every Update

Before updating badges:

1. Fetch latest workflow runs from GitHub API
2. Check conclusion of latest run on default branch
3. Only display badge if verification passes
4. Document verification result in PR

---

## Integration with GitHub API

### Authentication

```javascript
import { Octokit } from '@octokit/rest';

const client = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'sintraprime-productize/1.0.0'
});
```

### Verify CI Status

```javascript
import { verifyCIBadge } from './lib/ci-status.mjs';

const verification = await verifyCIBadge(
  client,
  'ihoward40',
  'sintraprime',
  'ci.yml',
  'main'
);

if (verification.shouldDisplay) {
  console.log('✅ CI is passing - badge can be displayed');
} else {
  console.log('❌ CI is not passing - badge should not be displayed');
  console.log('Reason:', verification.reason);
}
```

### Update Repository Metadata

```javascript
import { updateRepository } from './lib/gh.mjs';

await updateRepository(client, 'ihoward40', 'sintraprime', {
  description: 'Revolutionary legal technology platform',
  homepage: 'https://sintraprime.manus.space',
  topics: ['legal-tech', 'ai-agents', 'kilo-code']
});
```

### Create Pull Request

```javascript
import { createPullRequest } from './lib/gh.mjs';

const pr = await createPullRequest(client, 'ihoward40', 'sintraprime', {
  title: 'chore: Update repository badges and metadata',
  body: 'This PR updates repository badges with CI verification.',
  head: 'productize/update-badges',
  base: 'main'
});

console.log(`Pull request created: ${pr.html_url}`);
```

---

## Badge Types

### 1. CI Badge (GitHub Actions)

```markdown
[![CI](https://img.shields.io/github/actions/workflow/status/owner/repo/ci.yml?style=flat-square&label=CI)](https://github.com/owner/repo/actions/workflows/ci.yml)
```

**Verification**: Checks latest workflow run on default branch

### 2. CodeQL Badge (Security Scanning)

```markdown
[![CodeQL](https://img.shields.io/github/actions/workflow/status/owner/repo/codeql.yml?style=flat-square&label=CodeQL)](https://github.com/owner/repo/actions/workflows/codeql.yml)
```

**Verification**: Checks latest CodeQL scan results

### 3. License Badge

```markdown
![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)
```

**Verification**: None required (static badge)

### 4. Version Badge

```markdown
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)
```

**Verification**: Reads from package.json

### 5. Custom Badge (Kilo Code)

```markdown
[![Kilo Code](https://img.shields.io/badge/Kilo%20Code-Compliant-00d4ff?style=flat-square&logo=github)](https://github.com/Kilo-Org/kilocode)
```

**Verification**: Manual compliance check

---

## Workflow Integration

### CI Workflow (.github/workflows/ci.yml)

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build
```

### CodeQL Workflow (.github/workflows/codeql.yml)

```yaml
name: CodeQL

on:
  push:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 1'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
```

---

## Compliance Checklist

Before productizing a repository:

- [ ] GITHUB_TOKEN environment variable set
- [ ] productize.config.json configured
- [ ] CI workflows exist in .github/workflows/
- [ ] CI workflows run on default branch
- [ ] README.md exists
- [ ] CODEOWNERS file configured
- [ ] AGENTS.md constitution followed
- [ ] Badge honesty rules enforced

---

## Examples

### Example 1: Productize Single Repository

```bash
# Configure productize.config.json
# Run productize script
export GITHUB_TOKEN="ghp_..."
node scripts/github/productize.mjs
```

**Output**:
```
🚀 SintraPrime Repository Productization Tool
   Kilo Code Compliant - Badge Honesty Enforced

📋 Loaded configuration (version 1.0.0)
   - Repositories: 1
   - Verify CI: Yes
   - Dry run: No

🔐 Verifying GitHub token...
✅ Authenticated as ihoward40

================================================================================
Productizing ihoward40/sintraprime
================================================================================

📋 Fetching repository information...
📝 Updating repository metadata...
🔍 Verifying CI status...

   CI Verification Results:
   - ci.yml: ✅ PASS (CI is passing on default branch)
   - codeql.yml: ✅ PASS (CI is passing on default branch)

🏷️  Generating badges...
📄 Updating README.md...
🌿 Creating branch productize/update-badges...
📝 Committing README changes...
🔀 Creating pull request...
✅ Pull request created: https://github.com/ihoward40/sintraprime/pull/123

✅ Productization complete!
   - Total badges: 5
   - Passing CI: 2
   - Failing CI: 0
   - No status: 0
```

### Example 2: Dry Run Mode

```bash
export GITHUB_TOKEN="ghp_..."
node scripts/github/productize.mjs --dry-run
```

**Output**:
```
[DRY RUN] Would update:
   - Description: Revolutionary legal technology platform
   - Homepage: https://sintraprime.manus.space
   - Topics: legal-tech, ai-agents, kilo-code

[DRY RUN] Would update README.md with new badges

⚠️  DRY RUN MODE - No changes were made to repositories
```

---

## Troubleshooting

### Issue: GitHub Token Invalid

**Solution**: Verify GITHUB_TOKEN has required permissions (repo, workflow)

### Issue: CI Workflow Not Found

**Solution**: Ensure workflow file exists in `.github/workflows/` directory

### Issue: Badge Shows "No Status"

**Solution**: Run CI workflow on default branch, then re-run productize script

### Issue: Pull Request Already Exists

**Solution**: Close or merge existing PR, then re-run productize script

---

## References

- [AGENTS.md Constitution](../../AGENTS.md)
- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Shields.io Badge Documentation](https://shields.io/)

---

**END OF SKILL**

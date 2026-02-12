# PR checkout troubleshooting (local)

Goal: avoid “shell ate my command” mistakes and quickly confirm you’re on the intended PR branch/SHA.

## The common gotcha

Don’t run two commands on the same line like:

- ❌ `pr/searchrouter-job-schedule       gh pr checkout 23`

Each command must be its own line.

## Recommended flow (GitHub CLI)

### 1) Confirm current branch + cleanliness

```bash
git rev-parse --abbrev-ref HEAD
git status --porcelain=v1
```

### 2) Checkout the PR by number

```bash
gh pr checkout 23
```

### 3) Confirm you’re on the PR head

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
git --no-pager log -1 --oneline --decorate
```

## If `gh pr checkout` fails

### A) `gh`: command not found

Install GitHub CLI and authenticate:

```bash
gh --version
gh auth status
gh auth login
```

### B) “not a git repository”

You’re not in the repo root:

```bash
git rev-parse --show-toplevel
```

### C) Wrong branch after checkout / local drift

Fetch and retry checkout:

```bash
git fetch origin
git status --porcelain=v1
gh pr checkout 23
```

## CI-shaped sanity check (optional)

```bash
npm run -s ci:pr-slice; echo $LASTEXITCODE
```

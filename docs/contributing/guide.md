---
sidebar_position: 1
title: Contributing Guide
description: How to contribute to SintraPrime — code, documentation, skills, and community guidelines.
---

# Contributing Guide

Thank you for your interest in contributing to SintraPrime! This guide covers everything you need to know to contribute code, documentation, skills, and more.

## Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/SintraPrime.git
cd SintraPrime
npm install
```

### 2. Create a Branch

SintraPrime uses a multi-branch development model with 30+ branches:

```bash
# Create a feature branch from main
git checkout -b feature/your-feature-name
```

### 3. Set Up Development Environment

```bash
cp .env.example .env
# Edit .env with your development configuration
npm run build
npm run dev
```

## Contribution Types

### Code Contributions

| Area | Directory | Description |
|:---|:---|:---|
| **Core** | `src/core/` | Orchestrator, planner, executor |
| **Agents** | `src/agents/` | Agent implementations |
| **Adapters** | `src/tools/` | External service adapters |
| **Skills** | `src/skills/` | Kilo skills |
| **Browser** | `src/browser/` | Playwright automation |
| **CLI** | `src/cli/` | Command-line interface |
| **Governance** | `governance/` | Governance policies and keys |
| **Airlock** | `airlock_server/` | Gateway server |
| **WebApp** | `webapp/` | Operator dashboard |

### Documentation Contributions

Documentation lives in the `docs/` directory and is built with Docusaurus:

```bash
cd docs
npm install
npm run start  # Local preview at http://localhost:3000
```

### Skill Contributions

Create new Kilo Skills:

```bash
# Create a skill scaffold
npx sintraprime kilo create my-new-skill

# Test the skill
npx sintraprime kilo test my-new-skill

# Submit for review
npx sintraprime kilo submit my-new-skill
```

## Development Guidelines

### Code Style

- **Language**: TypeScript (strict mode)
- **Formatting**: Prettier with project configuration
- **Linting**: ESLint with project rules
- **Testing**: Jest for unit tests

```bash
# Format code
npm run format

# Lint
npm run lint

# Run tests
npm test
```

### Governance Compliance

All contributions must comply with the governance model:

1. **Receipt generation** — New features must generate receipts for auditable operations
2. **Policy gates** — New operations must respect policy gate checks
3. **Mode awareness** — Code must check and respect the current governance mode
4. **AGENTS.md compliance** — Agent changes must be reflected in AGENTS.md

### Commit Messages

Use conventional commit format:

```
feat(adapters): add new SMS provider support
fix(governance): correct spending limit calculation
docs(evidence): update timeline builder documentation
test(agents): add SentinelGuard integration tests
```

## Pull Request Process

1. **Create a PR** against the appropriate branch
2. **Describe changes** with a clear summary and motivation
3. **Include tests** for new functionality
4. **Update documentation** for user-facing changes
5. **Pass CI checks** — all tests, linting, and badge honesty checks must pass
6. **Code review** — at least one maintainer review required

### CI Checks

| Check | Description |
|:---|:---|
| `build` | TypeScript compilation succeeds |
| `test` | All tests pass |
| `lint` | No linting errors |
| `badge-honesty` | CI badges accurately reflect status |
| `agent-registry-drift` | Agent registry unchanged without review |
| `governance-compliance` | New code respects governance model |

## Community

- **GitHub Issues** — Bug reports and feature requests
- **GitHub Discussions** — Questions and community discussion
- **Slack** — Real-time community chat (link in README)

## License

SintraPrime is licensed under the **Apache License 2.0**. By contributing, you agree that your contributions will be licensed under the same license.

:::info First-Time Contributors
Look for issues labeled `good-first-issue` for beginner-friendly tasks. The maintainers are happy to provide guidance and code review for new contributors.
:::

## Next Steps

- [Architecture Overview](../core-concepts/architecture-overview) — Understand the codebase
- [Kilo Skills](../kilo-skills/overview) — Create and share skills
- [API Reference](../api-reference/overview) — API documentation

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This project treats releases as evidence-grade freezes. See `docs/CONSTITUTION.v1.md` for the invariants.

## [Unreleased]

### Added

- Comprehensive testing infrastructure with Vitest
- GitHub Actions CI/CD pipeline with multiple jobs (lint, test, smoke, security)
- CodeQL security scanning workflow
- Release automation workflow
- Airlock deployment workflow
- ESLint and Prettier for code quality
- Pre-commit hooks with Husky, lint-staged, and commitlint
- Comprehensive documentation (CONTRIBUTING.md, SECURITY.md)
- GitHub issue templates for bugs and feature requests
- VSCode configuration for improved developer experience
- Docker support with Dockerfile and docker-compose.yml
- Dependabot configuration for automated dependency updates
- MIT License
- .nvmrc and .editorconfig for consistent development environment
- 31 unit tests for monitoring modules with 100% pass rate

### Changed

- Enhanced CI workflow with separate jobs for linting, testing, and security
- Updated README.md with status badges and project description
- Improved package.json with new scripts and dependencies

Allowed without constitutional amendment (if `npm run smoke:vectors` stays green):

- New read-only adapters
- New deterministic redacted artifacts
- UI improvements (operator console, timeline, explain)
- Stronger redaction rules
- Additional smoke vectors (never fewer)

Requires a minor-version constitutional amendment process:

- Receipt schema changes
- Hashing / verification semantics changes
- Approval persistence semantics changes
- Policy code / denial semantics changes

## [1.0.0] - 2026-01-11

### Added

- Verifier contract hardened (zip-or-dir, strict mode, JSON-last-line, stable exit codes, optional expect compare)
- Constitution v1 published with explicit determinism invariants (including "no global tail inference")
- Tier freeze checklist published
- Deterministic audit execution bundles (Tier-15.1) with bundle-local verifier + canonical verifier script
- Operator UI improvements for reading runs, timeline, and verify command copy

[Unreleased]: https://github.com/ihoward40/SintraPrime/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ihoward40/SintraPrime/releases/tag/v1.0.0

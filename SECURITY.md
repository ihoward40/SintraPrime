# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability within SintraPrime, please send an email to the repository owner. All security vulnerabilities will be promptly addressed.

**Please do not file public issues for security vulnerabilities.**

## Security Measures

### Secret Detection

This repository uses:
- Pre-commit hooks with secretlint to prevent committing secrets
- CodeQL security scanning for vulnerability detection
- Automated dependency vulnerability scanning via Dependabot

### Environment Variables

- **Never commit** `.env` files or any file containing real credentials
- Use `.env.example` as a template with placeholder values only
- All secrets must be configured via environment variables
- Required environment variables are validated at runtime with clear error messages

### API Keys and Tokens

- API keys must be at least 32 characters
- All API endpoints must use authentication
- Rate limiting is enforced on all external API calls
- Credentials are automatically redacted from logs

### Code Security

- TypeScript strict mode enabled for type safety
- Input validation using Zod schemas
- No use of `eval()` or `Function()` constructor with user input
- SQL injection prevention through parameterized queries
- XSS prevention through proper output encoding

### Infrastructure Security

#### Airlock Server
- Rate limiting: 100 requests/minute for webhooks
- Security headers via Helmet middleware (CSP, HSTS, frame protection)
- Authentication failure rate limiting: 5 failures per 15 minutes
- Health endpoint bypasses security layers for monitoring

#### Docker
- Non-root `node` user in all containers
- Multi-stage builds for minimal attack surface
- Health checks configured
- No secrets in Dockerfiles

### Dependency Management

- Daily security updates via Dependabot
- `npm audit` run on every build
- Engine-strict mode enforced via `.npmrc`
- Exact version pinning for dependencies

### Access Control

- CODEOWNERS file enforces review requirements for critical files
- Branch protection on `main` requires approvals
- Required status checks must pass before merge

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| develop | :white_check_mark: |

## Security Best Practices

When contributing:

1. **Never commit secrets**: Use environment variables and `.env.local` files (git-ignored)
2. **Validate all inputs**: Use Zod or similar validation libraries
3. **Sanitize outputs**: Prevent XSS and injection attacks
4. **Use parameterized queries**: Prevent SQL injection
5. **Implement rate limiting**: Prevent abuse of endpoints
6. **Log security events**: But never log sensitive data
7. **Follow principle of least privilege**: Grant minimum necessary permissions
8. **Keep dependencies updated**: Regularly update to patch vulnerabilities

## Security Contacts

- Primary: Repository owner
- Response time: Within 48 hours for critical vulnerabilities

## Disclosure Policy

- Security vulnerabilities are fixed and disclosed responsibly
- Critical vulnerabilities are patched within 48-72 hours
- Security advisories are published after fixes are deployed

# Contributing to SintraPrime

Thank you for your interest in contributing to SintraPrime! This document provides guidelines and instructions for contributing to the project.

## Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/SintraPrime.git
   cd SintraPrime
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create a feature branch**

   ```bash
   git checkout -b feature/my-feature
   ```

4. **Make your changes**
   - Write clean, maintainable code
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

5. **Run tests**

   ```bash
   npm test
   npm run test:coverage
   ```

6. **Run linting**

   ```bash
   npm run lint
   npm run format
   ```

7. **Commit your changes**
   - Use conventional commit messages (see below)
   - Pre-commit hooks will enforce code quality

8. **Push and create a pull request**
   ```bash
   git push origin feature/my-feature
   ```

## Code Style

- We use **ESLint** and **Prettier** for code formatting
- Run `npm run format` before committing
- Pre-commit hooks will automatically format and lint your code
- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comments for complex logic

## Testing

- Write tests for all new features
- Maintain 80%+ code coverage for critical paths
- Run `npm run test:watch` during development
- Test files should be co-located with source files or in the `tests/` directory
- Use descriptive test names that explain what is being tested

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('MyModule', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear and structured commit history.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semi colons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions or changes
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Maintenance tasks

### Examples

```bash
feat(monitoring): add severity classifier for credit spikes
fix(airlock): handle missing HMAC signature gracefully
docs(readme): update installation instructions
test(monitoring): add tests for runLogger
```

## Pull Request Process

1. **Update documentation** for any API changes
2. **Add tests** for new functionality
3. **Ensure all CI checks pass**
   - Linting
   - Type checking
   - Tests
   - Build
4. **Request review** from maintainers
5. **Address review feedback** promptly
6. **Keep PRs focused** - one feature or fix per PR
7. **Update CHANGELOG.md** if applicable

## Pull Request Template

When creating a PR, include:

- **Description**: What does this PR do?
- **Motivation**: Why is this change needed?
- **Testing**: How was this tested?
- **Screenshots**: If applicable
- **Breaking Changes**: Any breaking changes?
- **Related Issues**: Link to related issues

## Code Review Guidelines

### For Contributors

- Be open to feedback
- Respond to comments promptly
- Don't take criticism personally
- Ask questions if something is unclear

### For Reviewers

- Be respectful and constructive
- Explain the reasoning behind suggestions
- Approve when ready, request changes if needed
- Focus on code quality, not personal preferences

## Project Structure

```
SintraPrime/
├── src/                    # Source code
│   ├── monitoring/         # Monitoring and alerting
│   ├── security/           # Security utilities
│   ├── cli/                # CLI commands
│   └── ...
├── tests/                  # Test files
│   ├── monitoring/         # Monitoring tests
│   └── integration/        # Integration tests
├── airlock_server/         # Airlock gateway server
├── scripts/                # Build and utility scripts
├── docs/                   # Documentation
└── config/                 # Configuration files
```

## Development Tools

### Available Scripts

- `npm run build` - Build the project
- `npm run dev` - Run in development mode
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking

### Debugging

Use the VSCode debugger with the provided launch configurations:

1. Open a test file
2. Press F5
3. Select "Debug Current Test File"

## Architecture Guidelines

- **Separation of concerns**: Keep modules focused and single-purpose
- **Type safety**: Use TypeScript types everywhere
- **Error handling**: Handle errors gracefully
- **Logging**: Use structured logging (Pino)
- **Security**: Follow security best practices
- **Testing**: Write testable code

## Security

- Do not commit secrets or sensitive data
- Use environment variables for configuration
- Follow the principle of least privilege
- Report security vulnerabilities privately (see SECURITY.md)

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update governance documents if changing behavior
- Keep documentation in sync with code

## Getting Help

- Check existing issues and PRs
- Ask questions in issue comments
- Reach out to maintainers
- Review existing code for examples

## License

By contributing to SintraPrime, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Your contributions make SintraPrime better. We appreciate your time and effort!

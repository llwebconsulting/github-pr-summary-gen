# GitHub PR Summary Generator

[![CI](https://github.com/llwebconsulting/github-pr-summary-gen/actions/workflows/ci.yml/badge.svg)](https://github.com/llwebconsulting/github-pr-summary-gen/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/llwebconsulting/github-pr-summary-gen/branch/master/graph/badge.svg)](https://codecov.io/gh/llwebconsulting/github-pr-summary-gen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A Chrome extension that automatically generates pull request titles and summaries using OpenAI's GPT-3.5 model. This extension helps developers write better PR descriptions by analyzing the changes and generating comprehensive summaries.

## Features

- Automatically generates PR titles and summaries based on changes
- Uses OpenAI's GPT-3.5 model for intelligent summarization
- Secure storage of API keys
- Easy-to-use interface
- Works on GitHub PR creation pages
- Supports branch names with slashes
- Generates markdown-formatted summaries

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Setup

1. Click the extension icon in Chrome
2. Click the "Settings" button
3. Enter your required API keys:
   - GitHub access token
   - OpenAI API key

### Required API Keys

#### GitHub Token
You need a GitHub Personal Access Token with the following permissions:
- `repo` scope (Full control of private repositories)
  - Required for reading repository contents and comparing branches
  - Required for creating pull requests

To create a GitHub token:
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
2. Generate a new token
3. Select the `repo` scope
4. Copy the generated token

#### OpenAI API Key
You need an OpenAI API key with access to the GPT-3.5 model.

To get an OpenAI API key:
1. Go to [OpenAI's API Keys page](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the generated key

## Usage

1. Navigate to a GitHub PR creation page
2. Click the extension icon
3. Click "Generate PR Summary"
4. The title and description will be automatically filled with AI-generated content

## Security

- All API keys are stored securely in Chrome's sync storage
- Keys are never sent to any servers except their respective APIs
- GitHub token is only used to fetch repository data
- OpenAI key is only used to generate summaries

## Contributing

We welcome contributions! Here's how you can help improve this project:

### Development Setup

1. Fork the repository by clicking the 'Fork' button on GitHub

2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/github-pr-summary.git
   cd github-pr-summary
   ```

3. Add the original repository as a remote to keep your fork up to date:
   ```bash
   git remote add upstream https://github.com/original-owner/github-pr-summary.git
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Create a new branch for your changes (see Pull Request Process below)

### Continuous Integration

This project uses GitHub Actions for CI/CD. The following checks run on all PRs:

- **Linting**: Ensures code style consistency
- **Testing**: Runs the test suite and reports coverage
- **Security Scans**: 
  - CodeQL analysis for code security
  - npm audit for dependency vulnerabilities
  - Snyk security scanning
- **Dependency Review**: Checks for security issues in dependency changes
- **Bundle Size**: Monitors changes in bundle size

Required repository secrets for CI:
- `CODECOV_TOKEN`: For uploading test coverage reports
- `SNYK_TOKEN`: For running Snyk security scans

All checks must pass before a PR can be merged.

### Testing

The project uses Jest for testing. To run the test suite:

```bash
# Run tests once
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Code Quality

We use ESLint to maintain code quality. To run the linter:

```bash
# Check for linting issues
npm run lint

# Fix automatically fixable issues
npm run lint:fix
```

### Code Style Guidelines

- Use consistent indentation (2 spaces)
- Follow JavaScript best practices
- Add comments for complex logic
- Keep functions focused and single-purpose
- Use meaningful variable and function names
- All new code should have associated tests
- Maintain or improve code coverage
- Follow existing patterns in the codebase

### Pull Request Process

1. Ensure your fork is up to date:
   ```bash
   git fetch upstream
   git checkout master
   git merge upstream/master
   ```

2. Create a new branch for your feature:
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. Make your changes and ensure:
   - All tests pass (`npm test`)
   - Code follows style guidelines (`npm run lint`)
   - New features have tests
   - Documentation is updated if needed

4. Commit your changes using clear commit messages:
   ```bash
   git commit -m 'Add: some amazing feature'
   ```
   
   Prefix your commit messages with one of:
   - `Add:` for new features
   - `Fix:` for bug fixes
   - `Update:` for non-breaking changes
   - `Breaking:` for breaking changes
   - `Docs:` for documentation changes
   - `Test:` for test-related changes

5. Push to your fork:
   ```bash
   git push origin feature/amazing-feature
   ```

6. Open a Pull Request with:
   - Clear title and description
   - Reference any related issues
   - List notable changes
   - Mention any breaking changes
   - Include screenshots for UI changes

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged
4. Your contribution will be added to the changelog

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for providing the GPT-3.5 model
- GitHub for their comprehensive API
- All contributors who help improve this extension 
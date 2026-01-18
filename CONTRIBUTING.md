# Contributing to AutoPromo.video

First off, thank you for considering contributing to AutoPromo.video! 🎉

It's people like you that make AutoPromo.video such a great tool. We welcome contributions from everyone, whether it's a bug report, feature suggestion, documentation improvement, or code contribution.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Found a Bug?

- **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/Ansarii/autopromo-video/issues)
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/Ansarii/autopromo-video/issues/new/choose). Use the bug report template and include:
  - A clear, descriptive title
  - Steps to reproduce the issue
  - Expected behavior vs actual behavior
  - Your environment (OS, Node version, etc.)
  - Screenshots or error logs if applicable

### Want to Suggest a Feature?

- First, check if there's already an open feature request
- If not, [create a new feature request](https://github.com/Ansarii/autopromo-video/issues/new/choose) using our template
- Clearly describe the feature and why it would be valuable
- Include examples of how it would work

## Development Setup

### Prerequisites

- Node.js 20 or higher
- FFmpeg installed
- Redis (local or Upstash)
- Git

### Local Development

1. **Fork the repository** on GitHub

2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/autopromo-video.git
   cd autopromo-video
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/Ansarii/autopromo-video.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your test credentials
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```

7. **Test your changes**:
   ```bash
   npm test
   ```

## How to Contribute

### Working on Issues

1. **Find an issue** you'd like to work on or create one
2. **Comment on the issue** saying you'd like to work on it
3. **Wait for approval** from a maintainer (for larger changes)
4. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Making Changes

1. **Make your changes** in your feature branch
2. **Write clear commit messages**:
   ```bash
   git commit -m "feat: add video quality selector"
   git commit -m "fix: resolve puppeteer timeout issue"
   git commit -m "docs: update API documentation"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Build process or auxiliary tool changes

3. **Keep commits focused** - One logical change per commit
4. **Write tests** for new features or bug fixes
5. **Update documentation** if needed

## Pull Request Process

1. **Update your fork** with the latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Open a Pull Request** on GitHub:
   - Use a clear, descriptive title
   - Fill out the PR template completely
   - Link related issues (e.g., "Fixes #123")
   - Add screenshots/GIFs for UI changes

4. **Respond to feedback** from reviewers:
   - Make requested changes
   - Push additional commits to the same branch
   - Re-request review when ready

5. **Squash commits** if requested by maintainers

6. **Celebrate!** 🎉 Your contribution will be merged

## Style Guidelines

### JavaScript Code Style

- Use ES6+ features where appropriate
- Follow existing code formatting (we may add ESLint/Prettier in the future)
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Example:
```javascript
// Good
async function generateVideo(jobOptions) {
  const { url, format, duration } = jobOptions;
  // Implementation
}

// Avoid
async function doIt(opts) {
  // Implementation
}
```

### File Organization

- Place new features in appropriate directories
- Keep related code together
- Update imports/exports as needed

### Documentation Style

- Use clear, concise language
- Include code examples
- Update README.md for user-facing changes
- Document all API endpoints and parameters

## Type of Contributions We Need

### Code
- Bug fixes
- New features
- Performance improvements
- Test coverage improvements

### Documentation
- README improvements
- Code comments
- API documentation
- Tutorial content
- Translations

### Design
- UI/UX improvements
- Logo/branding assets
- Example videos/GIFs

### Community
- Answer questions in Discussions
- Help triage issues
- Review pull requests
- Spread the word!

## Development Tips

- **Test locally** before submitting PR
- **Keep PRs focused** - One feature/fix per PR
- **Think about edge cases** - What could break?
- **Consider performance** - Large videos, slow networks, etc.
- **Mobile-first** - Ensure UI works on all screen sizes

## Questions?

Don't hesitate to ask questions:
- Open a [GitHub Discussion](https://github.com/Ansarii/autopromo-video/discussions)
- Comment on the relevant issue
- Ask maintainers for clarification

## Recognition

Contributors will be:
- Listed in our README (coming soon)
- Mentioned in release notes
- Credited in the project

---

**Thank you for contributing to AutoPromo.video!** ❤️

Every contribution, no matter how small, makes a difference.

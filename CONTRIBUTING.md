# Contributing to BuildMate Studio

Welcome to BuildMate Studio! This guide will help you contribute effectively to our AI-powered app builder platform.

## 🏗️ Development Philosophy

BuildMate Studio follows a **phase-gated development methodology** with 12 distinct phases, each building upon the previous. Every change must be secure, tested, and production-ready.

### Phase-Based Development
1. **Phase 1**: Repository & Infrastructure Audit ✅
2. **Phase 2**: Supabase Baseplate Implementation ✅
3. **Phase 3**: Edge Function Secret Broker ✅
4. **Phase 4**: GitHub 2-Way Sync + CI 🔄 (Current)
5. **Phase 5**: Replit Deployments
6. **Phase 6**: PWA Hardening
7. **Phase 7**: Mobile Capabilities
8. **Phase 8**: Store Readiness Wizard
9. **Phase 9**: Agentic Workflow Planning
10. **Phase 10**: Templates & Data-First Starters
11. **Phase 11**: Observability & SLOs
12. **Phase 12**: Enterprise Features

## 🛠️ Development Setup

### Prerequisites
- Node.js 20+
- Git
- GitHub account with appropriate permissions

### Local Development
```bash
# Clone the repository
git clone <repository-url>
cd BuildMate-Studio

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your environment variables

# Start development server
npm run dev

# Open http://localhost:5000
```

### Database Setup
```bash
# Push database schema
npm run db:push

# Optional: Open database studio
npm run db:studio
```

## 📝 Commit Guidelines

We use **Conventional Commits** for consistent commit messages and automated changelog generation.

### Commit Format
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/modifications
- `chore`: Build process changes
- `ci`: CI/CD changes
- `phase`: Phase-specific changes

### Scopes
- `core`: Core application logic
- `ui`: User interface components
- `api`: API-related changes
- `auth`: Authentication/authorization
- `db`: Database changes
- `ci`: CI/CD pipeline
- `deployment`: Deployment configuration
- `phase-X`: Specific phase (e.g., `phase-4`)

### Examples
```bash
# Good commits
feat(ui): Add dark mode toggle to header
fix(api): Resolve authentication timeout issue
docs(phase-4): Update CI/CD setup instructions
refactor(core): Extract utility functions to shared module

# Bad commits
fix: stuff
update readme
working on feature
```

## 🔀 Branching Strategy

### Branch Types
- `main`: Production-ready code
- `agent/phase-X-*`: Phase-specific feature branches
- `hotfix/*`: Critical production fixes
- `docs/*`: Documentation updates

### Workflow
1. **Create Feature Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b agent/phase-4-ci-pipeline
   ```

2. **Make Changes**
   - Follow coding standards
   - Write tests for new features
   - Update documentation

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(ci): Add automated testing pipeline"
   ```

4. **Push and Create PR**
   ```bash
   git push origin agent/phase-4-ci-pipeline
   # Create PR via GitHub interface
   ```

## 🧪 Testing Standards

### Test Requirements
- **Unit Tests**: All new utility functions
- **Integration Tests**: API endpoints
- **E2E Tests**: Critical user flows
- **Security Tests**: Authentication flows

### Running Tests
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🔒 Security Guidelines

### Critical Security Rules
1. **No Secrets in Code**: Use Supabase secrets or environment variables
2. **RLS First**: All database tables must have Row Level Security
3. **CORS Configured**: Proper origin allowlisting for all APIs
4. **JWT Validation**: All API endpoints must validate authentication
5. **Input Validation**: Use Zod schemas for all user inputs

### Security Checklist
- [ ] No API keys in source code
- [ ] RLS policies on new database tables
- [ ] CORS headers configured properly
- [ ] Authentication required for protected routes
- [ ] Input validation with Zod schemas
- [ ] No SQL injection vulnerabilities
- [ ] Secrets managed through Supabase Edge Functions

## 📋 Pull Request Process

### PR Requirements
1. **All CI checks pass**
2. **Security review completed**
3. **Tests written and passing**
4. **Documentation updated**
5. **Breaking changes documented**

### PR Template
Use our PR template which includes:
- Phase reference
- Security checklist
- Testing confirmation
- Compatibility verification
- Rollback plan

### Review Process
1. **Automated Checks**: CI pipeline must pass
2. **Security Review**: Security-focused code review
3. **Manual Testing**: Feature verification
4. **Documentation**: Ensure docs are updated
5. **Approval**: At least one maintainer approval

## 🚀 Deployment Process

### Staging Deployment
- Automatic on PR creation
- Full feature testing environment
- Security validation

### Production Deployment
- Manual approval required
- Automated via GitHub Actions
- Rollback procedures available

### Zero-Downtime Requirements
- All deployments must be reversible
- Database migrations must be backwards compatible
- Feature flags for major changes

## 📚 Documentation Standards

### Required Documentation
- **README**: Setup and basic usage
- **API Documentation**: All endpoints
- **Architecture Decisions**: Major technical choices
- **Phase Documentation**: Per-phase implementation details
- **Security Documentation**: Security measures and policies

### Documentation Format
- Use Markdown for all documentation
- Include code examples
- Provide setup instructions
- Document environment variables
- Include troubleshooting guides

## 🐛 Bug Reports

### Bug Report Requirements
1. **Clear reproduction steps**
2. **Expected vs actual behavior**
3. **Environment details**
4. **Console logs/screenshots**
5. **Severity assessment**

### Priority Levels
- **Critical**: Security issues, data loss
- **High**: Core features broken
- **Medium**: Functionality impaired
- **Low**: Cosmetic issues

## ✨ Feature Requests

### Feature Request Process
1. **Check existing issues** for duplicates
2. **Use feature request template**
3. **Provide use case and motivation**
4. **Consider which phase it belongs to**
5. **Await triage and prioritization**

## 🤝 Code Review Guidelines

### Review Checklist
- [ ] Code follows project patterns
- [ ] No security vulnerabilities
- [ ] Tests are comprehensive
- [ ] Documentation is updated
- [ ] Performance impact considered
- [ ] Accessibility maintained
- [ ] Breaking changes documented

### Review Focus Areas
1. **Security**: Always the top priority
2. **Performance**: No significant degradation
3. **Maintainability**: Clean, readable code
4. **Testing**: Adequate test coverage
5. **Documentation**: Clear and complete

## 📞 Getting Help

### Resources
- **Documentation**: Check `/docs` directory
- **Issues**: Search existing GitHub issues
- **Discussions**: Use GitHub Discussions for questions

### Contact
- **Security Issues**: Create private security advisory
- **General Questions**: Open a discussion
- **Bug Reports**: Use bug report template

## 🎯 Quality Standards

### Definition of Done
- [ ] Feature implemented and working
- [ ] Tests written and passing
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Performance impact assessed
- [ ] Accessibility verified
- [ ] Cross-browser compatibility confirmed

### Code Quality
- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with strict rules
- **Formatting**: Consistent code style
- **Architecture**: Follow established patterns
- **Performance**: Optimize for user experience

---

Thank you for contributing to BuildMate Studio! Together, we're building the future of AI-powered application development.
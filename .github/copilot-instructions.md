# GitHub Copilot Instructions for CodeMate Studio

## Repository Overview

**CodeMate Studio** (also known as CodeVibe) is a full-stack web-based IDE that enables users to create, edit, and manage projects with AI-powered code generation capabilities. The application provides a complete development environment with features including a Monaco-based code editor, real-time preview, GitHub integration, database schema management, and an AI chat assistant for code generation and project assistance.

**Repository Purpose**: Building an AI-powered app builder platform that empowers developers to create full-stack applications with intelligent assistance and automation.

## Tech Stack & Frameworks

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Library**: shadcn/ui components built on Radix UI
- **Styling**: Tailwind CSS v3 with CSS custom properties for theming
- **Code Editor**: Monaco Editor for syntax highlighting and code editing
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js 20+ with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM for type-safe database interactions
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **WebSocket**: Custom WebSocket server for real-time collaboration
- **Validation**: Zod for runtime type validation and schema parsing

### AI & External Services
- **AI Provider**: OpenAI (GPT-5) integration for code generation
- **Version Control**: GitHub API via Octokit
- **Deployment**: Replit platform with autoscale deployment
- **Database**: Supabase optional integration for schema management

## Development Philosophy

### Phase-Gated Development Methodology

CodeMate Studio follows a **12-phase gated development approach**. Each phase builds upon the previous and must be complete before moving forward.

**Current Phases**:
1. ✅ Phase 1: Repository & Infrastructure Audit
2. ✅ Phase 2: Supabase Baseplate Implementation
3. ✅ Phase 3: Edge Function Secret Broker
4. ✅ Phase 4: GitHub 2-Way Sync + CI (Current)
5. Phase 5: Replit Deployments
6. Phase 6: PWA Hardening
7. Phase 7: Mobile Capabilities
8. Phase 8: Store Readiness Wizard
9. Phase 9: Agentic Workflow Planning
10. Phase 10: Templates & Data-First Starters
11. Phase 11: Observability & SLOs
12. Phase 12: Enterprise Features

**Key Principles**:
- Every change must be secure, tested, and production-ready
- Phase isolation via branch-based development
- Security-first approach in all implementations
- Comprehensive testing before phase completion

## Coding Standards & Best Practices

### TypeScript Configuration
- **Strict Mode**: Always enabled (`strict: true`)
- **Target**: ES2020 with ESNext modules
- **JSX**: Preserve mode for React
- **Path Aliases**: 
  - `@/*` for client source files
  - `@shared/*` for shared code

### Code Style Guidelines

1. **Type Safety**
   - Use explicit types, avoid `any`
   - Leverage Drizzle ORM types for database operations
   - Use Zod schemas for validation and type inference
   - Export types from shared directory for consistency

2. **Component Structure**
   - Functional components with TypeScript interfaces
   - Use hooks for state management (useState, useEffect, custom hooks)
   - Separate concerns: UI components, logic hooks, API calls
   - Leverage shadcn/ui and Radix UI for accessible components

3. **File Organization**
   - `client/src/` - Frontend React application
   - `server/` - Express.js backend
   - `shared/` - Shared types and schemas
   - `docs/` - Documentation and phase details
   - Keep related files close together

4. **Naming Conventions**
   - **Components**: PascalCase (e.g., `UserProfile.tsx`)
   - **Files**: kebab-case for utilities (e.g., `api-client.ts`)
   - **Functions**: camelCase (e.g., `fetchUserData`)
   - **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
   - **Types/Interfaces**: PascalCase (e.g., `UserData`, `ApiResponse`)

5. **Import Order**
   - External dependencies first
   - Internal modules/components
   - Relative imports
   - Styles last

### Security Guidelines (Critical)

**Security is the TOP priority**. Follow these rules without exception:

1. **No Secrets in Code**: Use environment variables or Supabase secrets
2. **RLS First**: All database tables must have Row Level Security policies
3. **CORS Configured**: Proper origin allowlisting for all APIs
4. **JWT Validation**: All API endpoints must validate authentication
5. **Input Validation**: Use Zod schemas for all user inputs
6. **No SQL Injection**: Use parameterized queries via Drizzle ORM
7. **Secrets Management**: Use Supabase Edge Functions for sensitive operations

**Security Checklist** (for every code change):
- [ ] No API keys in source code
- [ ] RLS policies on new database tables
- [ ] CORS headers configured properly
- [ ] Authentication required for protected routes
- [ ] Input validation with Zod schemas
- [ ] No SQL injection vulnerabilities
- [ ] Secrets managed through proper channels

## Commit Guidelines

### Conventional Commits Format

We use **Conventional Commits** for consistent commit messages and automated changelog generation.

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Commit Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, no logic change)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Test additions or modifications
- `chore` - Build process or auxiliary tool changes
- `ci` - CI/CD changes
- `phase` - Phase-specific changes

### Commit Scopes
- `core` - Core application logic
- `ui` - User interface components
- `api` - API-related changes
- `auth` - Authentication/authorization
- `db` - Database changes
- `ci` - CI/CD pipeline
- `deployment` - Deployment configuration
- `docs` - Documentation
- `phase-X` - Specific phase (e.g., `phase-4`)

### Commit Examples
```bash
# Good commits
feat(ui): add dark mode toggle to header
fix(api): resolve authentication timeout issue
docs(phase-4): update ci/cd setup instructions
refactor(core): extract utility functions to shared module

# Bad commits (avoid these)
fix: stuff
update readme
working on feature
```

### Commit Rules
- Subject must be 10-100 characters
- Use lowercase for subject
- No period at the end of subject
- Start with imperative verb (add, fix, update, etc.)

## Branching Strategy

### Branch Types
- `main` - Production-ready code (protected)
- `agent/phase-X-*` - Phase-specific feature branches
- `hotfix/*` - Critical production fixes
- `docs/*` - Documentation updates

### Workflow
1. **Create Feature Branch** from `main`
   ```bash
   git checkout main
   git pull origin main
   git checkout -b agent/phase-4-feature-name
   ```

2. **Make Changes** following coding standards

3. **Commit Changes** using conventional commits
   ```bash
   git add .
   git commit -m "feat(scope): descriptive message"
   ```

4. **Push and Create PR**
   ```bash
   git push origin agent/phase-4-feature-name
   # Create PR via GitHub interface
   ```

## Testing Standards

### Test Categories
- **Unit Tests**: Individual functions and components
- **Integration Tests**: API endpoints and workflows
- **E2E Tests**: Critical user flows
- **Security Tests**: Authentication and authorization flows

### Testing Requirements
- Write tests for all new features
- Maintain or improve test coverage
- Tests must pass before merging
- Include edge cases and error scenarios

### Running Tests
```bash
# Unit tests
npm test

# E2E tests (when available)
npm run test:e2e

# Type checking
npm run check

# Full CI validation
npm run lint && npm run check && npm test && npm run build
```

## Build & Development

### Development Commands
```bash
# Install dependencies
npm install

# Start development server (http://localhost:5000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run check

# Database operations
npm run db:push
```

### Environment Variables
Required environment variables (use `.env` file locally):
- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `SESSION_SECRET` - Session encryption key
- `SUPABASE_URL` - Supabase project URL (optional)
- `SUPABASE_ANON_KEY` - Supabase anonymous key (optional)
- `OPENAI_API_KEY` - OpenAI API key for AI features (optional)
- `GITHUB_CLIENT_ID` - GitHub OAuth (optional)
- `GITHUB_CLIENT_SECRET` - GitHub OAuth (optional)

### Project Structure
```
/
├── .github/              # GitHub workflows, templates, and configs
├── client/               # Frontend React application
│   └── src/             # React components, pages, hooks
├── server/              # Express.js backend
├── shared/              # Shared types and schemas
├── docs/                # Phase documentation and guides
├── supabase/            # Supabase migrations and configs
├── migrations/          # Database migrations
├── scripts/             # Build and deployment scripts
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite build configuration
└── CONTRIBUTING.md      # Contribution guidelines
```

## Pull Request Process

### PR Requirements
1. **All CI checks pass** (lint, type-check, tests, build)
2. **Security review completed** using checklist
3. **Tests written and passing** for new functionality
4. **Documentation updated** (README, API docs, phase docs)
5. **Breaking changes documented** in PR description

### PR Template Checklist
- [ ] Phase reference included
- [ ] Security checklist completed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Rollback plan outlined
- [ ] Performance impact assessed

### Review Process
1. Automated checks via GitHub Actions
2. Security-focused code review
3. Manual feature verification
4. Documentation review
5. At least one maintainer approval required

## CI/CD Pipeline

### Continuous Integration (`.github/workflows/ci.yml`)
- Parallel quality gates (lint, type-check, security scan)
- Unit and integration testing
- Build verification
- E2E testing for critical flows
- Automated changelog generation

### Deployment
- **Staging**: Automatic on PR creation
- **Production**: Manual approval required via GitHub Actions
- **Platform**: Replit autoscale deployment
- **Zero-Downtime**: All deployments must be reversible

### Quality Gates
- Lint errors must be fixed
- Type checking must pass
- All tests must pass
- Build must succeed
- Security scans must pass

## Documentation Standards

### Required Documentation
- **README**: Setup instructions and basic usage
- **API Documentation**: All endpoints with examples
- **Architecture Decisions**: Major technical choices (in `/docs`)
- **Phase Documentation**: Per-phase implementation details
- **Security Documentation**: Security measures and policies

### Documentation Format
- Use Markdown for all documentation
- Include code examples with syntax highlighting
- Provide clear setup and troubleshooting instructions
- Document all environment variables
- Keep documentation up-to-date with code changes

## AI-Specific Guidelines

When generating code or suggestions, prioritize:

1. **Security**: Never suggest code that compromises security
2. **Type Safety**: Use TypeScript types extensively
3. **Performance**: Consider performance implications
4. **Accessibility**: Follow WCAG guidelines for UI components
5. **Maintainability**: Write clean, readable, well-documented code
6. **Testing**: Suggest test cases alongside feature code
7. **Consistency**: Follow existing patterns and conventions

## Common Patterns

### Database Queries (Drizzle ORM)
```typescript
// Use Drizzle ORM for type-safe queries
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';

// Query example
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});

// Insert example
await db.insert(users).values({
  email: 'user@example.com',
  name: 'User Name',
});
```

### API Routes (Express)
```typescript
// Use Zod for validation
import { z } from 'zod';
import { validateRequest } from './middleware';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

app.post('/api/users', validateRequest(CreateUserSchema), async (req, res) => {
  // Request is validated and typed
  const { email, name } = req.body;
  // ... implementation
});
```

### React Components
```typescript
// Use TypeScript interfaces for props
interface UserProfileProps {
  userId: string;
  showDetails?: boolean;
}

export function UserProfile({ userId, showDetails = false }: UserProfileProps) {
  // Use TanStack Query for data fetching
  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  if (isLoading) return <LoadingSpinner />;
  
  return <div>{/* Component UI */}</div>;
}
```

## Getting Help

### Resources
- **Documentation**: Check `/docs` directory for phase guides
- **CONTRIBUTING.md**: Comprehensive contribution guidelines
- **GitHub Issues**: Search existing issues before creating new ones
- **GitHub Discussions**: Ask questions and share ideas

### Support Channels
- **Security Issues**: Create private security advisory
- **Bug Reports**: Use bug report template with reproduction steps
- **Feature Requests**: Use feature request template with use case
- **General Questions**: Open a GitHub discussion

## Definition of Done

Before marking any task as complete:

- [ ] Feature implemented and working as expected
- [ ] Tests written and passing (unit, integration, E2E as needed)
- [ ] Security review completed with no vulnerabilities
- [ ] Documentation updated (code comments, API docs, guides)
- [ ] Performance impact assessed and optimized
- [ ] Accessibility verified (WCAG compliance)
- [ ] Cross-browser compatibility confirmed
- [ ] Type checking passes with no errors
- [ ] Linting passes with no errors
- [ ] CI/CD pipeline passes all checks
- [ ] Code review approved by maintainer

---

**Remember**: Security, quality, and user experience are paramount. When in doubt, prioritize these over speed of delivery.

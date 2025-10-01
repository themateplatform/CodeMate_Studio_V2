# Copilot Instructions for CodeMate Studio

This file provides instructions for GitHub Copilot when working with this repository.

## Project Overview

CodeMate Studio is an AI-powered app builder platform that enables developers to create full-stack applications with real-time collaboration, AI assistance, and integrated deployment workflows. The project follows a **phase-gated development methodology** with 12 distinct phases.

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** with custom theme
- **Radix UI** for accessible components
- **Wouter** for routing
- **TanStack Query** for data fetching
- **React Hook Form** + Zod for form validation
- **Monaco Editor** for code editing
- **Yjs** for real-time collaboration

### Backend
- **Node.js 20+** with Express
- **TypeScript** (ES2020, ESNext modules)
- **Drizzle ORM** with PostgreSQL
- **Supabase** for authentication and database
- **Passport** for session management
- **Express Session** with PostgreSQL store

### Development Tools
- **Husky** for git hooks
- **Commitlint** for conventional commits
- **Vitest** for testing
- **GitHub Actions** for CI/CD

## Phase-Gated Development Methodology

CodeMate Studio follows a strict phase-gated approach. Each phase must be completed and approved before moving to the next:

1. **Phase 1**: Repository & Infrastructure Audit ✅
2. **Phase 2**: Supabase Baseplate Implementation ✅
3. **Phase 3**: Edge Function Secret Broker ✅
4. **Phase 4**: GitHub 2-Way Sync + CI ✅ (Current)
5. **Phase 5**: Replit Deployments
6. **Phase 6**: PWA Hardening
7. **Phase 7**: Mobile Capabilities
8. **Phase 8**: Store Readiness Wizard
9. **Phase 9**: Agentic Workflow Planning
10. **Phase 10**: Templates & Data-First Starters
11. **Phase 11**: Observability & SLOs
12. **Phase 12**: Enterprise Features

### Branch Strategy
- `main`: Production-ready code
- `agent/phase-X-*`: Phase-specific feature branches
- `hotfix/*`: Critical production fixes
- `docs/*`: Documentation updates

## Coding Standards

### General Principles
1. **TypeScript First**: All code must be TypeScript with strict mode enabled
2. **Type Safety**: Avoid `any` types; use proper type definitions
3. **Modular Architecture**: Keep files focused and under 300 lines when possible
4. **DRY Principle**: Extract reusable logic into shared utilities
5. **Separation of Concerns**: Keep business logic, UI, and data layers separate

### File Structure
```
├── client/src/        # Frontend React application
│   ├── components/    # Reusable UI components
│   ├── pages/         # Route components
│   ├── hooks/         # Custom React hooks
│   └── lib/           # Utility functions
├── server/            # Backend Express application
│   ├── routes/        # API route handlers
│   ├── schemas/       # Zod validation schemas
│   └── templates/     # Template files
├── shared/            # Code shared between client and server
├── docs/              # Documentation
└── scripts/           # Build and deployment scripts
```

### Import Paths
- Use path aliases: `@/*` for client, `@shared/*` for shared code
- Organize imports: external dependencies first, then internal modules
- Use named exports over default exports when possible

### Code Style
- **Formatting**: Follow existing patterns in the codebase
- **Naming**:
  - React components: PascalCase (`MyComponent.tsx`)
  - Files: camelCase for utilities, PascalCase for components
  - Variables/functions: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Types/Interfaces: PascalCase
- **Comments**: Use JSDoc for functions, inline comments for complex logic only

## Commit Convention

We use **Conventional Commits** with strict enforcement via Husky and GitHub Actions.

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Test additions or modifications
- `chore`: Build process or auxiliary tool changes
- `ci`: CI/CD changes
- `build`: Build system changes
- `revert`: Revert previous commit
- `phase`: Phase-specific changes

### Scopes
- `core`: Core application logic
- `ui`: User interface components
- `api`: API-related changes
- `auth`: Authentication/authorization
- `db`: Database changes
- `ci`: CI/CD pipeline
- `deployment`: Deployment configuration
- `docs`: Documentation
- `phase-1` through `phase-12`: Phase-specific scopes

### Examples
```bash
feat(ui): Add dark mode toggle to header
fix(api): Resolve authentication timeout issue
docs(phase-4): Update CI/CD setup instructions
refactor(core): Extract utility functions to shared module
```

### Requirements
- Subject: 10-100 characters, lowercase, no period at end
- Body: Optional, explain what and why vs. how
- Footer: Optional, reference issues/PRs

## Security Guidelines

### Critical Security Rules
1. **No Secrets in Code**: NEVER commit API keys, tokens, or credentials
   - Use Supabase secrets or environment variables
   - Secrets must be managed through `.env` files (excluded from git)
   
2. **RLS First**: All database tables MUST have Row Level Security policies
   - Define RLS policies in migration files
   - Test RLS policies before deploying
   
3. **CORS Configured**: Proper origin allowlisting for all APIs
   - Configure CORS headers in Express middleware
   - Never use wildcard origins in production
   
4. **JWT Validation**: All API endpoints must validate authentication
   - Use Passport middleware for protected routes
   - Validate tokens on every authenticated request
   
5. **Input Validation**: Use Zod schemas for all user inputs
   - Define schemas in `server/schemas/`
   - Validate before processing or storing data

### Security Checklist for PRs
- [ ] No API keys in source code
- [ ] RLS policies on new database tables
- [ ] CORS headers configured properly
- [ ] Authentication required for protected routes
- [ ] Input validation with Zod schemas
- [ ] No SQL injection vulnerabilities
- [ ] Secrets managed through Supabase Edge Functions

## Testing Standards

### Test Requirements
- **Unit Tests**: Required for all utility functions and business logic
- **Integration Tests**: Required for API endpoints
- **E2E Tests**: Required for critical user flows
- **Security Tests**: Required for authentication flows

### Running Tests
```bash
npm test              # Run all tests
npm run test:e2e      # E2E tests
npm run check         # TypeScript type checking
```

### Test Structure
- Place tests next to the code they test
- Use descriptive test names: `describe('Feature', () => { it('should do X when Y', ...) })`
- Use test fixtures and mocks to isolate units
- Aim for 80%+ code coverage on new features

## Database and Migrations

### Drizzle ORM
- Define schemas in `server/db.ts` or separate schema files
- Use Drizzle's type-safe query builder
- Export typed schemas for use in validation

### Migrations
- Generate migrations: `npm run db:push`
- Always include both up and down migrations
- Test migrations on local database before committing
- Include RLS policies in database migrations

### Supabase Integration
- Use Supabase client for authentication
- Edge Functions for secure API operations
- Real-time subscriptions for live data
- Storage for file uploads

## API Development

### RESTful Conventions
- Use HTTP methods correctly (GET, POST, PUT, DELETE)
- Return appropriate status codes
- Use consistent response formats
- Include error messages in responses

### Request/Response Format
```typescript
// Success response
{ success: true, data: {...} }

// Error response
{ success: false, error: "Error message", code: "ERROR_CODE" }
```

### Authentication
- All authenticated routes use Passport middleware
- Session-based authentication with PostgreSQL store
- JWT tokens for stateless operations
- Implement proper logout and session cleanup

## React Components

### Component Structure
```typescript
import React from 'react';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  // Hooks at the top
  // Event handlers
  // Render logic
  
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Best Practices
- Keep components small and focused
- Use composition over inheritance
- Extract complex logic into custom hooks
- Use React.memo for expensive renders
- Prefer controlled components for forms
- Use Radix UI for accessible primitives

### State Management
- Local state: `useState` for component-specific state
- Server state: TanStack Query for API data
- Form state: React Hook Form + Zod
- Global state: Context API sparingly

## AI and Real-Time Features

### Monaco Editor
- Use for code editing interface
- Configure language support and themes
- Implement code completion and validation

### Yjs Collaboration
- Real-time document synchronization
- Conflict-free replicated data types (CRDTs)
- WebSocket connection for live updates
- Handle connection state and offline scenarios

### OpenAI Integration
- Use for AI-assisted code generation
- Implement streaming responses
- Handle rate limits and errors gracefully
- Log AI interactions for debugging

## Documentation

### Code Documentation
- Use JSDoc for public APIs and complex functions
- Keep README files updated
- Document breaking changes in CHANGELOG
- Add examples for complex features

### Phase Documentation
- Each phase has a `docs/PHASE-X-*.md` file
- Document architecture decisions
- Include implementation details
- List deliverables and acceptance criteria

## CI/CD Pipeline

### GitHub Actions Workflows
- **CI Pipeline**: Runs on all pushes and PRs
  - Parallel quality gates (lint, type-check, security scan)
  - Unit and integration tests
  - Build verification
  - E2E tests for critical flows
  
- **Release Pipeline**: Automated releases
  - Semantic versioning
  - Automated release notes
  - GitHub releases creation

### Quality Gates
All PRs must pass:
1. ✅ TypeScript type checking
2. ✅ Linting (no errors)
3. ✅ Unit tests (passing)
4. ✅ Build succeeds
5. ✅ Security audit (no high-severity vulnerabilities)
6. ✅ Conventional commit format

## Pull Request Process

### PR Requirements
1. **All CI checks pass**
2. **Security review completed** (use PR template checklist)
3. **Tests written and passing**
4. **Documentation updated** (if applicable)
5. **Breaking changes documented**
6. **Phase reference included** (which phase this belongs to)

### PR Template
Use the provided PR template (`.github/PULL_REQUEST_TEMPLATE.md`) which includes:
- Phase reference and context
- Security validation checklist
- Testing confirmation
- Compatibility verification
- Rollback plan

### Review Guidelines
- Code review required before merge
- Address all review comments
- Squash commits when appropriate
- Update branch with main before merging

## Common Patterns

### Error Handling
```typescript
try {
  // Operation
} catch (error) {
  console.error('Context about what failed:', error);
  // Return user-friendly error
  return { success: false, error: 'User-friendly message' };
}
```

### Async Operations
- Always handle promise rejections
- Use try/catch with async/await
- Provide loading states in UI
- Handle timeout scenarios

### Environment Variables
```typescript
// Check required variables at startup
const requiredEnvVars = ['DATABASE_URL', 'SUPABASE_URL'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
```

## Common Commands

```bash
# Development
npm run dev              # Start development server (port 5000)
npm run build            # Build for production
npm run build:dev        # Build in development mode
npm start                # Start production server

# Type Checking & Linting
npm run check            # TypeScript type check

# Database
npm run db:push          # Push schema changes to database

# Testing
npm test                 # Run all tests

# Git Hooks
# Husky automatically runs:
# - commitlint on commit messages
# - type checking before push
```

## Troubleshooting

### Common Issues
1. **Module resolution errors**: Check `tsconfig.json` paths configuration
2. **Database connection**: Verify `.env` has correct `DATABASE_URL`
3. **Build failures**: Clear `node_modules` and reinstall dependencies
4. **Type errors**: Run `npm run check` to see all TypeScript errors
5. **Port conflicts**: Default port is 5000, configure via environment variable

### Getting Help
- Check existing documentation in `/docs`
- Review similar implementations in the codebase
- Check Phase-specific documentation for context
- Refer to CONTRIBUTING.md for contribution guidelines

## Performance Considerations

- Use React.memo and useMemo for expensive computations
- Implement pagination for large data sets
- Use lazy loading for routes and components
- Optimize database queries with proper indexes
- Use connection pooling for database
- Implement caching where appropriate

## Accessibility

- Use Radix UI primitives for accessible components
- Include ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers
- Maintain proper heading hierarchy
- Provide focus indicators

## What Copilot Should Focus On

When generating code or suggestions for this repository:

1. **Follow Phase-Gated Approach**: Respect the current phase boundaries
2. **Security First**: Always validate inputs, never expose secrets
3. **Type Safety**: Generate fully-typed TypeScript code
4. **Conventional Commits**: Format commit messages correctly
5. **Test Coverage**: Include tests for new features
6. **Documentation**: Add JSDoc and update relevant docs
7. **Consistent Patterns**: Match existing code patterns and style
8. **Performance**: Consider performance implications
9. **Accessibility**: Ensure UI components are accessible
10. **Error Handling**: Include proper error handling and user feedback

## What to Avoid

- ❌ Using `any` type without justification
- ❌ Committing secrets or API keys
- ❌ Breaking changes without documentation
- ❌ Bypassing authentication or validation
- ❌ Direct database queries without ORM
- ❌ Inconsistent code formatting
- ❌ Missing error handling
- ❌ Skipping tests for new features
- ❌ Ignoring RLS requirements
- ❌ Hardcoded configuration values

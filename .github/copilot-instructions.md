# BuildMate Studio - AI Coding Agent Instructions

## Platform Vision & Mission

BuildMate Studio is a **user-facing, freemium no-code product** within the Mate Platform ecosystem that converts ideas into production-ready web applications—either from scratch (greenfield) OR by completing existing GitHub repositories.

**Core Purpose**: Make software creation accessible by offering a conversational intake → scope validation → visual concepts → pricing → production build workflow. Users pay based on project complexity, not hourly rates.

**Mission**: Non-technical founders, developers, and agencies can describe their vision and receive fully-functional, on-brand, production-ready code in real TypeScript + React + Tailwind (not proprietary formats), deployable to any hosting platform.

## Architecture Overview

BuildMate Studio is a full-stack Express + React + Drizzle ORM application with two distinct user journeys: **Greenfield (new projects)** and **Completion (existing GitHub repos)**.

### High-Level Flow
```
User Input (Intake) → Research & Scope → Visual Concepts → Pricing Gate → 
  Payment → Production Build → Live Deployment
```

**Service Boundaries:**
- `client/src/` - React SPA: intake wizard → scope review → mood board selector → payment → build monitor
- `server/routes/` - Express API: `/intake`, `/scope`, `/concepts`, `/pricing`, `/build`, `/payment`
- `server/generator/` - Code generation pipeline (prompt parsing, template matching, file generation, validation)
- `server/github/` - GitHub integration (repo cloning, PR creation, analysis for completion projects)
- `shared/schema.ts` - Drizzle ORM schema (users, builds, brand kits, concepts, deployments)
- `server/db.ts` - Database client (Neon PostgreSQL via Drizzle)

**Data Flow:**
1. **Intake**: Browser collects user answers (goals, pages, integrations, budget, brand preference)
2. **Research**: If completion project, analyze existing GitHub repo; if greenfield, research market/industry
3. **Scope**: Generate scope document based on research + user intake
4. **Concepts**: Generate 3 mood boards (not mockups—vibes, colors, fonts, imagery inspirations)
5. **Pricing**: Calculate complexity score → show price breakdown → Stripe checkout
6. **Build**: If greenfield, scaffold new project; if completion, PR to existing repo with new features
7. **Deploy**: Create preview + production deployment to user's chosen platform (Vercel, Netlify, etc.)

### Key Data Model Additions

```typescript
// builds table: tracks each project through the funnel
id | projectName | projectType | existingRepoUrl | intakeAnswers | 
scopeDocUrl | conceptBoards | selectedConceptId | complexityScore | 
estimatedPrice | paidAt | repoUrl | previewUrl | status | brandKitId

// brandKits table: reusable branding for multi-project customers
id | userId | name | colors | typography | logoUrl | guidelines

// buildBrandKits junction: links builds to brand kits for consistency
buildId | brandKitId
```

## End-State Outcomes

- **Generated Applications**: Real TypeScript + React + Tailwind code that runs in any hosting environment
- **Free Tier**: Intake + scope + 3 concept mood boards (no payment required)
- **Freemium Conversion**: Pricing gate after concept selection drives paid builds ($300–$7,500 range)
- **Greenfield & Completion**: Support both new projects and finishing existing GitHub repos
- **Brand Kit Reusability**: Customers building multiple sites can lock in colors/fonts for consistency
- **Multi-Platform Deployment**: Auto-setup for Vercel, Netlify, Cloudflare, AWS Amplify, or self-hosted
- **Observability**: Build KPIs tracked—conversion rate, avg project value, completion vs greenfield ratio, time-to-live

## Freemium Funnel

### Stage 1: Intake Interview (FREE)
- Project type: "Greenfield or completion?"
- Goals, audience, revenue model, positioning
- Integrations needed (auth, payments, CMS, etc.)
- Brand preference: DesignMate tokens, custom kit, or create new
- Existing GitHub repo URL (if completion)

### Stage 2: Scope Document (FREE)
- If greenfield: research-based scope (pages, features, data model)
- If completion: analyze existing repo → detect tech stack, incomplete features, TODOs → suggest completion roadmap
- User approves or requests revisions

### Stage 3: Concept/Mood Boards (FREE)
- 3 distinct visual directions (vibes, colors, fonts, inspiration imagery)
- NOT full page mockups—just atmospheric direction
- Can be constrained by user's brand kit (if they have one)

### Stage 4: Pricing & Payment (CONVERSION GATE)
- Calculate complexity score based on page count, integrations, custom features
- Show itemized price breakdown (base + pages + integrations + multiplier)
- Stripe checkout before build starts
- Typical range: $500 (simple landing) → $7,500 (complex SaaS)

### Stage 5: Production Build (PAID)
- **Greenfield**: Scaffold new React + TypeScript + Tailwind project, generate all pages/components
- **Completion**: Clone existing repo → create `buildmate-completion` branch → add missing features → create PR
- Apply selected mood board styling
- Integrate with Mate Platform services (SEO, analytics, copywriting)

### Stage 6: Deployment (PAID)
- User selects platform (Vercel, Netlify, etc.)
- Auto-create GitHub integration + deploy config
- Generate preview + production URLs

## Critical Developer Workflows

### Development Server
```bash
npm run dev  # Starts Express server on port 5000 with Vite HMR for client code
```
The dev server runs `server/index.ts` which registers routes, initializes Drizzle DB (if DATABASE_URL set), and sets up session middleware.

### Building for Production
```bash
npm run build      # Vite builds client to dist/public/, esbuild bundles server to dist/index.js
npm run build:dev  # Development build (no minification) - useful for debugging
npm start          # Runs production server from dist/index.js
```

### Database Setup & Schema Changes
```bash
npm run db:push    # Applies schema from shared/schema.ts to connected database (Drizzle Kit)
npm run db:gen-types  # Generates TypeScript types from Supabase schema (if using Supabase)
```

### Testing & Type Checking
```bash
npm run check           # TypeScript type checking (no emit)
npm run test           # Vitest unit tests (client + server coverage)
npm run test:e2e       # Playwright end-to-end tests
npm run test:coverage  # Unit tests with coverage report (v8 provider)
```

## Project-Specific Conventions

### Key Concepts for AI Agents

**Mood Boards vs. Mockups**
- NOT full-page mockups with exact layouts
- Visual direction: colors, fonts, imagery style, spacing philosophy
- 3 options let user pick aesthetic direction before committing to build
- Used to constrain and guide code generation (CSS variables, Tailwind themes)

**Completion Projects**
- User provides GitHub repo URL (greenfield OR existing)
- AI analyzes: tech stack, incomplete features (marked TODOs), missing infrastructure
- Build output: PR to original repo with completed features (not a fork)
- User reviews PR, merges when satisfied
- Preserves existing code/logic, adds missing pieces

**Greenfield Projects**
- Scaffold from scratch: React + TypeScript + Tailwind + Drizzle
- Generate all pages, components, API routes based on scope
- Apply mood board styling (colors, fonts, spacing)
- Ready to deploy to Vercel/Netlify/etc. immediately

**Brand Kits**
- Reusable color palettes, typography, logos, brand guidelines
- Agency customers build multiple sites with same branding
- When building second+ project: select existing kit → mood boards vary layout/imagery only, not brand elements
- Lock consistency across portfolio

### Authentication & Security
- **Session-based auth**: Express sessions stored in PostgreSQL (via `connect-pg-simple`), accessed as `req.session.user`
- **Dual auth paths**: Legacy Bearer token auth (Supabase JWT) in `/api/auth/user` + modern session-based routes
- **CSRF protection**: Middleware exists but is MVP-mode stub (see `csrfProtection` in `server/routes.ts` - marked for production impl)
- **Password hashing**: bcryptjs for registration/login flows
- **WebAuthn/Passkeys**: `passkeys` table schema ready for future zero-trust auth (see `shared/schema.ts`)
- **GitHub OAuth**: Connect user's GitHub account to enable completion project access

### API Route Patterns
All routes registered via `registerAuthRoutes()`, `registerProjectRoutes()`, etc. functions:
```typescript
// server/routes/auth.ts - Example pattern
app.post("/api/auth/register", csrfProtection, async (req: Request, res: Response) => {
  // 1. Validate input
  if (!username || !email || !password) {
    return res.status(400).json({ message: "..." });
  }
  // 2. Database operation via db (Drizzle)
  const user = await db.insert(users).values({...}).returning();
  // 3. Return consistent error/success format
  return res.status(201).json(user);
});
```
- **Error format**: Always `{ message: string }` for client-side consistency
- **HTTP status**: 400 (validation), 401 (auth), 403 (forbidden), 500 (server errors)
- **Session check**: Use `req.session.user?.id` before protected operations

### Frontend Patterns
- **Component location**: All UI components in `client/src/components/ui/` (shadcn/ui from Radix UI)
- **Page routing**: `client/src/pages/*.tsx` - uses wouter library (`<Link>`, `<Router>`, `useLocation()`)
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`
- **Data fetching**: TanStack Query `useQuery()` + `useMutation()` with `@/lib/queryClient` for shared config
- **API calls**: Use `apiRequest()` helper for typed fetch wrapper with CSRF token support
- **Toast notifications**: `useToast()` hook for user feedback (shadcn/ui toast)

### Database Schema & Operations
- **Schema definition**: `shared/schema.ts` - single source of truth for all tables
- **Database client**: `db` instance from `server/db.ts` (Drizzle + Neon PostgreSQL)
- **No-DB mode**: When `DATABASE_URL` missing, app runs with disabled db proxy (dev convenience)
- **Migrations**: Auto-applied from `migrations/` directory via Drizzle Kit
- **Zod validation**: Auto-generated insert schemas via `createInsertSchema()` from Drizzle tables
- **Filtering & queries**: Use Drizzle operators (`eq()`, `and()`, `or()`, `like()`) not raw SQL

## Code Generation Pipeline
The heart of BuildMate - orchestrates user intent → deployed app:
```typescript
// server/routes/generate.ts - POST /api/generate
// 1. Parse natural language prompt → intent (promptParser)
// 2. Match to template library (templateMatcher - uses confidence scoring)
// 3. Generate project files (fileGenerator - creates React/TS/Tailwind structure)
// 4. Validate output (buildValidator - checks accessibility, performance, security)
// 5. Assemble deliverable (projectAssembler - packages for deployment)
```
- **Template system**: `server/templates/` contains recipe metadata and boilerplate
- **Prompt parsing**: Extracts intent, component types, UI patterns from free-form text
- **Build validation**: Custom checks beyond TypeScript compilation (ESLint, accessibility audits)
- **Output**: Returns project summary + file manifests ready for download/deployment

### GitHub Integration for Completion Projects
```typescript
// server/github/ - Repo analysis and PR operations
// 1. Clone user's existing repo
// 2. Detect tech stack (Next.js, React, Svelte, etc.)
// 3. Scan for incomplete features (marked TODOs, empty files, stub implementations)
// 4. Create buildmate-completion branch
// 5. Implement missing features + apply brand/mood board styling
// 6. Create PR with detailed change summary back to original repo
// 7. User merges at their own pace
```

### Pricing Calculator
```typescript
// Base: $300 (completion) or $500 (greenfield)
// Per-page: +$50 each
// Integrations: auth +$200, payments +$300, CMS +$250, etc.
// Complexity multiplier: +30% (custom features), +20% (performance), +30% (compliance)
// Result: Simple sites $500–$1,500 | Mid-tier SaaS $2,500–$5,000 | Complex $5,000–$7,500
```

### Brand Kit System
- Users can create reusable brand kits (colors, fonts, logo, guidelines)
- When building multiple projects, select existing kit to lock styling consistency
- Mood boards respect brand kit constraints (vary layout/imagery, not colors/fonts)

## Integration Points

### Mate Ecosystem Services
- **DesignMate**: Token registry for theming, OR customer's custom brand kit
- **Copywriter Agent**: Generates marketing copy, headlines, CTAs, meta descriptions
- **Image Generator**: Creates mood board imagery and placeholder graphics
- **SEO Agent**: Generates meta tags, sitemap, schema markup for discovery
- **Pricing Engine**: Calculates project complexity → estimated cost
- **Payment Integration**: Stripe checkout for build payment gatekeeping

### External Services
- **Supabase**: JWT auth via Bearer token (`/api/auth/user` endpoint)
- **GitHub**: OAuth + Octokit for repo cloning, analysis, PR creation
- **Stripe**: Payment processing for build completion
- **Deployment Platforms**: Vercel, Netlify, Cloudflare, AWS Amplify auto-deployment config

### Real-time & Collaboration Features
- **WebSocket**: Upgraded connections in `server/index.ts` - authenticates via shared session middleware
- **Yjs**: CRDT-based collaborative editing (planned for team/agency scenarios)
- **PWA**: Service worker configuration + install prompts in `client/src/components/pwa/`

### Development Tools & Plugins
- **Vite**: Client dev server on port 8080 with HMR disabled overlay (Codespaces compatibility)
- **Drizzle Kit**: Schema migrations and type generation from `drizzle.config.ts`
- **Vitest**: Unit tests run in jsdom environment with coverage via v8
- **Playwright**: E2E tests in `e2e/` directory (see `playwright.config.ts`)
- **Replit plugins**: Cartographer (view component tree), dev banner (dev toggles)

## Governance & Quality Standards
- **Every change connected to intent**: Easy to review in context of stated goals
- **User data treated respectfully**: Session data in PostgreSQL, audit logs immutable
- **Dependencies visible**: Third-party licenses appropriate for intended use (see package.json for full stack)
- **Success metrics**: Short time to first release, test coverage (vitest + Playwright), observability (health checks)
- **Type safety**: Strict TypeScript config with `noEmit` checking in CI

## Common Patterns & Examples

### Adding a new API route:
```typescript
// server/routes.ts - Register your new route function
import { registerNewRoute } from "./routes/newFeature";
registerNewRoute(app, csrfProtection);

// server/routes/newFeature.ts - Implement the route
import type { Request, Response, Express, RequestHandler } from "express";
export function registerNewRoute(app: Express, csrfProtection: RequestHandler): void {
  app.post("/api/new-feature", csrfProtection, async (req: Request, res: Response) => {
    if (!req.session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Implementation with db.insert(), db.select(), etc.
  });
}
```

### Adding a database table:
```typescript
// shared/schema.ts
import { pgTable, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const newTable = pgTable("new_table", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Then run: npm run db:push
```

### Frontend API call with TanStack Query:
```typescript
// client/src/pages/MyComponent.tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

const { data: items } = useQuery({
  queryKey: ['/api/items'],
  queryFn: async () => {
    const res = await fetch('/api/items');
    return res.json();
  },
});

const createMutation = useMutation({
  mutationFn: async (item: any) => {
    return apiRequest('POST', '/api/items', item);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/items'] });
  }
});
```

### Using shadcn/ui components:
```tsx
// client/src/pages/MyPage.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function MyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Form</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="Enter text..." />
        <Button>Submit</Button>
      </CardContent>
    </Card>
  );
}
```

### Testing patterns:
```typescript
// client/src/pages/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders button', () => {
    render(<MyComponent />);
    expect(screen.getByRole('button')).toBeDefined();
  });
});
```

## Key File Locations
- **Routes registration**: `server/routes.ts` (imports all `registerXRoutes()` functions)
- **Core utilities**: `server/utils.ts` (shared server logic), `client/src/lib/` (client helpers)
- **Form validation**: Auto-generated Zod schemas from `createInsertSchema(tableName)`
- **Type exports**: All types from `shared/schema.ts` or `server/types/`
- **Generated templates**: `server/templates/` (recipe metadata and boilerplate)
- **Monitoring**: `server/health.ts` (request tracking, health endpoints)</content>
<parameter name="filePath">/workspaces/fertile-ground-base/.github/copilot-instructions.md
# Repository Audit: Prompt → Site & Automation Mode MVP

**Audit Date**: October 11, 2025  
**Target**: (A) Prompt → Site Pipeline MVP, (B) Automation Mode Loop MVP  
**Status**: Planning Phase - No Changes Made

---

## 1) Detected Stack

### Framework & Core Technologies
- **Frontend**: React 18.3.1 + TypeScript 5.6.3
- **Bundler**: Vite 5.4.20 with HMR
- **Routing**: Wouter 3.3.5 (lightweight React router)
- **Backend**: Express 4.21.2 with TypeScript
- **Database**: PostgreSQL via Drizzle ORM 0.39.1
- **Real-time**: WebSocket (ws 8.18.0) + Yjs 13.6.27 for collaborative editing
- **State Management**: TanStack Query 5.60.5
- **AI Integration**: OpenAI 5.23.1 (configured but not actively used in generation pipeline)

### UI & Styling
- **Component Library**: Radix UI primitives + shadcn/ui patterns
- **CSS Framework**: Tailwind CSS 3.4.17 + Tailwind Animate
- **Design Tokens**: Custom CSS variables (configured in index.css)
- **Icons**: Lucide React 0.453.0

### Testing & Quality
- **Test Runner**: Vitest 3.2.4 with jsdom/happy-dom
- **Test Libraries**: @testing-library/react 16.3.0, @testing-library/jest-dom 6.8.0
- **Coverage**: Vitest Coverage v8
- **Type Checking**: TypeScript strict mode
- **Linting**: Commitlint with conventional commits
- **E2E Testing**: ❌ **NOT CONFIGURED** (No Playwright/Cypress)

### Available Scripts
```json
{
  "dev": "NODE_ENV=development tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "build:dev": "vite build --mode development",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push"
}
```

**Missing Scripts**:
- ❌ `test` - No test script configured
- ❌ `test:e2e` - No E2E testing
- ❌ `lint` - No ESLint configured
- ❌ `format` - No Prettier configured

### Existing Routes & Components

**Pages** (`client/src/pages/`):
- `landing.tsx` - Marketing homepage
- `app-builder.tsx` - Multi-step app builder (intake → enhancement → research → brief → agents → implementation)
- `spec-editor.tsx` - Specification editor with tabs for purpose, journeys, data models, success criteria
- `ide.tsx` - Code editor with Monaco
- `projects-simplified.tsx` - Project management
- `templates.tsx` - Template browser
- `ai-assistant.tsx` - AI assistant interface
- `deploy.tsx`, `secrets.tsx`, `settings.tsx`, etc.

**Key Existing Infrastructure**:
- Spec system database schema already exists in `shared/schema.ts`
- `specs`, `specVersions`, `specRequirements`, `specUserJourneys`, `specDataModels`, `specSuccessCriteria` tables defined
- App builder UI with multi-step workflow partially implemented
- Spec editor UI with structured form inputs

---

## 2) Repository Summary

### High-Level File Tree
```
/workspaces/fertile-ground-base/
├── client/src/              # React frontend
│   ├── pages/               # Route components
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities (queryClient, supabase, pwa)
│   └── types/               # Frontend TypeScript types
├── server/                  # Express backend
│   ├── routes/              # API route handlers
│   ├── routes.ts            # Main route registration
│   ├── db.ts                # Database connection
│   ├── vite.ts              # Vite dev server integration
│   └── templates/           # Code generation templates
├── shared/                  # Shared between client/server
│   └── schema.ts            # Drizzle database schema (2364 lines)
├── migrations/              # Drizzle database migrations
├── docs/                    # Documentation
│   ├── END-STATE-IMPLEMENTATION-PLAN.md
│   ├── DEPLOYMENT-GUIDE.md
│   └── UPLIFT-PLAN.md
├── public/                  # Static assets (PWA manifests, service worker)
├── .github/                 # GitHub Actions, copilot instructions
└── package.json             # Dependencies & scripts
```

### Key Files We Will Build On

**Existing Foundation**:
1. `shared/schema.ts` (Lines 166-290) - Complete spec system schema
2. `client/src/pages/spec-editor.tsx` - Spec editor UI (552 lines)
3. `client/src/pages/app-builder.tsx` - App builder flow (514 lines)
4. `server/routes.ts` - API route registration
5. `server/db.ts` - Database connection setup
6. `vite.config.ts` - Build configuration with path aliases

**Critical Database Tables**:
- `specs` - Main specification documents
- `specUserJourneys` - User journey definitions
- `specDataModels` - Data model schemas
- `specRequirements` - Extracted requirements
- `projects` - Project metadata
- `ai_generations` - AI-generated code storage

---

## 3) Gaps vs Target

### (A) Gaps for "Prompt → Site" MVP

**MISSING: Code Generation Pipeline**
- ❌ No OpenAI integration for actual code generation (health check exists, but no generation logic)
- ❌ No template engine to convert specs → React components
- ❌ No file system generation (pages, components, routes)
- ❌ No build system for generated projects
- ❌ No deployment automation for generated sites

**MISSING: Prompt Processing**
- ❌ No natural language parser (prompt → structured spec)
- ❌ No keyword matching system (prompt → template selection)
- ❌ No validation of generated outputs
- ❌ No error recovery mechanisms

**MISSING: Site Generation**
- ❌ No component templates (button, form, card, page layouts)
- ❌ No route generation from specs
- ❌ No data model → API endpoint generation
- ❌ No styling/theming application
- ❌ No static site export functionality

**MISSING: CLI Interface**
- ❌ No CLI entry point (`generate:site` command)
- ❌ No command-line argument parsing
- ❌ No progress reporting during generation
- ❌ No output directory management

**PARTIALLY EXISTS**:
- ✅ Spec schema in database
- ✅ Spec editor UI
- ⚠️ App builder UI (multi-step but doesn't generate code)
- ⚠️ Template storage in database (schema exists, no actual templates)

### (B) Gaps for Automation Mode MVP

**MISSING: Automation Loop Components**
- ❌ No `automation/machine.ts` - State machine orchestration
- ❌ No `automation/planner.ts` - Plan generation from specs
- ❌ No `automation/executor.ts` - Plan execution engine
- ❌ No `automation/scorer.ts` - Quality scoring (tests, lint, a11y)
- ❌ No `automation/decider.ts` - Decision logic (continue/ask/finish)

**MISSING: Build Spec System**
- ❌ No `/specs/buildSpec.json` - Acceptance criteria definition
- ❌ No route manifest schema
- ❌ No performance gate definitions
- ❌ No accessibility gate definitions
- ❌ No test coverage requirements

**MISSING: Testing Infrastructure**
- ❌ No E2E tests (Playwright not configured)
- ❌ No integration tests for generation pipeline
- ❌ No acceptance test framework
- ❌ No visual regression testing
- ❌ No performance testing (Lighthouse CI)

**MISSING: Observability**
- ❌ No automation progress tracking
- ❌ No decision logging
- ❌ No score history
- ❌ No rollback mechanisms
- ❌ No UI panel to display automation state

**PARTIALLY EXISTS**:
- ✅ Database audit logs (table exists)
- ✅ WebSocket infrastructure for real-time updates
- ⚠️ Health check system (basic, needs extension)

---

## 4) Minimal Plan to Implement "Prompt → Site" MVP

### Architecture Overview
Simple rule-based system (no LLM initially):
1. **Prompt parser** → Extract keywords (e.g., "blog", "ecommerce", "dashboard")
2. **Template matcher** → Map keywords to predefined page recipes
3. **File generator** → Create React components from templates
4. **Project assembler** → Combine files into working Vite project
5. **Build validator** → Run tests and build checks

### Files to Add

#### Core Generation Engine
```
server/
├── generator/
│   ├── promptParser.ts          # Extract keywords from prompt
│   ├── templateMatcher.ts       # Map keywords → templates
│   ├── fileGenerator.ts         # Generate React component files
│   ├── projectAssembler.ts      # Assemble complete project structure
│   └── buildValidator.ts        # Validate generated output
├── templates/
│   ├── recipes/
│   │   ├── blog.recipe.ts       # Blog site recipe
│   │   ├── dashboard.recipe.ts  # Dashboard recipe
│   │   ├── landing.recipe.ts    # Landing page recipe
│   │   └── ecommerce.recipe.ts  # E-commerce recipe
│   └── components/
│       ├── page.template.ts     # Page component template
│       ├── layout.template.ts   # Layout template
│       ├── form.template.ts     # Form template
│       └── card.template.ts     # Card template
└── routes/
    └── generate.ts              # POST /api/generate endpoint
```

#### CLI Interface
```
scripts/
└── generate-site.ts             # CLI entry point
```

#### Configuration
```
specs/
└── templateMappings.json        # Keyword → recipe mappings
```

#### Tests
```
server/generator/__tests__/
├── promptParser.test.ts
├── templateMatcher.test.ts
├── fileGenerator.test.ts
└── integration.test.ts
```

### Files to Edit

#### 1. Add Generation Route
**File**: `server/routes.ts`
**Changes**: Register POST `/api/generate` endpoint

#### 2. Add CLI Script to package.json
**File**: `package.json`
**Changes**: Add `"generate:site": "tsx scripts/generate-site.ts"`

#### 3. Extend Schema for Generated Projects
**File**: `shared/schema.ts`
**Changes**: Add `generated_projects` table to track outputs

### Implementation Details

#### Template Matching Rules (No LLM)
```typescript
// specs/templateMappings.json
{
  "keywords": {
    "blog": ["blog", "article", "post", "content", "cms"],
    "dashboard": ["dashboard", "admin", "analytics", "metrics", "charts"],
    "landing": ["landing", "marketing", "homepage", "product page"],
    "ecommerce": ["shop", "store", "ecommerce", "cart", "checkout", "product"]
  },
  "recipes": {
    "blog": {
      "pages": ["home", "post", "about", "contact"],
      "components": ["PostCard", "PostList", "Hero", "Footer"],
      "routes": ["/", "/post/:id", "/about", "/contact"],
      "dataModels": ["Post", "Author", "Category"]
    },
    "dashboard": {
      "pages": ["dashboard", "analytics", "settings"],
      "components": ["StatCard", "Chart", "Table", "Sidebar"],
      "routes": ["/", "/analytics", "/settings"],
      "dataModels": ["Metric", "User", "Report"]
    }
  }
}
```

#### File Generation Flow
```typescript
// Pseudocode for generation pipeline
async function generateSite(prompt: string): Promise<GeneratedProject> {
  // 1. Parse prompt
  const keywords = parsePrompt(prompt);
  
  // 2. Match template
  const recipe = matchTemplate(keywords);
  
  // 3. Generate files
  const files = await generateFiles(recipe, {
    pages: recipe.pages.map(p => generatePage(p)),
    components: recipe.components.map(c => generateComponent(c)),
    routes: generateRoutes(recipe.routes),
    api: generateAPIEndpoints(recipe.dataModels)
  });
  
  // 4. Assemble project
  const project = await assembleProject(files);
  
  // 5. Validate
  const validation = await validateProject(project);
  
  // 6. Store in database
  return await saveGeneratedProject(project, validation);
}
```

### CLI Implementation
```bash
# Usage
npm run generate:site -- --prompt "I want a blog with posts and comments"

# With output directory
npm run generate:site -- --prompt "dashboard for analytics" --output ./generated/dashboard
```

### Acceptance Tests

#### Unit Tests (Vitest)
```typescript
// server/generator/__tests__/promptParser.test.ts
describe('promptParser', () => {
  it('extracts blog keywords', () => {
    const keywords = parsePrompt('I want a blog with posts');
    expect(keywords).toContain('blog');
    expect(keywords).toContain('post');
  });
});
```

#### Integration Tests
```typescript
// server/generator/__tests__/integration.test.ts
describe('Full generation pipeline', () => {
  it('generates working blog from prompt', async () => {
    const project = await generateSite('blog with posts and comments');
    
    // Verify structure
    expect(project.files).toHaveProperty('pages/home.tsx');
    expect(project.files).toHaveProperty('components/PostCard.tsx');
    
    // Verify build succeeds
    const buildResult = await buildProject(project);
    expect(buildResult.success).toBe(true);
  });
});
```

#### E2E Tests (Will need Playwright setup)
```typescript
// e2e/generation.spec.ts
test('generated blog is accessible', async ({ page }) => {
  // Generate and deploy test site
  const siteUrl = await generateAndDeploy('blog');
  
  // Visit site
  await page.goto(siteUrl);
  
  // Check accessibility
  await expect(page).toHaveNoViolations();
  
  // Check core functionality
  await expect(page.getByRole('heading', { name: /blog/i })).toBeVisible();
});
```

---

## 5) Minimal Plan to Implement Automation Mode MVP

### Architecture Overview
State machine loop: **Plan → Execute → Score → Decide** (repeat until acceptance met)

### Files to Add

#### Automation Core
```
server/
├── automation/
│   ├── machine.ts              # State machine orchestrator
│   ├── planner.ts              # Generate implementation plan
│   ├── executor.ts             # Execute plan (apply diffs)
│   ├── scorer.ts               # Run tests, lint, a11y checks
│   ├── decider.ts              # Decide next action
│   └── types.ts                # Automation types
├── routes/
│   └── automation.ts           # POST /api/automation/start
└── services/
    ├── testRunner.ts           # Run Vitest tests
    ├── lintRunner.ts           # Run linting checks
    ├── a11yRunner.ts           # Run accessibility checks
    └── perfRunner.ts           # Run performance checks
```

#### Build Spec Schema
```
specs/
└── buildSpec.json              # Acceptance criteria definition
```

#### UI Panel
```
client/src/
├── pages/
│   └── automation-panel.tsx    # Real-time automation status UI
└── components/
    └── automation/
        ├── StateMachine.tsx    # Visual state machine
        ├── ScoreCard.tsx       # Score visualization
        └── DecisionLog.tsx     # Decision history
```

#### Tests
```
server/automation/__tests__/
├── machine.test.ts
├── planner.test.ts
├── executor.test.ts
├── scorer.test.ts
└── decider.test.ts
```

### Files to Edit

#### 1. Add Automation Route
**File**: `server/routes.ts`
**Changes**: Register POST `/api/automation/start`, GET `/api/automation/status/:id`

#### 2. Add WebSocket Handler for Progress
**File**: `server/routes.ts`
**Changes**: Broadcast automation events via WebSocket

#### 3. Add Automation Table to Schema
**File**: `shared/schema.ts`
**Changes**: Add `automation_runs`, `automation_steps`, `automation_scores` tables

#### 4. Add Automation Page Route
**File**: `client/src/App.tsx`
**Changes**: Add route `/automation` → `AutomationPanel`

### Build Spec Schema

```json
// specs/buildSpec.json
{
  "acceptance": {
    "functional": [
      "All routes render without errors",
      "Forms submit successfully",
      "Data persists to database"
    ],
    "performance": {
      "lighthouse": {
        "performance": 90,
        "accessibility": 95,
        "best-practices": 90,
        "seo": 90
      },
      "loadTime": "< 3s"
    },
    "accessibility": {
      "wcag": "AA",
      "ariaCompliance": true,
      "keyboardNavigation": true
    },
    "testing": {
      "unitCoverage": 80,
      "e2eCoverage": "all critical paths"
    }
  },
  "routes": {
    "required": ["/", "/about", "/contact"],
    "protected": [],
    "api": ["/api/posts", "/api/users"]
  },
  "dataModels": ["User", "Post", "Comment"],
  "gates": {
    "build": "must succeed",
    "typecheck": "must pass",
    "tests": "all must pass",
    "lint": "no errors"
  }
}
```

### Automation Loop Implementation

```typescript
// automation/machine.ts - State Machine
type AutomationState = 'planning' | 'executing' | 'scoring' | 'deciding' | 'complete' | 'failed';

interface AutomationContext {
  specId: string;
  buildSpec: BuildSpec;
  currentPlan: Plan | null;
  executionResults: ExecutionResult[];
  scores: Score[];
  decisions: Decision[];
  iteration: number;
  maxIterations: number;
}

class AutomationMachine {
  async run(context: AutomationContext): Promise<void> {
    while (context.iteration < context.maxIterations) {
      // PLAN
      const plan = await this.planner.generatePlan(context);
      context.currentPlan = plan;
      
      // EXECUTE
      const executionResult = await this.executor.execute(plan);
      context.executionResults.push(executionResult);
      
      // SCORE
      const score = await this.scorer.score(executionResult, context.buildSpec);
      context.scores.push(score);
      
      // DECIDE
      const decision = await this.decider.decide(score, context);
      context.decisions.push(decision);
      
      // Broadcast progress via WebSocket
      this.broadcastProgress(context);
      
      // Check decision
      if (decision.action === 'complete') {
        return; // Success!
      } else if (decision.action === 'ask') {
        await this.requestHumanInput(decision);
        return; // Wait for human
      } else if (decision.action === 'retry') {
        context.iteration++;
        continue; // Try again
      } else {
        throw new Error('Automation failed');
      }
    }
  }
}
```

### Scorer Implementation

```typescript
// automation/scorer.ts
interface Score {
  timestamp: Date;
  iteration: number;
  gates: {
    build: { passed: boolean; output: string };
    typecheck: { passed: boolean; errors: string[] };
    tests: { passed: boolean; coverage: number; failures: string[] };
    lint: { passed: boolean; errors: string[] };
  };
  performance: {
    lighthouse: LighthouseScore;
    loadTime: number;
  };
  accessibility: {
    violations: A11yViolation[];
    passed: boolean;
  };
  overall: {
    passed: boolean;
    percentage: number;
    blockers: string[];
  };
}

async function scoreProject(project: GeneratedProject, buildSpec: BuildSpec): Promise<Score> {
  const score: Score = {
    timestamp: new Date(),
    iteration: 0,
    gates: {
      build: await runBuild(project),
      typecheck: await runTypeCheck(project),
      tests: await runTests(project),
      lint: await runLint(project),
    },
    performance: await runPerformanceTests(project),
    accessibility: await runA11yTests(project),
    overall: { passed: false, percentage: 0, blockers: [] }
  };
  
  // Calculate overall score
  const gatesPassed = Object.values(score.gates).every(g => g.passed);
  const perfPassed = score.performance.lighthouse.performance >= buildSpec.acceptance.performance.lighthouse.performance;
  const a11yPassed = score.accessibility.passed;
  
  score.overall.passed = gatesPassed && perfPassed && a11yPassed;
  score.overall.percentage = calculatePercentage(score);
  score.overall.blockers = extractBlockers(score);
  
  return score;
}
```

### UI Panel for Progress

```tsx
// client/src/pages/automation-panel.tsx
export default function AutomationPanel() {
  const [status, setStatus] = useState<AutomationContext | null>(null);
  
  // Subscribe to WebSocket updates
  useEffect(() => {
    const ws = new WebSocket('/ws');
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === 'automation:progress') {
        setStatus(update.context);
      }
    };
  }, []);
  
  return (
    <div>
      <h1>Automation Mode</h1>
      
      {/* State Machine Visualization */}
      <StateMachine currentState={status?.state} />
      
      {/* Iteration Counter */}
      <div>Iteration: {status?.iteration} / {status?.maxIterations}</div>
      
      {/* Current Score */}
      {status?.scores.length > 0 && (
        <ScoreCard score={status.scores[status.scores.length - 1]} />
      )}
      
      {/* Decision Log */}
      <DecisionLog decisions={status?.decisions || []} />
    </div>
  );
}
```

---

## 6) Commands to Run Next

### Phase 1: Setup Testing Infrastructure

```bash
# Install Playwright for E2E testing
npm install -D @playwright/test @axe-core/playwright

# Initialize Playwright
npx playwright install

# Add test script to package.json
npm pkg set scripts.test="vitest"
npm pkg set scripts.test:e2e="playwright test"
npm pkg set scripts.test:coverage="vitest --coverage"
```

### Phase 2: Scaffold Prompt → Site MVP

```bash
# Create directory structure
mkdir -p server/generator
mkdir -p server/generator/__tests__
mkdir -p server/templates/recipes
mkdir -p server/templates/components
mkdir -p specs
mkdir -p scripts

# Create placeholder files (will implement in next phase)
touch server/generator/promptParser.ts
touch server/generator/templateMatcher.ts
touch server/generator/fileGenerator.ts
touch server/generator/projectAssembler.ts
touch server/generator/buildValidator.ts

# Create recipe files
touch server/templates/recipes/blog.recipe.ts
touch server/templates/recipes/dashboard.recipe.ts
touch server/templates/recipes/landing.recipe.ts

# Create component templates
touch server/templates/components/page.template.ts
touch server/templates/components/layout.template.ts
touch server/templates/components/form.template.ts

# Create generation endpoint
touch server/routes/generate.ts

# Create CLI script
touch scripts/generate-site.ts

# Create template mappings
touch specs/templateMappings.json

# Create tests
touch server/generator/__tests__/promptParser.test.ts
touch server/generator/__tests__/integration.test.ts

# Add script to package.json
npm pkg set scripts.generate:site="tsx scripts/generate-site.ts"
```

### Phase 3: Scaffold Automation Mode MVP

```bash
# Create automation directory structure
mkdir -p server/automation
mkdir -p server/automation/__tests__
mkdir -p server/services
mkdir -p client/src/pages
mkdir -p client/src/components/automation

# Create automation core files
touch server/automation/machine.ts
touch server/automation/planner.ts
touch server/automation/executor.ts
touch server/automation/scorer.ts
touch server/automation/decider.ts
touch server/automation/types.ts

# Create service runners
touch server/services/testRunner.ts
touch server/services/lintRunner.ts
touch server/services/a11yRunner.ts
touch server/services/perfRunner.ts

# Create automation routes
touch server/routes/automation.ts

# Create build spec
touch specs/buildSpec.json

# Create UI components
touch client/src/pages/automation-panel.tsx
touch client/src/components/automation/StateMachine.tsx
touch client/src/components/automation/ScoreCard.tsx
touch client/src/components/automation/DecisionLog.tsx

# Create tests
touch server/automation/__tests__/machine.test.ts
touch server/automation/__tests__/scorer.test.ts
```

### Phase 4: Database Migration

```bash
# Add new tables to schema (edit shared/schema.ts manually)
# Then push to database
npm run db:push
```

### Phase 5: Run Tests & Validate

```bash
# Type check
npm run check

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Check coverage
npm run test:coverage

# Start dev server to test
npm run dev
```

### Phase 6: Test Prompt → Site Pipeline

```bash
# Generate a test site
npm run generate:site -- --prompt "blog with posts and comments" --output ./test-output

# Verify generated files exist
ls -la ./test-output

# Try to build generated project
cd ./test-output && npm install && npm run build
```

### Phase 7: Test Automation Mode

```bash
# Start automation for a spec
curl -X POST http://localhost:5000/api/automation/start \
  -H "Content-Type: application/json" \
  -d '{"specId": "test-spec-id"}'

# Monitor progress (WebSocket or polling)
curl http://localhost:5000/api/automation/status/run-id

# Open automation panel in browser
open http://localhost:5000/automation
```

---

## 7) Risks & Assumptions

### Assumptions (Will NOT Ask)

1. **Database is provisioned and accessible** via `DATABASE_URL` environment variable
2. **OpenAI API key is optional** for MVP (will use rule-based templates first)
3. **Generated projects will use the same stack** (Vite + React + TypeScript + Tailwind)
4. **Build spec acceptance criteria are reasonable** (80% coverage, WCAG AA, etc.)
5. **CLI will run in the same environment** as the dev server (access to database)
6. **WebSocket connection for automation progress** already works (infrastructure exists)
7. **File system writes are permitted** in the output directory
8. **Generated projects will be standalone** (not part of monorepo)

### Secrets/Environment Values (Will Stub)

```env
# .env.example additions
OPENAI_API_KEY=sk-stub-key-for-testing  # Optional, will work without it
GENERATION_OUTPUT_DIR=./generated        # Where to write generated projects
AUTOMATION_MAX_ITERATIONS=10             # Safety limit for automation loop
LIGHTHOUSE_API_KEY=                      # Optional, for performance testing
```

### Technical Risks

**High Risk**:
- **File generation conflicts**: Generated files may conflict with existing codebase
  - *Mitigation*: Generate in isolated directories outside main project
- **Infinite automation loops**: Decider logic bugs could cause endless iterations
  - *Mitigation*: Hard limit on iterations (default: 10)
- **Database schema conflicts**: New tables may conflict with existing migrations
  - *Mitigation*: Review existing schema carefully before adding tables

**Medium Risk**:
- **Template rigidity**: Rule-based templates won't handle complex requirements
  - *Mitigation*: Start simple (blog, landing page), add complexity incrementally
- **Test reliability**: E2E tests may be flaky
  - *Mitigation*: Use Playwright's auto-wait and retry mechanisms
- **Performance overhead**: Automation loop running tests repeatedly may be slow
  - *Mitigation*: Cache test results, run only changed tests

**Low Risk**:
- **CLI argument parsing**: Simple prompts should parse reliably
  - *Mitigation*: Use established library like `commander` or `yargs`
- **WebSocket broadcasting**: Infrastructure already exists for real-time updates
  - *Mitigation*: Reuse existing WebSocket setup from Yjs integration

### Process Risks

**High Risk**:
- **Scope creep**: "Just one more feature" syndrome
  - *Mitigation*: Strict adherence to MVP definition, no LLM initially
- **Integration complexity**: Automation mode depends on Prompt → Site working
  - *Mitigation*: Complete Phase 1 (Prompt → Site) fully before Phase 2

**Medium Risk**:
- **Acceptance criteria ambiguity**: "What counts as passing?"
  - *Mitigation*: Clear, measurable gates in buildSpec.json
- **Manual intervention timing**: When should automation ask for help?
  - *Mitigation*: Conservative decider logic (ask early, iterate on confidence)

### Validation Risks

**High Risk**:
- **False positives in scoring**: Tests pass but site is broken
  - *Mitigation*: Multiple validation layers (build + tests + lint + E2E)
- **Generated code quality**: Templates may produce unidiomatic or insecure code
  - *Mitigation*: Code review templates carefully, add linting rules

---

## Next Steps

This is a **planning document only**. No files have been created or modified yet.

**Recommended order of implementation**:
1. ✅ Review this audit document
2. ⏭️ Get approval to proceed with Prompt → Site MVP
3. ⏭️ Implement Phase 2 scaffolding (directories and placeholder files)
4. ⏭️ Implement core generation pipeline (promptParser → templateMatcher → fileGenerator)
5. ⏭️ Add tests for generation pipeline
6. ⏭️ Implement CLI interface
7. ⏭️ Test end-to-end generation
8. ⏭️ Implement Automation Mode MVP (state machine loop)
9. ⏭️ Add scorer and decider logic
10. ⏭️ Create UI panel for monitoring
11. ⏭️ Test full automation loop

**Estimated effort**:
- Prompt → Site MVP: **3-5 days** (with simple templates)
- Automation Mode MVP: **5-7 days** (with basic scoring)
- Total: **2 weeks** for both MVPs

**Dependencies**:
- No external dependencies beyond what's already installed
- Database must be accessible (DATABASE_URL env var)
- Playwright installation for E2E testing (automated in Phase 1)

---

**Status**: ✅ **AUDIT COMPLETE - READY FOR APPROVAL**

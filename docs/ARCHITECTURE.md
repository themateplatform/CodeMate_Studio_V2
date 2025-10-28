# BuildMate Studio - Architecture & Implementation Guide

## System Overview

BuildMate Studio is a full-stack Express + React + Drizzle ORM application that orchestrates a 6-stage user funnel from idea to deployed application.

### Core Principle
Every user interaction flows through a defined stage with clear entry criteria, outputs, and conversion metrics.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                Frontend (React + Vite)                  │
│   Stage 1: Intake → Stage 2: Scope → Stage 3: Concepts │
│   Stage 4: Pricing → Stage 5: Build Monitor             │
└──────────────────────┬──────────────────────────────────┘
                       │ (TanStack Query + REST)
┌──────────────────────▼──────────────────────────────────┐
│           Express API (Port 5000)                       │
│  /api/intake  /api/scope  /api/concepts  /api/pricing   │
│  /api/build   /api/deploy  /api/builds   /api/auth      │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    Database      Generator       Integrations
    (Neon DB)     Pipeline        (GitHub, Stripe,
    (Drizzle)     (Prompt → Code) Mate Services)
```

---

## Database Schema (Drizzle ORM)

### Core Tables

```typescript
// users table: Account holder
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password"), // bcrypt hash
  githubUsername: text("github_username"), // OAuth connection
  stripeCustomerId: text("stripe_customer_id"), // Payment link
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// builds table: Tracks each project through the funnel
export const builds = pgTable("builds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Project metadata
  projectName: text("project_name").notNull(),
  projectType: text("project_type").notNull(), // 'greenfield' | 'completion'
  existingRepoUrl: text("existing_repo_url"), // If completion
  
  // Stage tracking
  status: text("status").notNull(), // 'intake' | 'scope' | 'concepts' | 'pricing' | 'paid' | 'building' | 'complete'
  
  // Stage 1: Intake answers
  intakeAnswers: jsonb("intake_answers").notNull(), // { goals, audience, integrations, brandPreference, ... }
  
  // Stage 2: Scope document
  scopeDocUrl: text("scope_doc_url"), // URL to generated scope markdown
  scopeApprovedAt: timestamp("scope_approved_at"), // When user approved scope
  
  // Stage 3: Concept selection
  conceptBoards: jsonb("concept_boards"), // Array of 3 generated mood boards
  selectedConceptId: text("selected_concept_id"), // Which one user picked
  
  // Stage 4: Pricing & Payment
  complexityScore: integer("complexity_score"), // 1-100
  estimatedPrice: integer("estimated_price"), // In cents
  pricingBreakdown: jsonb("pricing_breakdown"), // { base, pages, integrations, multipliers }
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paidAt: timestamp("paid_at"), // When payment succeeded
  
  // Stage 5: Build execution
  buildStartedAt: timestamp("build_started_at"),
  buildCompletedAt: timestamp("build_completed_at"),
  buildError: text("build_error"), // If build failed
  
  // Stage 6: Deployment
  repoUrl: text("repo_url"), // Where code lives (GitHub)
  previewUrl: text("preview_url"), // Staging deployment
  productionUrl: text("production_url"), // Live deployment
  deploymentPlatform: text("deployment_platform"), // 'vercel' | 'netlify' | etc
  
  // Branding & styling
  brandKitId: varchar("brand_kit_id").references(() => brandKits.id), // Optional reuse
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// brandKits table: Reusable branding for multi-project customers
export const brandKits = pgTable("brand_kits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  name: text("name").notNull(), // "Acme Corp Brand", "Portfolio Style"
  colors: jsonb("colors").notNull(), // { primary, secondary, accent, bg, text }
  typography: jsonb("typography").notNull(), // { headings: font, body: font }
  logoUrl: text("logo_url"), // Optional
  guidelines: text("guidelines"), // Brand voice, tone guidelines
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Repo analysis cache for completion projects
export const repoAnalyses = pgTable("repo_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildId: varchar("build_id").notNull().references(() => builds.id),
  
  // Detection results
  techStack: jsonb("tech_stack"), // { framework, language, styling, database, deployment }
  todos: jsonb("todos"), // Array of found TODOs
  missingFeatures: jsonb("missing_features"), // Inferred incomplete features
  fileTree: jsonb("file_tree"), // Directory structure
  recommendations: jsonb("recommendations"), // Suggested improvements
  
  analyzedAt: timestamp("analyzed_at").defaultNow(),
});
```

---

## API Endpoints (Express Routes)

### Authentication Routes

```typescript
POST /api/auth/register
// Body: { email, username, password, firstName?, lastName? }
// Returns: { user: { id, email, username }, sessionId }

POST /api/auth/login
// Body: { username, password }
// Returns: { user, sessionId }

GET /api/auth/user
// Returns: { id, email, username, githubUsername, ... }

POST /api/auth/logout
// Clears session
```

### Intake Routes

```typescript
POST /api/intake
// Body: { projectName, projectType, goals, audience, integrations, brandPreference, existingRepoUrl? }
// 1. Validate inputs
// 2. Create builds record with status='intake'
// 3. If completion project, trigger repoAnalyzer in background
// Returns: { buildId, status, nextStep }

GET /api/intake/:buildId
// Returns: Current intake answers for editing
```

### Scope Routes

```typescript
POST /api/scope/generate
// Body: { buildId }
// 1. Fetch intake answers
// 2. If completion, run repo analysis
// 3. Generate scope document
// 4. Store scopeDocUrl
// Returns: { scopeDocUrl, estimatedPages, estimatedIntegrations }

POST /api/scope/approve
// Body: { buildId }
// 1. Mark scope as approved
// 2. Transition to 'concepts' stage
// Returns: { buildId, status: 'concepts', nextStep }

POST /api/scope/revise
// Body: { buildId, feedback }
// Regenerate scope with user feedback
// Returns: { scopeDocUrl }
```

### Concepts Routes

```typescript
POST /api/concepts/generate
// Body: { buildId }
// 1. Fetch scope document
// 2. If user has brand kit, respect colors/fonts
// 3. Generate 3 mood boards
// 4. Store in builds.conceptBoards
// Returns: { concepts: [{ id, name, colors, typography, images }] }

POST /api/concepts/select
// Body: { buildId, conceptId }
// 1. Validate conceptId exists in builds.conceptBoards
// 2. Mark selected
// 3. Transition to 'pricing' stage
// Returns: { buildId, status: 'pricing', nextStep }
```

### Pricing Routes

```typescript
POST /api/pricing/calculate
// Body: { buildId }
// 1. Fetch scope + intake answers
// 2. Run pricing calculator
// 3. Store in builds.{complexityScore, estimatedPrice, pricingBreakdown}
// Returns: { price: $X.XX, breakdown: [...], currency: 'USD' }

POST /api/pricing/checkout
// Body: { buildId }
// 1. Create Stripe Checkout session
// 2. Return sessionId to redirect client
// Returns: { checkoutUrl, sessionId }

POST /api/webhooks/stripe
// Stripe calls this after payment
// 1. Verify webhook signature
// 2. Mark builds.paidAt
// 3. Trigger build stage
// 4. Send user notification
```

### Build Routes

```typescript
POST /api/build/start
// Body: { buildId }
// Only allowed if status='paid'
// 1. Fetch scope, concepts, intake
// 2. If greenfield: scaffoldProject()
// 3. If completion: enhanceRepo()
// 4. Update status to 'building'
// Returns: { buildId, status: 'building', estimatedDuration }

GET /api/build/:buildId/progress
// Returns real-time build progress
// { status, percentage, currentTask, eta }

GET /api/build/:buildId/result
// After build completes
// Returns: { repoUrl, previewUrl, readyForDeploy: true }
```

### Deployment Routes

```typescript
POST /api/deploy/platforms
// Returns available deployment targets
// [{ value: 'vercel', label: 'Vercel', ... }, ...]

POST /api/deploy/select
// Body: { buildId, platform }
// 1. Generate deployment config
// 2. Create environment variable template
// 3. Provide instructions
// Returns: { platform, deploymentConfig, instructions }

POST /api/deploy/confirm
// Body: { buildId, productionUrl }
// 1. Verify deployment successful
// 2. Update builds.{deploymentPlatform, productionUrl}
// 3. Mark status='complete'
// 4. Send celebration email
```

### Build Management Routes

```typescript
GET /api/builds
// Returns: [ { id, projectName, status, createdAt }, ... ]

GET /api/builds/:buildId
// Returns full build details

DELETE /api/builds/:buildId
// Delete build (soft delete, keep for analytics)

PUT /api/builds/:buildId
// Update project name or other metadata
```

### Brand Kit Routes

```typescript
GET /api/brand-kits
// Returns: [ { id, name, colors, usage }, ... ]

POST /api/brand-kits
// Body: { name, colors, typography, logoUrl?, guidelines? }
// Returns: { id, name, ... }

PUT /api/brand-kits/:kitId
// Update brand kit

DELETE /api/brand-kits/:kitId
// Delete (if not in use)

GET /api/brand-kits/:kitId/usage
// Returns: { buildsCount, projects: [...] }
```

---

## Generator Pipeline

### Entry Point
```typescript
// server/routes/generate.ts - POST /api/build/start
app.post("/api/build/start", async (req, res) => {
  const { buildId } = req.body;
  const build = await db.query.builds.findFirst({ where: eq(builds.id, buildId) });
  
  if (build.projectType === 'greenfield') {
    await generateGreenfieldProject(build);
  } else {
    await completeExistingRepo(build);
  }
});
```

### Stage 1: Prompt Parsing
```typescript
// server/generator/promptParser.ts
export function parseIntakeAnswers(intake: IntakeAnswers): ParsedIntent {
  return {
    projectType: intake.projectType,
    pages: inferPages(intake.goals),
    integrations: intake.integrations,
    customFeatures: extractCustomFeatures(intake),
    accessibilityRequirements: intake.accessibility,
    performanceRequirements: intake.performance,
    complianceNeeds: intake.compliance,
  };
}
```

### Stage 2: Repository Analysis (Completion Only)
```typescript
// server/github/repoAnalyzer.ts
export async function analyzeRepo(repoUrl: string, githubToken: string): Promise<RepoAnalysis> {
  const octokit = new Octokit({ auth: githubToken });
  const [owner, repo] = parseGitHubUrl(repoUrl);
  
  // 1. Detect tech stack
  const techStack = await detectTechStack(octokit, owner, repo);
  
  // 2. Scan for TODOs
  const todos = await scanForTodos(octokit, owner, repo);
  
  // 3. Infer missing features
  const missingFeatures = inferMissingFeatures(techStack, todos);
  
  // 4. Generate recommendations
  const recommendations = generateRecommendations(techStack, missingFeatures);
  
  return { techStack, todos, missingFeatures, recommendations };
}
```

### Stage 3: Scope Generation
```typescript
// server/generator/scopeGenerator.ts
export async function generateScope(build: Build): Promise<string> {
  const scope = `
# Scope: ${build.projectName}

## Project Type
${build.projectType === 'greenfield' ? 'New project from scratch' : 'Existing repo completion'}

## Goals & Audience
${JSON.stringify(build.intakeAnswers.goals, null, 2)}

## Planned Pages & Features
${formatPagesList(build.intakeAnswers.pages)}

## Integrations
${formatIntegrations(build.intakeAnswers.integrations)}

## Success Criteria
- Core Web Vitals (LCP < 2.5s, CLS < 0.1)
- WCAG 2.1 AA accessibility baseline
- SEO setup (meta tags, sitemap, schema)

## Timeline
- Build: 15 minutes (automated)
- Review: User's time
- Deploy: 5 minutes

## What's Included
- All requested features
- Responsive design (mobile-first)
- Performance optimization
- SEO setup
- 30 days post-launch support

## Deployment Options
- Vercel, Netlify, Cloudflare, AWS Amplify, or self-hosted
  `;
  
  return scope;
}
```

### Stage 4: Mood Board Generation
```typescript
// server/generator/moodboardGenerator.ts
export async function generateMoodBoards(build: Build): Promise<MoodBoard[]> {
  const vibes = ['modern-minimal', 'bold-energetic', 'classic-trustworthy'];
  
  return Promise.all(
    vibes.map(async (vibe) => {
      // 1. Generate inspiration images
      const images = await generateInspirationImages(vibe, build.intakeAnswers.industry);
      
      // 2. Extract or generate color palette
      const colors = build.brandKitId
        ? await getBrandKitColors(build.brandKitId)
        : await generateColorPalette(vibe, images);
      
      // 3. Select typography
      const typography = build.brandKitId
        ? await getBrandKitTypography(build.brandKitId)
        : await selectTypography(vibe);
      
      return {
        id: `mood-${vibe}`,
        name: formatVibeName(vibe),
        images,
        colors,
        typography,
        styleNotes: getStyleNotes(vibe),
      };
    })
  );
}
```

### Stage 5: File Generation (Greenfield)
```typescript
// server/generator/fileGenerator.ts
export async function generateProject(build: Build, concept: MoodBoard): Promise<ProjectFiles> {
  // 1. Scaffold React + TS + Tailwind project
  const files = await scaffoldReactProject();
  
  // 2. Add page components based on scope
  for (const page of build.intakeAnswers.pages) {
    files.push(...await generatePageComponent(page, concept));
  }
  
  // 3. Generate route configuration
  files.push(generateRoutes(build.intakeAnswers.pages));
  
  // 4. Apply styling from mood board
  files.push(generateTailwindConfig(concept.colors));
  files.push(generateCSSVariables(concept.colors, concept.typography));
  
  // 5. Add integrations
  for (const integration of build.intakeAnswers.integrations) {
    files.push(...await generateIntegration(integration));
  }
  
  // 6. Generate database schema (if needed)
  if (build.intakeAnswers.requiresDatabase) {
    files.push(generateDrizzleSchema(build.intakeAnswers.dataModel));
  }
  
  return files;
}
```

### Stage 6: Validation
```typescript
// server/generator/buildValidator.ts
export async function validateBuild(files: ProjectFiles): Promise<ValidationResult> {
  const results = {
    typescript: await runTypeCheck(files),
    eslint: await runESLint(files),
    accessibility: await runAccessibilityAudit(files),
    performance: await runLighthouse(files),
    security: await runSecurityScan(files),
  };
  
  return {
    passed: Object.values(results).every(r => r.passed),
    scores: results,
    recommendations: generateRecommendations(results),
  };
}
```

### Stage 7: Assembly & Output
```typescript
// server/generator/projectAssembler.ts
export async function assembleProject(build: Build, files: ProjectFiles): Promise<DeployableProject> {
  // 1. Create project structure on disk
  const projectPath = `${process.cwd()}/.generated/${build.id}`;
  await writeFiles(projectPath, files);
  
  // 2. Initialize git repo
  await initGit(projectPath, build.projectName);
  
  // 3. Push to GitHub
  const repoUrl = await pushToGitHub(projectPath, build.userId);
  
  // 4. Deploy preview
  const previewUrl = await deployPreview(repoUrl);
  
  // 5. Generate deployment config
  const deploymentConfigs = generateDeploymentConfigs(build.intakeAnswers.deploymentTarget);
  
  // 6. Update build record
  await db.update(builds).set({
    status: 'complete',
    repoUrl,
    previewUrl,
    buildCompletedAt: new Date(),
  });
  
  return {
    repoUrl,
    previewUrl,
    projectPath,
    deploymentConfigs,
  };
}
```

---

## Frontend Flow (React Components)

```
App.tsx
├── Home (landing page)
├── Dashboard (user's builds)
└── BuildFlow (funnel)
    ├── IntakeForm (Stage 1)
    │   └── ProjectTypeSelect, GoalsInput, IntegrationsCheckbox, etc.
    │
    ├── ScopeReview (Stage 2)
    │   └── ScopeDocument (markdown), ApproveButton, ReviseButton
    │
    ├── MoodBoardSelector (Stage 3)
    │   └── MoodBoardCard (colors, typography, images) × 3
    │
    ├── PricingGate (Stage 4)
    │   └── PricingBreakdown, StripeCheckoutButton
    │
    ├── BuildMonitor (Stage 5)
    │   └── ProgressBar, CurrentTask, EstimatedTime
    │
    └── DeploymentSelector (Stage 6)
        └── PlatformCard (Vercel, Netlify, etc.), Instructions
```

---

## Session & Authentication

```typescript
// server/index.ts
app.use(session({
  store: sessionStore, // PostgreSQL via connect-pg-simple
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true },
}));

// All routes can access: req.session.user
app.post("/api/builds", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Build logic
});
```

---

## Deployment Pipeline

### GitHub Integration
1. Create OAuth token from user's GitHub account
2. Create repository under user's GitHub
3. Push generated code
4. Create initial commit + branch `buildmate-completion` (if completion)
5. Return repo URL

### Preview Deployment
1. Auto-deploy to Vercel (free tier available)
2. Generate preview URL
3. User tests before production

### Production Deployment
1. User selects platform (Vercel, Netlify, etc.)
2. Generate platform-specific config files
3. User connects GitHub integration on platform
4. Platform auto-deploys on push
5. User configures custom domain

---

For detailed implementation examples, see:
- `.github/copilot-instructions.md` — AI agent guidance
- `docs/getting-started.md` — Development setup
- `docs/FREEMIUM-MODEL.md` — Business logic

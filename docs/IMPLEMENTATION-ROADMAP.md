# BuildMate Studio - Implementation Roadmap

## Executive Summary

BuildMate Studio is transitioning from an internal code generator to a **user-facing freemium SaaS product**. This roadmap outlines the phased implementation needed to support the full user journey with clear conversion funnels and revenue model.

---

## Phase 1: MVP - Greenfield Projects (Weeks 1-4)

### Goal
Launch a working end-to-end flow: Intake → Scope → Concepts → Price → Build → Deploy

### What's Required

#### Backend (Express Routes)
- [ ] `POST /api/intake` - Save user project details
- [ ] `POST /api/scope/generate` - Generate scope document from intake
- [ ] `POST /api/scope/approve` - Mark scope as approved
- [ ] `POST /api/concepts/generate` - Generate 3 mood boards
- [ ] `POST /api/concepts/select` - Save selected concept
- [ ] `POST /api/pricing/calculate` - Calculate price based on complexity
- [ ] `POST /api/pricing/checkout` - Stripe checkout session
- [ ] `POST /api/webhooks/stripe` - Payment webhook handler
- [ ] `POST /api/build/start` - Trigger code generation
- [ ] `GET /api/build/:buildId/progress` - Real-time build status
- [ ] `POST /api/deploy/select` - Choose deployment platform
- [ ] `GET /api/builds` - List user's projects
- [ ] `GET /api/builds/:buildId` - Get project details

#### Frontend (React Components)
- [ ] `IntakeForm` - Collect project details, integrations, preferences
- [ ] `ScopeReview` - Display generated scope, approve/revise buttons
- [ ] `MoodBoardSelector` - Show 3 mood boards, allow selection
- [ ] `PricingGate` - Display price breakdown, Stripe checkout
- [ ] `BuildMonitor` - Real-time build progress
- [ ] `DeploymentSelector` - Choose target platform, show instructions
- [ ] `Dashboard` - List of all builds, creation button
- [ ] `BuildDetail` - View single build details and outputs

#### Database Schema
- [ ] Ensure `builds` table exists with all required fields
- [ ] Ensure `users` table has Stripe integration
- [ ] Migrations to create/update tables

#### Generator Pipeline
- [ ] `scopeGenerator` - Create detailed scope from intake
- [ ] `moodboardGenerator` - Create 3 visual mood boards
- [ ] `projectScaffold` - Bootstrap React + TS + Tailwind project
- [ ] `pageGenerator` - Create individual page components
- [ ] `routeGenerator` - Create routing configuration
- [ ] `buildValidator` - Run TypeScript, accessibility checks
- [ ] `projectAssembler` - Package for deployment

#### External Integrations
- [ ] Stripe API setup (development + production keys)
- [ ] GitHub OAuth (enable user to push code)
- [ ] GitHub API (create repos, push code)

#### Deployment
- [ ] Vercel integration (auto-deploy preview)
- [ ] Generate Vercel/Netlify config templates

#### Observability
- [ ] Build success rate tracking
- [ ] Conversion rate at each funnel stage
- [ ] Time-to-build metrics

### Success Criteria
- User can complete full flow in <1 hour
- Build generates without errors 95% of time
- First 10 paying customers through system
- Avg project value ~$1,000

---

## Phase 2: Completion Projects (Weeks 5-8)

### Goal
Support developers who want AI to enhance their existing repos

### What's Required

#### Backend
- [ ] `POST /api/github/authorize` - OAuth flow to connect GitHub
- [ ] `server/github/repoAnalyzer.ts` - Analyze tech stack, TODOs, missing features
- [ ] Enhanced `POST /api/build/start` - Handle completion projects
- [ ] `server/github/prCreator.ts` - Create PR with improvements

#### Frontend
- [ ] Add "completion" option to project type selector
- [ ] Repo URL input field
- [ ] Display of repo analysis results
- [ ] PR review & merge instructions

#### Generator Updates
- [ ] Detect: React, Vue, Svelte, Next.js, etc.
- [ ] Scan for TODOs in all file types
- [ ] Infer missing: auth, SEO, tests, CI/CD
- [ ] Generate feature implementations for common gaps

#### Database
- [ ] `repoAnalyses` table to cache analysis results

#### GitHub Integration
- [ ] Clone repo function
- [ ] Branch management
- [ ] Commit functionality
- [ ] PR creation with detailed description

### Success Criteria
- Successfully analyze 10+ popular GitHub project structures
- Generate PRs that pass CI checks
- Developers use for real project completion

---

## Phase 3: Brand Kits & Multi-Project (Weeks 9-10)

### Goal
Serve agencies building multiple sites with consistent branding

### What's Required

#### Backend
- [ ] `GET /api/brand-kits` - List user's brand kits
- [ ] `POST /api/brand-kits` - Create new brand kit
- [ ] `PUT /api/brand-kits/:kitId` - Update brand kit
- [ ] Enhanced `POST /api/concepts/generate` - Respect brand kit constraints

#### Frontend
- [ ] `BrandKitDashboard` - Manage brand kits
- [ ] `BrandKitForm` - Create/edit kits (colors, fonts, logo)
- [ ] Brand kit selector in intake flow

#### Database
- [ ] `brandKits` table
- [ ] `buildBrandKits` junction table

#### Generator
- [ ] When brand kit selected, use its colors/fonts
- [ ] Vary only layout/imagery in mood boards

### Success Criteria
- Agency customer can build 5 sites with consistent branding
- Pricing reflects time savings (cheaper second+ projects)

---

## Phase 4: Deployment Flexibility (Weeks 11-12)

### Goal
Support multiple hosting platforms beyond Vercel

### What's Required

#### Backend
- [ ] `POST /api/deploy/platforms` - List available options
- [ ] Netlify deployment config generation
- [ ] Cloudflare Pages config generation
- [ ] AWS Amplify config generation
- [ ] Docker config generation

#### Frontend
- [ ] Better deployment platform selector
- [ ] Platform-specific instructions
- [ ] Post-deployment verification

### Success Criteria
- Users can deploy to platform of choice without friction

---

## Phase 5: Advanced Features (Weeks 13+)

### Future Enhancements
- [ ] Team collaboration (share builds, assign tasks)
- [ ] Bulk pricing for agencies
- [ ] Custom template library
- [ ] API-driven project generation
- [ ] Recurring builds for content updates
- [ ] Advanced analytics dashboard
- [ ] Webhooks for external integrations

---

## Technical Debt & Quality

### Throughout All Phases
- [ ] Unit tests (vitest) - Target 70% coverage
- [ ] E2E tests (Playwright) - Critical user flows
- [ ] Error handling & logging
- [ ] Rate limiting (prevent abuse)
- [ ] CSRF protection (complete implementation)
- [ ] Security audit before launch
- [ ] Performance optimization (Core Web Vitals)
- [ ] Accessibility compliance (WCAG 2.1 AA)

---

## Infrastructure & Deployment

### Development
- [x] Local development with `npm run dev`
- [ ] Staging environment (database + API)
- [ ] CI/CD pipeline (GitHub Actions)

### Production
- [ ] Production database (Neon PostgreSQL)
- [ ] Server deployment (Replit, Vercel, or AWS)
- [ ] CDN for static assets
- [ ] Monitoring & error tracking
- [ ] Automated backups

---

## Marketing & Onboarding

### Pre-Launch
- [ ] Landing page
- [ ] Pricing page
- [ ] Demo video (full user journey)
- [ ] Documentation (getting started, FAQ)

### Launch
- [ ] Beta signup list (50 users)
- [ ] Email campaign
- [ ] Social media announcement
- [ ] Product Hunt (optional)

### Post-Launch
- [ ] Case studies (happy customers)
- [ ] ROI calculator ("your build costs $X, saves you $Y")
- [ ] Referral program
- [ ] Customer testimonials

---

## KPIs to Track

### Funnel Metrics (Daily)
- Users reaching each stage (intake, scope, concepts, pricing, paid, complete)
- Drop-off rate at each stage
- Average time per stage

### Business Metrics (Weekly)
- Revenue (total $ paid)
- Conversion rate (% Stage 3 → Stage 4)
- Avg project value
- Customer acquisition cost

### Quality Metrics (Daily)
- Build success rate (% without errors)
- Avg build time
- User satisfaction (NPS)

---

## Definition of Done

### For Each Phase
1. **Functionality**: All required features implemented
2. **Testing**: Unit + E2E tests pass
3. **Documentation**: Updated `.github/copilot-instructions.md`
4. **Performance**: Core Web Vitals green (LCP < 2.5s, CLS < 0.1)
5. **Accessibility**: WCAG 2.1 AA baseline
6. **Security**: No high/critical vulnerabilities
7. **Deployment**: Staging environment working
8. **Monitoring**: Errors logged and tracked

---

## Resource Allocation

### Team Requirements

**Phase 1 (MVP)**
- 2 Full-stack engineers (4 weeks)
- 1 DevOps/infra engineer (part-time)
- 1 Product manager (full-time)

**Phase 2 (Completion)**
- 1 Backend engineer (GitHub integration)
- 1 Frontend engineer (UI)
- 1 GenAI engineer (repo analysis)

**Phase 3-5**
- 1 Full-stack engineer per phase
- 1 DevOps (ongoing maintenance)

---

## Risk Mitigation

### High Priority
- **Build failures**: Have fallback simple template
- **Payment issues**: Stripe has excellent error handling; implement retry logic
- **GitHub API limits**: Implement caching and rate limiting
- **Scope creep**: Strict phase-based delivery

### Medium Priority
- **Market acceptance**: Start with founders segment
- **Competitor emerges**: Focus on quality & speed
- **Cost overruns**: Monitor Stripe/hosting costs

---

## Success Criteria by Phase

| Phase | Goal | Success Metric |
|-------|------|--------|
| 1 (MVP) | Working end-to-end for greenfield | 10 paying customers, $10K revenue |
| 2 (Completion) | Support GitHub repos | 5 completion projects |
| 3 (Brand Kits) | Multi-project consistency | 1 agency customer with 5+ projects |
| 4 (Deployment) | Platform flexibility | 50% of builds use non-Vercel platform |
| 5 (Advanced) | Scale & differentiate | 50+ paying customers, $50K MRR |

---

## Timeline Summary

```
Phase 1: Weeks 1-4   (Greenfield MVP)
Phase 2: Weeks 5-8   (Completion Projects)
Phase 3: Weeks 9-10  (Brand Kits)
Phase 4: Weeks 11-12 (Deployment)
Phase 5: Weeks 13+   (Advanced Features)

Estimated Time to Revenue: 4 weeks
Time to $10K MRR: 12-16 weeks
```

---

## Next Steps

1. **Confirm vision** with stakeholders
2. **Assign Phase 1 engineers**
3. **Set up infrastructure** (databases, CI/CD)
4. **Start sprint 1** with intake + scope components
5. **Weekly sync** to track progress vs KPIs

---

For detailed technical specifications:
- See `.github/copilot-instructions.md` for code patterns
- See `docs/ARCHITECTURE.md` for system design
- See `docs/FREEMIUM-MODEL.md` for business logic

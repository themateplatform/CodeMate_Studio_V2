# BuildMate Studio - Documentation Update Summary

## Overview
The `.github/copilot-instructions.md` file has been comprehensively updated to reflect BuildMate Studio's actual role as a **user-facing, freemium no-code product** within the Mate Platform ecosystem. This document is now accurate for guiding AI agents through the codebase.

---

## Key Changes Made

### 1. **Mission & Purpose (Clarified)**
**Before**: Generic code generation platform  
**After**: User-facing freemium product with three distinct user types:
- Non-technical founders ("build me a site")
- Developers ("help me finish my repo")
- Agencies ("build 5 sites with consistent branding")

### 2. **Architecture (Restructured)**
Added high-level flow diagram showing the complete user journey:
```
Intake → Research & Scope → Concepts → Pricing Gate → Payment → Build → Deploy
```

Clear service boundaries:
- `client/src/` = intake wizard, scope review, mood board selector, payment flow
- `server/routes/` = route handlers for each stage
- `server/github/` = repo analysis & PR creation
- `server/generator/` = code generation orchestration

### 3. **Freemium Funnel (NEW)**
Documented all 6 stages with pricing model:

| Stage | Cost | Output |
|-------|------|--------|
| 1. Intake | FREE | Answers to project questions |
| 2. Scope | FREE | Scope document (generated or analysis of existing repo) |
| 3. Concepts | FREE | 3 mood boards (colors, fonts, vibes) |
| 4. Pricing | GATE | Price calculation + Stripe checkout |
| 5. Build | PAID | Generated or enhanced code |
| 6. Deploy | PAID | Preview & production URLs |

**Pricing range**: $500 (simple) → $7,500 (complex SaaS)

### 4. **Key Concepts for AI Agents (NEW)**
Added critical context that differs from common assumptions:

**Mood Boards vs. Mockups**
- NOT full-page mockups with exact layouts
- Visual direction: colors, fonts, imagery style, spacing philosophy
- Used to constrain code generation

**Completion Projects**
- User provides existing GitHub repo URL
- AI analyzes tech stack, TODOs, missing features
- Output: PR to original repo (not a fork)
- User merges at their own pace

**Greenfield Projects**
- Scaffold from scratch (React + TS + Tailwind + Drizzle)
- Generate all pages/components based on scope
- Ready to deploy immediately

**Brand Kits**
- Reusable branding for multi-project customers
- Lock colors/fonts for consistency across portfolio
- Mood boards respect brand kit constraints

### 5. **GitHub Integration (Expanded)**
- GitHub OAuth for repo access control
- Repo analysis: detect tech stack, scan TODOs, infer missing features
- Completion workflow: clone → analyze → branch → enhance → PR

### 6. **Data Model (Updated)**
Added `builds` table tracking progression through funnel:
```typescript
id | projectName | projectType | existingRepoUrl | intakeAnswers | 
scopeDocUrl | conceptBoards | selectedConceptId | complexityScore | 
estimatedPrice | paidAt | repoUrl | previewUrl | status | brandKitId
```

Added `brandKits` table for portfolio consistency and `buildBrandKits` junction table.

### 7. **Mate Ecosystem Integration (Clarified)**
How BuildMate uses other Mate Platform services:
- **DesignMate** → Token registry or customer's brand kit
- **Copywriter Agent** → Marketing copy, headlines, CTAs
- **Image Generator** → Mood board imagery
- **SEO Agent** → Meta tags, sitemap, schema
- **Pricing Engine** → Complexity calculation
- **Payment Integration** → Stripe for gatekeeping

### 8. **Pricing Calculator (NEW)**
```
Base: $300 (completion) or $500 (greenfield)
Per-page: +$50 each
Integrations: auth +$200, payments +$300, CMS +$250, etc.
Multipliers: custom features +30%, performance +20%, compliance +30%
```

---

## What AI Agents Now Understand

### Project Flow
1. **User describes their project** (greenfield OR existing repo)
2. **System researches** (market research OR repo analysis)
3. **Scope document generated** (pages, features, tech decisions)
4. **User approves scope** (or requests revisions)
5. **3 mood boards generated** (not mockups—just vibes & direction)
6. **User selects favorite mood** (now committed to aesthetic)
7. **Price calculated** (shown before payment)
8. **User pays** (Stripe checkout)
9. **Build generated** (code reflects scope + mood)
10. **Preview deployed** (user reviews before production)
11. **Production deployed** (user chooses platform: Vercel, Netlify, etc.)

### Key Implementation Details
- **Greenfield** = React + TS + Tailwind scaffold → generate pages/components → deploy
- **Completion** = Clone repo → create `buildmate-completion` branch → implement missing features → create PR → user merges
- **Brand kits** = Lock consistency across multiple builds by constraining colors/fonts
- **Mood boards** = Visual direction only (colors, fonts, imagery style)—used to guide CSS generation

### Critical Business Logic
- **Free tier** = Intake + scope + mood boards (no build)
- **Conversion gate** = Pricing shown AFTER mood board selection
- **Typical price** = $500–$7,500 based on complexity
- **Revenue drivers** = Number of builds (conversion rate × avg project value)

---

## For Developers: Implementation Guidance

### When Adding a New Funnel Stage
1. Add route handler in `server/routes/` (register via `registerXRoutes()`)
2. Add frontend flow in `client/src/pages/`
3. Update `builds` table schema to track progress
4. Implement state tracking: which builds are in which stage
5. Consider how stage affects pricing calculation

### When Building a Completion Feature
1. Repo analysis goes in `server/github/`
2. Return `RepoAnalysis` with tech stack, TODOs, missing features
3. Feed analysis into scope document generation
4. When building: create `buildmate-completion` branch, commit changes, create PR
5. Preserve existing code/logic—only add missing pieces

### When Implementing Brand Kits
1. Add `brandKitId` foreign key to relevant tables
2. During concept generation: if user selected existing kit, constrain colors/fonts
3. When applying styling to generated code: inject brand kit CSS variables
4. Allow users to create new kits from scratch or extract from existing project

### When Modifying Pricing
1. Update `calculateBuildPrice()` in pricing calculator
2. Remember: base differs for greenfield ($500) vs completion ($300)
3. Add per-integration costs if new integrations added
4. Consider complexity multipliers for new feature types

---

## What Still Needs Implementation

### Phase 1 (MVP—Current Focus)
- ✅ Greenfield projects from scratch
- ✅ Scope document generation
- ✅ 3 mood boards (not full mockups)
- ✅ Pricing gate + payment
- ⏳ Completion projects (repo analysis + PR creation)
- ⏳ Brand kit creation & reuse
- ⏳ Deployment target selection (Vercel, Netlify, etc.)

### Phase 2 (Post-MVP)
- Team collaboration
- Bulk pricing for agencies
- Advanced SEO optimizations
- Offline support (PWA fully implemented)
- WebAuthn/Passkeys for zero-trust auth

---

## Files Updated
- `.github/copilot-instructions.md` — Complete rewrite with freemium model, user types, key concepts

## Files That May Need Updates
- `shared/schema.ts` — Ensure `builds`, `brandKits`, `buildBrandKits` tables exist
- `server/routes/` — Routes for completion workflow, brand kit management
- `client/src/pages/` — UI for mood board selector, pricing gate
- `server/github/` — Repo analyzer, PR creator, tech stack detection
- `server/services/` — Pricing calculator, completion orchestrator

---

## Questions for Implementation

When you're ready to implement specific stages, consider these questions:

1. **Scope Document**: Should it be a PDF download, markdown preview, or both?
2. **Mood Boards**: Should inspiration images be AI-generated or curated from existing libraries?
3. **Pricing Calculations**: Are the default costs ($500 base, $50/page, etc.) accurate for your market?
4. **GitHub Integration**: Should we auto-create deployments on Vercel/Netlify, or just generate config files?
5. **Brand Kits**: Should users be able to import brand kits from DesignMate, or start from scratch?

---

## Next Steps

1. **Review this documentation** with your team
2. **Validate** that the freemium model matches your business goals
3. **Identify** which stages need implementation priority
4. **Start implementing** based on user type (founders first → agencies later)
5. **Track KPIs**: conversion rate, avg project value, time-to-build

---

Generated: October 28, 2025  
AI Agent Instructions Updated: `.github/copilot-instructions.md` (380 lines)

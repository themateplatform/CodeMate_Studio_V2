# BuildMate Studio - Freemium Model & User Funnel

## Overview

BuildMate Studio uses a **freemium conversion funnel** to acquire users at scale (free tier) and convert them to paying customers based on project complexity.

```
FREE TIER (Acquisition)
├─ Briefing Interview
├─ Scope Document
└─ 3 Mood Boards
     ↓
PRICING GATE (Conversion)
├─ Complexity Calculation
├─ Price Breakdown
└─ Stripe Checkout
     ↓
PAID TIER (Revenue)
├─ Production Build
└─ Deployment & Support
```

---

## Funnel Stages

### Stage 1: Briefing Interview (FREE)

**Goal**: Understand the user's vision, goals, target audience, and constraints.

**Questions Asked**:
- Project type: "Starting from scratch or finishing an existing project?"
  - Greenfield (new project)
  - Completion (existing GitHub repo)
- Project goals: "What's the primary goal? (generate leads, sell products, build community, etc.)"
- Target audience: "Who are your customers?"
- Revenue model: "How do you make money? (subscriptions, e-commerce, services, etc.)"
- Core features: "What's essential for launch? (auth, payments, CMS, etc.)"
- Brand preference:
  - Use DesignMate tokens (curated by Mate)
  - Import custom brand kit
  - Create new branding
- Existing GitHub repo URL (if completion project)

**Output**: User profile + intake answers stored in database

**Time**: ~2-3 minutes

**Conversion to Stage 2**: 100% (automatic)

---

### Stage 2: Research & Scope Document Generation (FREE)

**Goal**: Create a detailed scope document so user understands what will be built before paying.

#### For Greenfield Projects:
- Market/industry research
- Competitor analysis
- User journey mapping
- Technology stack recommendation (React + TS + Tailwind + Drizzle)
- Data model design
- Page/feature list
- Integration requirements
- Success metrics

#### For Completion Projects:
- Repo cloning & analysis
- Tech stack detection
- TODO scanning (extract `// TODO:` comments)
- Incomplete feature detection
- Missing infrastructure assessment (CI/CD, testing, SEO, etc.)
- Completion roadmap
- Recommendations for improvements

**Output**: Detailed, human-readable scope document in markdown

**Time**: ~5 minutes (automated generation)

**User Action**: Review scope and either:
- ✅ Approve → Move to Stage 3
- ↩️ Request revisions → Re-generate with feedback

**Conversion to Stage 3**: ~75% (some users refine scope, some abandon)

---

### Stage 3: Concept/Mood Board Selection (FREE)

**Goal**: Let user pick their visual direction before committing to payment.

**What We Generate**: 3 distinct mood boards with:
- Inspiration images (6-8 curated or AI-generated images)
- Color palette (primary, secondary, accent, background, text)
- Typography (heading & body fonts with samples)
- Style notes (spacing, corners, contrast, imagery style)
- Small component previews (button, card, input examples)

**Important**: These are NOT full-page mockups—just visual atmosphere and direction.

**User Action**: Select one of 3 mood boards that resonates with their vision

**Constraints**:
- If user selected a brand kit in Stage 1, all 3 mood boards use that kit's colors/fonts
- Variations are in layout approach and imagery style only
- Ensures multi-project customers maintain brand consistency

**Output**: Selected concept ID + design tokens (CSS variables, Tailwind config)

**Time**: ~3 minutes (user decision)

**Conversion to Stage 4**: ~85% (most users reach this point, many select a direction)

---

### Stage 4: Pricing & Payment (CONVERSION GATE) 🎯

**Goal**: Show transparent pricing, collect payment, and lock in the build commitment.

#### Pricing Calculation

```
Base Price:
  Greenfield: $500
  Completion: $300

Per-Page Cost:
  +$50 per page (max 40 pages before custom quote)

Integration Add-Ons:
  Authentication: +$200
  Payments (Stripe): +$300
  CMS (Contentful/Strapi): +$250
  Email/Notifications: +$100
  Search (Algolia): +$300
  Analytics: +$50
  Forms/Webhooks: +$100
  API Development: +$400

Complexity Multipliers:
  Custom features/logic: +30%
  Performance optimization: +20%
  Compliance (GDPR/HIPAA): +30%
  Advanced testing: +20%

Final Price = (Base + Pages + Integrations) × Complexity Multiplier
```

#### Example Calculations

**Example 1: Simple Landing Page (Greenfield)**
- Base: $500
- 3 pages: 3 × $50 = $150
- Forms: +$100
- Analytics: +$50
- Subtotal: $800
- Multiplier: 1.0 (no custom features)
- **Final: $800**

**Example 2: Mid-Tier SaaS (Greenfield)**
- Base: $500
- 12 pages: 12 × $50 = $600
- Auth: +$200
- Payments: +$300
- Analytics: +$50
- Subtotal: $1,650
- Multiplier: 1.3 (custom features)
- **Final: $2,145**

**Example 3: Completing Existing Repo (Completion)**
- Base: $300
- 5 additional pages: 5 × $50 = $250
- Auth completion: +$200
- SEO setup: +$50 (standard)
- Subtotal: $800
- Multiplier: 1.0 (straightforward completion)
- **Final: $800**

**Example 4: Complex E-Commerce (Greenfield)**
- Base: $500
- 20 pages: 20 × $50 = $1,000
- Auth: +$200
- Payments: +$300
- CMS: +$250
- Search: +$300
- Analytics: +$50
- Forms: +$100
- Subtotal: $2,700
- Multiplier: 1.5 (complex: custom inventory, GDPR compliance, performance optimization)
- **Final: $4,050**

#### Pricing UI

User sees:
1. **Itemized breakdown** (base + pages + integrations)
2. **Complexity explanation** (why multiplier applied)
3. **Total price in dollars**
4. **What's included** (production build, SEO, accessibility, 30-day support)
5. **Money-back guarantee** ("If we don't deliver what's scoped, full refund")
6. **Stripe checkout button**

#### Payment Processing

- Stripe Checkout integration
- Records `stripePaymentIntentId` in builds table
- Marks `paidAt` timestamp when payment succeeds
- Triggers build stage automatically

**Conversion to Stage 5**: ~50% (this is the critical gate—rough half pay)

---

### Stage 5: Production Build (PAID)

#### Greenfield Build Flow
1. Scaffold new React + TypeScript + Tailwind project
2. Generate all pages/components based on scope
3. Set up routing (wouter)
4. Create API routes and database schema (Drizzle)
5. Apply selected mood board styling (CSS variables, Tailwind theme)
6. Integrate with Mate Platform services:
   - DesignMate tokens
   - Copywriter for marketing copy
   - SEO agent for meta tags/sitemap
   - Image generator for hero images
7. Add integrations (auth, payments, CMS, etc.)
8. Run validation checks (accessibility, performance, security)
9. Package for deployment

**Duration**: ~15 minutes (fully automated)

#### Completion Build Flow
1. Clone existing GitHub repository
2. Create `buildmate-completion` branch
3. Install/update dependencies
4. Implement missing features from scope
5. Resolve all TODOs
6. Add missing infrastructure (CI/CD, testing, SEO, etc.)
7. Apply brand kit / mood board styling
8. Update documentation
9. Run tests
10. Create PR to original repo with detailed summary
11. User reviews PR, merges when satisfied

**Duration**: ~20 minutes (fully automated)

**Output**: 
- Complete project repository
- Preview deployment (auto-deployed to staging)
- Production deployment config
- README + documentation

---

### Stage 6: Deployment (PAID)

**User Selects Deployment Target**:
- **Vercel** (recommended for Next.js, automatic previews)
- **Netlify** (great for static sites, easy custom domain)
- **Cloudflare Pages** (fast CDN, unlimited bandwidth)
- **AWS Amplify** (enterprise-grade, AWS integration)
- **Self-hosted** (Docker config provided, user deploys)

**Auto-Setup**:
1. Create deployment config files (vercel.json, netlify.toml, etc.)
2. Connect GitHub OAuth (if needed)
3. Deploy preview environment (staging)
4. Provide production deployment instructions
5. Configure environment variables
6. Set up CI/CD pipeline (GitHub Actions)

**Outputs**:
- Preview URL (shared with user for review)
- Production URL (user's custom domain or provided)
- Deployment documentation

---

## User Types & Conversion Paths

### 1. Non-Technical Founder
```
Stage 1: 2 min (fill form)
  ↓ 100%
Stage 2: 5 min (read scope)
  ↓ ~70% (may request changes)
Stage 3: 3 min (pick mood board)
  ↓ ~85%
Stage 4: 2 min (see price, pay)
  ↓ ~45% CONVERSION
Stage 5: 15 min (build runs)
  ↓ 100%
Stage 6: 5 min (deploy choice)
  ↓ 100%
RESULT: Production-ready site in <1 hour
```

### 2. Developer (Completion Project)
```
Stage 1: 3 min (answer questions)
  ↓ 100%
Stage 2: 5 min (review repo analysis)
  ↓ ~75% (may request scope revisions)
Stage 3: 2 min (select mood board)
  ↓ ~90%
Stage 4: 2 min (see price, pay)
  ↓ ~60% CONVERSION (developers more confident)
Stage 5: 20 min (build runs)
  ↓ 100%
Stage 6: 3 min (review & merge PR)
  ↓ 100%
RESULT: Completed repo + PR in <1 hour
```

### 3. Agency (Multi-Project)
```
FIRST PROJECT: Same as founder, ~45% conversion
SECOND+ PROJECTS: ~75% conversion (familiar, trust proven)
Brand kit reuse: Saves time, ensures consistency
LIFETIME VALUE: High (multiple projects)
```

---

## KPIs & Metrics

### Acquisition KPIs
- **Stage 1 → Stage 2**: ~100% (automatic)
- **Stage 2 → Stage 3**: ~75% (scope approval rate)
- **Stage 3 → Stage 4**: ~85% (mood board selection rate)
- **Stage 4 → Stage 5**: ~50% (payment conversion rate) ⭐ Critical
- **Avg time in funnel**: <1 hour per project

### Revenue KPIs
- **Avg project value**: Calculated from pricing model
- **Total revenue = Conversion Rate × Avg Project Value × Projects/Month**
- **Typical ranges**:
  - Low: 30% × $1,000 × 10/month = $3,000/month
  - Medium: 40% × $2,000 × 20/month = $16,000/month
  - High: 50% × $2,500 × 50/month = $62,500/month

### Engagement KPIs
- **Completion ratio**: (Greenfield vs Completion projects)
- **Brand kit adoption**: % of agencies creating reusable brand kits
- **Multi-project customers**: % who build 2+ projects
- **Repeat purchase rate**: Among paying customers
- **NPS score**: Post-project satisfaction

### Build Quality KPIs
- **First-time success rate**: % of builds passing validation
- **User revision rate**: % of users requesting scope changes
- **Deployment success rate**: % of projects live without issues
- **Support requests**: Post-launch issues requiring fixes

---

## Brand Kit System (Multi-Project Consistency)

### Problem It Solves
Agencies building multiple sites want consistent branding without re-specifying colors/fonts each time.

### Solution
1. **Create once**: Define colors, fonts, logo, guidelines
2. **Reuse freely**: Select existing kit when starting new project
3. **Guaranteed consistency**: All projects use the same brand elements
4. **Fast turnaround**: Skips brand research for subsequent projects

### Implementation
- Users can create unlimited brand kits
- When starting new project, select existing kit or create new
- Pricing benefits: Second+ projects slightly cheaper (no design research time)
- Mood boards vary layout/imagery, never brand elements (if kit selected)

---

## Free Tier Strategy

### Why Free Tiers Work
- **Low barrier to entry**: No credit card required
- **Builds trust**: User sees quality before paying
- **Captures intent**: Scope + mood boards prove value
- **Reduces decision anxiety**: Price shown after commitment to direction

### Monetization Points
1. **Freemium funnel**: Biggest acquisition channel
2. **Free tier ceiling**: Reach Stage 4 (pricing) but can't build
3. **Upsell logic**: "You're 30 seconds from a production site—just $X"
4. **Repeat purchases**: Agencies building multiple projects

### Protecting Free Resources
- Scope generation: Rate-limited to 5/day per user
- Mood boards: Re-generated for free once, then $20 to refresh
- Preview deployments: 24-hour expiry unless paid

---

## Payment & Fulfillment

### Payment Flow
1. User sees itemized pricing
2. Clicks "Start Build"
3. Stripe checkout opens
4. User enters card details (Stripe handles PCI)
5. Payment processed
6. `paidAt` timestamp recorded
7. Build immediately starts
8. Build status page shows real-time progress

### Receipts & Invoices
- Email receipt sent after payment
- Invoice available in user dashboard
- Breakdown shows exactly what was built

### Refund Policy
- **Within 30 days**: Full refund if not satisfied + proof of effort
- **After 30 days**: Partial refund up to support cost
- **Never**: If deployed to production and generating revenue

---

## Success Metrics for Each User Type

### Founder Success
- ✅ Site launched to custom domain
- ✅ Can modify code themselves
- ✅ Integrated with analytics
- ✅ All planned features implemented

### Developer Success
- ✅ PR merged to original repo
- ✅ No breaking changes to existing logic
- ✅ All TODOs resolved
- ✅ CI/CD working

### Agency Success
- ✅ 5+ projects built with consistent branding
- ✅ Clients satisfied (NPS > 50)
- ✅ Reused brand kit on 100% of projects
- ✅ Portfolio sites live and generating leads

---

## Next: Implementation Priorities

1. **MVP (Now)**: Greenfield projects + pricing gate
2. **Phase 2**: Completion projects + repo analysis
3. **Phase 3**: Brand kits + multi-project management
4. **Phase 4**: Team collaboration + bulk pricing
5. **Phase 5**: Advanced analytics + custom templates

---

For implementation details, see:
- [Getting Started](./getting-started.md) - Setup & dev environment
- [AI Agent Instructions](../.github/copilot-instructions.md) - For developers extending BuildMate
- [Architecture](./ARCHITECTURE.md) - Technical design

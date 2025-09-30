# Documentation Navigation Guide

This guide helps you find the right documentation for your needs.

## 🎯 Start Here Based on Your Role

### 👨‍💻 I'm a Developer

**Getting Started:**
1. [GETTING-STARTED.md](./GETTING-STARTED.md) - Complete onboarding guide
2. [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Commands and shortcuts
3. [CONTRIBUTING.md](../CONTRIBUTING.md) - How to contribute

**Understanding the System:**
1. [UPLIFT-PLAN.md](./UPLIFT-PLAN.md) - Master transformation plan
2. [AUDIT-FINDINGS.md](./AUDIT-FINDINGS.md) - Technical architecture
3. Phase-specific docs (PHASE-*.md) - Implementation details

**Implementing Features:**
1. Work tickets in `/TICKETS` - Detailed tasks
2. Phase documentation - Step-by-step guides
3. [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - Deployment instructions

### 👔 I'm a Project Manager

**Understanding Progress:**
1. [CHANGELOG-Agent.md](./CHANGELOG-Agent.md) - What's been completed
2. [UPLIFT-PLAN.md](./UPLIFT-PLAN.md) - Overall roadmap and status
3. [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Phase summary table

**Planning & Risk:**
1. [RISKS.md](./RISKS.md) - Risk assessment and mitigation
2. Phase-specific risk sections - Detailed risk analysis
3. [AUDIT-FINDINGS.md](./AUDIT-FINDINGS.md) - Technical complexity

**Approvals & Gates:**
1. Phase documentation - Deliverables checklists
2. Rollback sections - Contingency plans
3. Dependencies - Phase ordering

### 🧪 I'm a QA/Tester

**What to Test:**
1. Phase deliverables checklists - Features to verify
2. [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - Deployment verification
3. Phase-specific testing sections - Test strategies

**How to Test:**
1. [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Test commands
2. Health check endpoints - Monitoring
3. Phase documentation - Feature descriptions

### 🎨 I'm a Designer/Product

**Understanding Features:**
1. [UPLIFT-PLAN.md](./UPLIFT-PLAN.md) - Transformation goals
2. Phase documentation - User-facing features
3. [GETTING-STARTED.md](./GETTING-STARTED.md) - Feature overview

**Mobile & PWA:**
1. [PHASE-6-PWA.md](./PHASE-6-PWA.md) - PWA capabilities
2. Phase 7 section in UPLIFT-PLAN.md - Mobile plans
3. Phase 8 section - Store compliance

### 🔧 I'm DevOps/Infrastructure

**Deployment:**
1. [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - Complete guide
2. [PHASE-5-DEPLOYMENTS.md](./PHASE-5-DEPLOYMENTS.md) - Implementation
3. `/scripts/deploy.sh` - Automation script

**CI/CD:**
1. [PHASE-4-CI.md](./PHASE-4-CI.md) - CI/CD implementation
2. `.github/workflows/` - GitHub Actions
3. [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Commands

**Security:**
1. [PHASE-3-SECRETS.md](./PHASE-3-SECRETS.md) - Secret management
2. [RISKS.md](./RISKS.md) - Security considerations
3. Supabase RLS policies in `/supabase/sql`

### 👤 I'm a User/Stakeholder

**What's Available:**
1. [GETTING-STARTED.md](./GETTING-STARTED.md) - Overview and status
2. [CHANGELOG-Agent.md](./CHANGELOG-Agent.md) - Completed features
3. [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Summary table

**What's Coming:**
1. [UPLIFT-PLAN.md](./UPLIFT-PLAN.md) - Future phases
2. Remaining phases table - Timeline estimates
3. Phase documentation - Detailed plans

---

## 📂 Documentation by Topic

### Architecture & Design

```
1. System Overview
   └─ AUDIT-FINDINGS.md → Current Stack Assessment

2. Database & Backend
   └─ TICKETS/T001-SUPABASE-MIGRATION.md → Supabase setup
   └─ /supabase/sql → Database schema

3. Frontend Architecture
   └─ PHASE-6-PWA.md → Progressive Web App
   └─ /client → React application

4. Infrastructure
   └─ PHASE-5-DEPLOYMENTS.md → Deployment types
   └─ DEPLOYMENT-GUIDE.md → Operations guide
```

### Security & Compliance

```
1. Secret Management
   └─ PHASE-3-SECRETS.md → Edge function broker
   └─ RISKS.md → Security risks

2. Authentication
   └─ TICKETS/T001-SUPABASE-MIGRATION.md → Auth migration
   └─ /supabase/sql → RLS policies

3. Store Compliance (Coming)
   └─ UPLIFT-PLAN.md → Phase 8 details
   └─ Future: Store-readiness wizard

4. Enterprise Security (Coming)
   └─ UPLIFT-PLAN.md → Phase 12 details
   └─ Future: RBAC, SSO, Audit logs
```

### Development & Testing

```
1. Getting Started
   └─ GETTING-STARTED.md → Complete guide
   └─ QUICK-REFERENCE.md → Quick commands

2. CI/CD Pipeline
   └─ PHASE-4-CI.md → Implementation guide
   └─ .github/workflows/ → GitHub Actions
   └─ .commitlintrc.js → Commit conventions

3. Testing Strategy
   └─ Phase documentation → Test sections
   └─ /vitest.config.ts → Test configuration

4. Contributing
   └─ CONTRIBUTING.md → Contribution guidelines
   └─ PHASE-4-CI.md → Git workflow
```

### Deployment & Operations

```
1. Deployment Options
   └─ DEPLOYMENT-GUIDE.md → Complete guide
   └─ PHASE-5-DEPLOYMENTS.md → Implementation
   └─ /scripts/deploy.sh → Automation

2. Health & Monitoring
   └─ PHASE-5-DEPLOYMENTS.md → Health endpoints
   └─ Future: PHASE-11 → Observability

3. Troubleshooting
   └─ DEPLOYMENT-GUIDE.md → Common issues
   └─ QUICK-REFERENCE.md → Common problems

4. Rollback Procedures
   └─ Phase documentation → Rollback sections
   └─ RISKS.md → Risk mitigation
```

### Mobile Development (Phase 7+)

```
1. Mobile Strategy
   └─ UPLIFT-PLAN.md → Phase 7 overview
   └─ Future: PHASE-7-MOBILE.md

2. Store Submission
   └─ UPLIFT-PLAN.md → Phase 8 overview
   └─ Future: PHASE-8-COMPLIANCE.md

3. Prerequisites
   └─ GETTING-STARTED.md → Requirements
   └─ UPLIFT-PLAN.md → Dependencies
```

### Advanced Features (Phase 9-12)

```
1. AI Workflows
   └─ UPLIFT-PLAN.md → Phase 9 details
   └─ Future: In-app planner

2. Templates
   └─ UPLIFT-PLAN.md → Phase 10 details
   └─ Future: Template system

3. Observability
   └─ UPLIFT-PLAN.md → Phase 11 details
   └─ Future: Monitoring & SLOs

4. Enterprise Features
   └─ UPLIFT-PLAN.md → Phase 12 details
   └─ Future: RBAC, SSO, Audit
```

---

## 🔍 Finding Specific Information

### "How do I...?"

| Question | Document | Section |
|----------|----------|---------|
| **Get started?** | GETTING-STARTED.md | Quick Start |
| **Understand the plan?** | UPLIFT-PLAN.md | Overview |
| **Deploy to production?** | DEPLOYMENT-GUIDE.md | Deployment Types |
| **Run tests?** | QUICK-REFERENCE.md | Testing |
| **Manage secrets?** | PHASE-3-SECRETS.md | Implementation |
| **Set up CI/CD?** | PHASE-4-CI.md | GitHub Actions |
| **Make PWA work?** | PHASE-6-PWA.md | Service Worker |
| **Build mobile app?** | UPLIFT-PLAN.md | Phase 7 |
| **Rollback changes?** | Phase docs | Rollback section |
| **Understand risks?** | RISKS.md | Risk Assessment |

### "What is...?"

| Concept | Document | Section |
|---------|----------|---------|
| **The uplift plan?** | UPLIFT-PLAN.md | Overview |
| **Current status?** | CHANGELOG-Agent.md | Actions Log |
| **Phase system?** | GETTING-STARTED.md | Phase Guide |
| **Tech stack?** | AUDIT-FINDINGS.md | Current Stack |
| **Deployment types?** | DEPLOYMENT-GUIDE.md | Deployment Types |
| **RLS policies?** | TICKETS/T001-... | Supabase Migration |
| **Secret broker?** | PHASE-3-SECRETS.md | Architecture |
| **PWA features?** | PHASE-6-PWA.md | Implementation |
| **Risk levels?** | RISKS.md | Risk Framework |
| **Success metrics?** | AUDIT-FINDINGS.md | Success Metrics |

### "When will...?"

| Feature | Document | Info |
|---------|----------|------|
| **Mobile apps?** | UPLIFT-PLAN.md | Phase 7 (next) |
| **Store submission?** | UPLIFT-PLAN.md | Phase 8 |
| **AI workflows?** | UPLIFT-PLAN.md | Phase 9 |
| **Templates?** | UPLIFT-PLAN.md | Phase 10 |
| **Monitoring?** | UPLIFT-PLAN.md | Phase 11 |
| **Enterprise features?** | UPLIFT-PLAN.md | Phase 12 |

---

## 📋 Documentation Checklist

Use this to verify you have the information you need:

### Starting Development
- [ ] Read GETTING-STARTED.md
- [ ] Review QUICK-REFERENCE.md
- [ ] Check current branch in CHANGELOG-Agent.md
- [ ] Read relevant phase documentation
- [ ] Review CONTRIBUTING.md

### Implementing a Phase
- [ ] Read phase overview in UPLIFT-PLAN.md
- [ ] Review phase-specific PHASE-N-*.md document
- [ ] Check work tickets in /TICKETS
- [ ] Understand dependencies and risks
- [ ] Review rollback procedures

### Deploying to Production
- [ ] Read DEPLOYMENT-GUIDE.md
- [ ] Review PHASE-5-DEPLOYMENTS.md
- [ ] Check health endpoints work
- [ ] Verify environment variables
- [ ] Test rollback procedures

### Code Review
- [ ] Verify deliverables from phase docs
- [ ] Check tests are passing
- [ ] Review security implications (RISKS.md)
- [ ] Validate rollback instructions
- [ ] Confirm documentation is updated

---

## 🗺️ Reading Order Recommendations

### For First-Time Users
1. **GETTING-STARTED.md** - Complete overview (30 min)
2. **QUICK-REFERENCE.md** - Essential commands (5 min)
3. **UPLIFT-PLAN.md** - Understand the roadmap (20 min)
4. **CHANGELOG-Agent.md** - See what's done (10 min)

### For Developers Joining
1. **GETTING-STARTED.md** → Setup (10 min)
2. **QUICK-REFERENCE.md** → Commands (5 min)
3. **AUDIT-FINDINGS.md** → Architecture (15 min)
4. **CONTRIBUTING.md** → Workflow (10 min)
5. Current phase documentation → Context (20 min)

### For Phase Implementation
1. **UPLIFT-PLAN.md** → Phase overview (5 min)
2. **PHASE-N-*.md** → Detailed guide (30 min)
3. **TICKETS/** → Work items (20 min)
4. **RISKS.md** → Risk assessment (10 min)
5. Related code → Understand existing patterns (variable)

### For Deployment
1. **DEPLOYMENT-GUIDE.md** → Complete guide (30 min)
2. **PHASE-5-DEPLOYMENTS.md** → Implementation (20 min)
3. **QUICK-REFERENCE.md** → Commands (5 min)
4. Health endpoints → Verification (5 min)

---

## 💡 Tips for Effective Documentation Use

### 1. Use Search
```bash
# Find all references to a topic
grep -r "supabase" docs/
grep -r "deployment" docs/
grep -r "Phase 7" docs/
```

### 2. Check Dates
- Most recent updates in CHANGELOG-Agent.md
- Phase completion dates show progress
- "Last Updated" at bottom of docs

### 3. Follow Links
- Documentation is cross-referenced
- Related sections link to each other
- External links for tools and services

### 4. Read Incrementally
- Start with summaries (QUICK-REFERENCE)
- Dive deeper as needed (detailed guides)
- Review code for implementation details

### 5. Keep Notes
- Track your questions as you read
- Note dependencies for your work
- Document any gaps you find

---

## 🔄 Documentation Maintenance

### Keeping Current
- **CHANGELOG-Agent.md** updated after each phase
- **Phase docs** created as phases complete
- **UPLIFT-PLAN.md** shows current progress
- **QUICK-REFERENCE.md** reflects current state

### Contributing
- Update docs with your changes
- Add to CHANGELOG-Agent.md
- Create phase docs for new phases
- Keep QUICK-REFERENCE.md current

### Review Cycle
- Docs reviewed with code PRs
- Phase completion updates documentation
- Major changes trigger doc updates
- Quarterly documentation audits

---

## 📞 Still Can't Find It?

1. **Search the repo**: Use GitHub's search or `grep`
2. **Check Issues**: Someone may have asked before
3. **Review PRs**: Recent changes may have context
4. **Ask the team**: Open a discussion or issue
5. **Update this guide**: Add what you learned!

---

**Navigation Guide Version**: 1.0  
**Last Updated**: 2025-09-30  
**Maintained By**: CodeMate Team

*This guide evolves with the project. Suggest improvements via PR.*

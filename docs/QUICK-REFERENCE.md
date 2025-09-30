# Quick Reference Guide

One-page reference for CodeMate Studio Uplift.

## 🎯 Current Status

**Progress**: 58% Complete (7/12 phases)  
**Current Phase**: Phase 6 ✅ Complete  
**Next Phase**: Phase 7 - Mobile Capability 🚧

---

## 📚 Essential Documentation

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[GETTING-STARTED.md](./GETTING-STARTED.md)** | Comprehensive guide | Start here |
| **[UPLIFT-PLAN.md](./UPLIFT-PLAN.md)** | Master plan (all phases) | Understanding roadmap |
| **[AUDIT-FINDINGS.md](./AUDIT-FINDINGS.md)** | Technical analysis | Architecture decisions |
| **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)** | How to deploy | Deploying to production |
| **[CHANGELOG-Agent.md](./CHANGELOG-Agent.md)** | What's been done | Tracking progress |

---

## ⚡ Quick Commands

### Development
```bash
npm install              # Install dependencies
npm run dev              # Start dev server (http://localhost:5000)
npm run build            # Build for production
```

### Testing
```bash
npm run check            # Type checking
npm run test             # Run unit tests
npm run lint             # Lint code
```

### Deployment
```bash
./scripts/deploy.sh autoscale    # Deploy autoscale (recommended)
./scripts/deploy.sh static       # Deploy static frontend
./scripts/deploy.sh scheduled    # Deploy cron jobs
./scripts/deploy.sh enterprise   # Deploy always-on
```

### Health Checks
```bash
curl http://localhost:5000/health      # Local health check
curl http://localhost:5000/ready       # Ready check
```

---

## 📋 Phase Summary

| # | Phase | Status | Risk | Key Features |
|---|-------|--------|------|--------------|
| 0 | Guardrails & Scoping | ✅ | 🟢 | Documentation structure |
| 1 | Repo & Infra Audit | ✅ | 🟢 | Technical analysis |
| 2 | Supabase Baseplate | ✅ | 🟡 | Database + Auth + RLS |
| 3 | Edge Function Secrets | ✅ | 🟡 | Secure API key management |
| 4 | GitHub 2-Way Sync + CI | ✅ | 🟡 | CI/CD pipeline |
| 5 | Replit Deployments | ✅ | 🟡 | Multi-deployment support |
| 6 | PWA Hardening | ✅ | 🟢 | Offline capabilities |
| 7 | Mobile Capability | 🚧 | 🔴 | Capacitor + Expo |
| 8 | Store-Readiness Wizard | ⏳ | 🟡 | App Store compliance |
| 9 | In-App Planner | ⏳ | 🔴 | AI code generation |
| 10 | Templates & Starters | ⏳ | 🟡 | One-click templates |
| 11 | Observability & SLOs | ⏳ | 🟡 | Monitoring & logging |
| 12 | Enterprise Toggles | ⏳ | 🔴 | RBAC + SSO + Audit |

**Legend**: ✅ Complete | 🚧 In Progress | ⏳ Pending | 🟢 Low Risk | 🟡 Medium Risk | 🔴 High Risk

---

## 🔑 Key Concepts

### Phase System
- **Isolated**: Each phase in separate branch
- **Independent**: Phases can merge individually  
- **Reversible**: Rollback instructions included
- **Gated**: Manual approval between phases

### Risk Levels
- 🟢 **Low**: Documentation, enhancements
- 🟡 **Medium**: Infrastructure, integrations
- 🔴 **High**: New platforms, code generation

### Deployment Types
- **Autoscale**: Web apps with auto-scaling (0-10 instances)
- **Static**: Frontend-only with CDN
- **Scheduled**: Cron jobs and background tasks
- **Reserved VM**: Always-on for high traffic

---

## 🚀 Common Workflows

### Starting Development
```bash
git clone https://github.com/themateplatform/fertile-ground-base.git
cd fertile-ground-base
npm install
cp .env.example .env  # Configure your secrets
npm run dev
```

### Creating a New Phase
```bash
git checkout main
git pull origin main
git checkout -b agent/phase-N-name
# Make changes
git add .
git commit -m "feat(phase-N): description"
git push origin agent/phase-N-name
# Open PR with phase deliverables checklist
```

### Running CI Locally
```bash
npm run check     # Type checking (matches CI)
npm run test      # Unit tests (matches CI)
npm run lint      # Linting (matches CI)
npm run build     # Build verification (matches CI)
```

### Deploying to Production
```bash
# Test deployment config
./scripts/deploy.sh autoscale --dry-run

# Deploy to production
./scripts/deploy.sh autoscale

# Verify deployment
curl https://your-app.replit.app/health
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Vite + React 18 + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query (React Query)
- **Routing**: Wouter

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **Auth**: Supabase Auth

### Infrastructure
- **Deployment**: Replit (Autoscale, Static, Scheduled, Reserved VM)
- **CI/CD**: GitHub Actions
- **Secrets**: Supabase Edge Functions
- **PWA**: Service Workers + Web Manifests

### Future (Phases 7-12)
- **Mobile**: Capacitor + Expo
- **Monitoring**: Structured logging + Error tracking
- **Enterprise**: RBAC + SSO + Audit logs

---

## 🔐 Environment Variables

### Required
```bash
# Supabase (Phase 2)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE=eyJxxx...

# OpenAI (for AI features)
OPENAI_API_KEY=sk-xxx...

# Database (if not using Supabase)
DATABASE_URL=postgresql://xxx
```

### Optional
```bash
# GitHub Integration
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_WEBHOOK_SECRET=xxx

# Replit
REPL_SLUG=your-repl-name
REPL_OWNER=your-username
```

---

## 📞 Getting Help

### Where to Look
1. **Documentation**: Check `docs/` folder for phase-specific guides
2. **Changelog**: Review `CHANGELOG-Agent.md` for completed work
3. **Issues**: Search GitHub Issues for similar problems
4. **Code**: Check inline comments and type definitions

### Common Issues

**"Supabase connection failed"**
→ Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`

**"Build fails with type errors"**
→ Run `npm run check` to see detailed errors

**"Tests failing"**
→ Ensure database is running and migrations applied

**"Deployment script fails"**
→ Check Replit secrets are configured (not just .env)

**"PWA not installing"**
→ Must be HTTPS and pass PWA criteria (Phase 6)

---

## 📊 Success Metrics

### Technical KPIs
- ✅ Build Time: < 30 seconds
- ✅ Test Coverage: > 80%
- ✅ Lighthouse Score: > 90 (PWA)
- ✅ Bundle Size: < 1MB gzipped

### User Experience
- ✅ Load Time: < 2 seconds
- ✅ Offline Support: Core features available
- ⏳ Mobile Performance: Native-like (Phase 7)

### Enterprise Readiness
- ⏳ Uptime: 99.9% SLA (Phase 11)
- ⏳ Security: SOC 2 ready (Phase 12)
- ✅ Scale: Multi-tenant architecture

---

## 🎯 Next Actions

### For Developers
1. Review `docs/UPLIFT-PLAN.md` Phase 7 section
2. Set up mobile development tools (Xcode, Android Studio)
3. Create branch: `agent/phase-7-mobile`
4. Implement Capacitor wrapper
5. Test on iOS and Android

### For Reviewers
1. Verify Phase 6 deliverables in production
2. Test PWA installation and offline features
3. Review Phase 7 risk assessment
4. Prepare approval for Phase 7 kickoff

### For Users
1. Try the PWA (Phase 6) - install to home screen
2. Test offline capabilities
3. Provide feedback on user experience
4. Report any issues via GitHub

---

## 🔗 Important Links

- **Repository**: https://github.com/themateplatform/fertile-ground-base
- **Documentation**: `/docs` folder
- **CI/CD**: `.github/workflows/`
- **Deployment**: `./scripts/deploy.sh`
- **Supabase**: `/supabase` folder

---

**Last Updated**: 2025-09-30  
**Version**: Phase 6 Complete  
**Next Milestone**: Phase 7 - Mobile Apps

*For detailed information, see [GETTING-STARTED.md](./GETTING-STARTED.md)*

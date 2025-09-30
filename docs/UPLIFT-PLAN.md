# CodeMate Uplift Plan - Production Transformation

## Overview
Transform CodeMate Studio from current visual-focused platform to comprehensive enterprise-ready AI-powered app builder with Darvin-level capabilities while maintaining zero-risk deployment practices.

## Transformation Goals
- **Mobile Support**: Native apps via Capacitor + Expo
- **Store Compliance**: Automated wizard for Play Store & App Store
- **Advanced Workflows**: In-app agentic planning and execution
- **Enterprise Features**: RBAC, SSO, audit logging
- **Template System**: Data-first starters with one-click deployment
- **Production Hardening**: PWA, observability, SLOs

---

## Phase Execution Plan

### Phase 0: Guardrails & Scoping ⏳
**Branch**: `agent/phase-0-guardrails`  
**Risk Level**: 🟢 Minimal (Documentation Only)  
**Deliverables**:
- [ ] Documentation structure (`/docs`)
- [ ] Operating rules and gate system
- [ ] Skeleton uplift plan
- [ ] Risk assessment framework

**Rollback**: No code changes - simple branch deletion

---

### Phase 1: Repo & Infra Audit → Detailed Plan
**Branch**: `agent/phase-1-audit`  
**Risk Level**: 🟢 Minimal (Analysis Only)  
**Dependencies**: Phase 0 approved  
**Deliverables**:
- [ ] Code, dependencies, build analysis
- [ ] Detailed implementation plan
- [ ] Individual work tickets (`/docs/TICKETS/*.md`)
- [ ] Risk assessment (`/docs/RISKS.md`)

**Rollback**: Documentation removal only

---

### Phase 2: Supabase Baseplate (DB/Auth/RLS/Migrations)
**Branch**: `agent/phase-2-supabase`  
**Risk Level**: 🟡 Medium (Database Migration)  
**Dependencies**: Phase 1 approved  
**Deliverables**:
- [ ] Supabase client integration
- [ ] Profiles table with RLS policies
- [ ] Migration system (`/supabase/migrations`)
- [ ] Auth UI (email/password + guarded routes)
- [ ] Profile management screen

**Rollback**: Revert Supabase config, restore in-memory storage

---

### Phase 3: Edge Function Secret Broker
**Branch**: `agent/phase-3-secrets`  
**Risk Level**: 🟡 Medium (Security Critical)  
**Dependencies**: Phase 2 approved  
**Deliverables**:
- [ ] Supabase Edge Function for provider tokens
- [ ] CORS + preflight handling
- [ ] Client wrapper utilities
- [ ] Replit→Supabase secrets sync script

**Rollback**: Remove edge functions, restore direct API calls

---

### Phase 4: GitHub 2-Way Sync + CI
**Branch**: `agent/phase-4-ci`  
**Risk Level**: 🟡 Medium (CI/CD Changes)  
**Dependencies**: Phase 3 approved  
**Deliverables**:
- [ ] GitHub Actions workflow
- [ ] Conventional commits + Changesets
- [ ] Main branch protection (manual setup required)
- [ ] Automated testing pipeline

**Rollback**: Remove GitHub Actions, restore manual deployment

---

### Phase 5: Replit Deployments (Web, Static, Scheduled, Worker)
**Branch**: `agent/phase-5-deployments`  
**Risk Level**: 🟡 Medium (Infrastructure)  
**Dependencies**: Phase 4 approved  
**Deliverables**:
- [ ] Autoscale Web Service configuration
- [ ] Static deployment for marketing
- [ ] Scheduled job for housekeeping
- [ ] Worker service for long tasks
- [ ] Health checks and metrics endpoints

**Rollback**: Remove deployment configs, restore single-service setup

---

### Phase 6: PWA Hardening
**Branch**: `agent/phase-6-pwa`  
**Risk Level**: 🟢 Low (Enhancement)  
**Dependencies**: Phase 5 approved  
**Deliverables**:
- [ ] PWA manifest with icons
- [ ] Service worker for offline capability
- [ ] Lighthouse CI gates (PWA score ≥ 90)
- [ ] Installation prompts

**Rollback**: Remove service worker and manifest

---

### Phase 7: Mobile Capability (Dual Track)
**Branch**: `agent/phase-7-mobile`  
**Risk Level**: 🔴 High (New Platform)  
**Dependencies**: Phase 6 approved  
**Deliverables**:
- [ ] **Track A**: Capacitor wrapper with keystore
- [ ] **Track B**: Expo React Native app (`/mobile`)
- [ ] EAS build profiles (dev/preview/prod)
- [ ] CI integration for mobile builds

**Rollback**: Remove mobile directories and configurations

---

### Phase 8: Store-Readiness Wizard (Play & App Store)
**Branch**: `agent/phase-8-compliance`  
**Risk Level**: 🟡 Medium (Compliance)  
**Dependencies**: Phase 7 approved  
**Deliverables**:
- [ ] Admin compliance wizard (`/admin/compliance`)
- [ ] Privacy policy and app access setup
- [ ] Store listing asset management
- [ ] IARC content rating integration
- [ ] Submission pack export

**Rollback**: Remove compliance admin panel

---

### Phase 9: In-App "Plan → Preview → Apply" Workflow
**Branch**: `agent/phase-9-planner`  
**Risk Level**: 🔴 High (Code Generation)  
**Dependencies**: Phase 8 approved  
**Deliverables**:
- [ ] Natural language change planner
- [ ] Diff preview interface
- [ ] Automated PR generation with tests
- [ ] Human-readable remediation

**Rollback**: Remove agentic planning features

---

### Phase 10: Templates & Data-First Starters
**Branch**: `agent/phase-10-templates`  
**Risk Level**: 🟡 Medium (Database Templates)  
**Dependencies**: Phase 9 approved  
**Deliverables**:
- [ ] Auth + Profiles + CRUD template
- [ ] Support Desk template
- [ ] Content App template
- [ ] One-click template deployment
- [ ] Schema SQL and RLS policies

**Rollback**: Remove template system and presets

---

### Phase 11: Observability & SLOs
**Branch**: `agent/phase-11-obs`  
**Risk Level**: 🟡 Medium (Monitoring)  
**Dependencies**: Phase 10 approved  
**Deliverables**:
- [ ] Structured logging implementation
- [ ] Error boundaries and uptime monitoring
- [ ] Performance budgets (FCP, API P95)
- [ ] Incident runbook and rollback procedures

**Rollback**: Remove monitoring infrastructure

---

### Phase 12: Enterprise Toggles (RBAC/SSO/Audit)
**Branch**: `agent/phase-12-enterprise`  
**Risk Level**: 🔴 High (Authorization)  
**Dependencies**: Phase 11 approved  
**Deliverables**:
- [ ] RBAC system (Owner/Admin/Editor/Viewer)
- [ ] Audit logging table and viewer
- [ ] SSO placeholder (Azure/Okta documentation)
- [ ] Feature flags for enterprise mode

**Rollback**: Remove enterprise features, restore simple auth

---

## Global Quality Standards
Applied to every phase:
- ✅ **Tests**: Unit + e2e smoke tests for critical flows
- ✅ **Accessibility**: axe checks, no blocker violations
- ✅ **Security**: No client secrets, RLS default-on
- ✅ **DX**: README updates, one-command scripts

## Risk Management
- **Isolation**: Each phase in separate feature branch
- **Independence**: Phases mergeable individually
- **Reversibility**: Auto-generated revert instructions
- **Validation**: Preview environments for all changes
- **Gates**: Manual approval required between phases

## Rollback Guarantee
Every phase includes:
1. **Branch isolation** - No main branch contamination
2. **Revert instructions** - Automated in PR descriptions
3. **Dependency mapping** - Clear rollback order
4. **State preservation** - No data loss during rollbacks

---

*This plan follows phase-gated methodology with zero-risk deployment practices.*
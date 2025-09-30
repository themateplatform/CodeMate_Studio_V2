# T001: Supabase Database & Auth Migration

**Phase**: 2  
**Priority**: High  
**Estimated Effort**: 2-3 days  
**Risk Level**: 🟡 Medium  

## Objective
Migrate from current PostgreSQL (Neon) + Passport.js auth to Supabase database with built-in authentication system.

## Scope

### **Database Migration**
- [ ] Install supabase-js client library
- [ ] Configure environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE)
- [ ] Create `/supabase/sql/` directory with schema definitions
- [ ] Migrate existing schema to Supabase SQL format
- [ ] Set up Row Level Security (RLS) policies
- [ ] Create migration runner script

### **Authentication System**
- [ ] Replace Passport.js with Supabase Auth
- [ ] Update login/registration UI components
- [ ] Implement protected route guards
- [ ] Create profile management screen
- [ ] Test GitHub OAuth integration

### **Data Migration**
- [ ] Export existing user data from Neon
- [ ] Transform data to Supabase format
- [ ] Import users with proper organization linking
- [ ] Verify data integrity post-migration

## Technical Requirements

### **Schema Migration**
```sql
-- /supabase/sql/001_initial_schema.sql
-- Migrate organizations, users, projects, etc.
-- Enable RLS on all tables
-- Create proper policies for multi-tenancy
```

### **RLS Policies**
```sql
-- Users can read any profile but only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

### **Environment Setup**
```typescript
// Client configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Server configuration (service role)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE
```

## Acceptance Criteria
- [ ] All existing users migrated successfully
- [ ] Authentication works (email/password + GitHub OAuth)
- [ ] RLS policies enforced correctly
- [ ] Profile editing functional
- [ ] No data loss during migration
- [ ] Preview environment connects to Supabase
- [ ] All tests pass

## Testing Strategy
- [ ] Unit tests for auth utilities
- [ ] Integration tests for database operations
- [ ] E2E tests for login/registration flow
- [ ] Manual testing of edge cases

## Rollback Plan
- [ ] Database backup before migration
- [ ] Revert to Neon connection string
- [ ] Restore Passport.js authentication
- [ ] Switch back to previous storage layer

## Dependencies
- Phase 0 (Guardrails) completed
- Supabase project provisioned
- Environment secrets configured
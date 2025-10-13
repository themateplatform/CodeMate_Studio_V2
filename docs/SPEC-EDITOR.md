# Spec Editor System - Complete Implementation

## Overview
The Spec Editor is CodeMate Studio's "single source of truth" system where users define their product vision in natural language. This living specification feeds directly into the Generator System to produce complete applications.

## Architecture

### Database Schema (shared/schema.ts)
```typescript
specs table:
- id, projectId, title, description
- purpose, audience, problemStatement, solutionOverview
- successMetrics (JSON), acceptanceCriteria (JSON)
- status (draft/review/approved/implemented)
- version, isActive, isTemplate
- createdBy, approvedBy, approvedAt
- timestamps

specVersions table (immutable history):
- id, specId, version, title, content (JSON snapshot)
- changeSummary, changedBy, createdAt
```

### API Routes (server/routes/specs.ts)
All routes CSRF-protected and session-authenticated:

1. **GET /api/specs** - List all specs (optional ?projectId filter)
2. **GET /api/specs/:id** - Get single spec
3. **POST /api/specs** - Create new spec (auto-creates project if needed)
4. **PUT /api/specs/:id** - Update spec (increments version, creates snapshot)
5. **DELETE /api/specs/:id** - Soft delete (sets isActive=false)
6. **GET /api/specs/:id/versions** - Get version history
7. **POST /api/specs/:id/generate** - Convert spec to generator prompt

### Frontend (client/src/pages/spec-editor.tsx)
React component with:
- Tabbed interface (Overview, User Journeys, Data Models, Success)
- Edit/Preview modes
- Auto-save functionality
- Generate App button → redirects to generator with pre-filled prompt

## User Flow

### 1. Create Specification
```
User navigates to /spec-editor
↓
Fills in:
- Title & Description
- Purpose Statement (Why this exists)
- Target Audience (Who it's for)
- Problem Statement (What pain points)
- Solution Overview (How it solves them)
- Acceptance Criteria (When it's done)
- Success Metrics (How to measure)
↓
Clicks "Save"
↓
System creates spec + version snapshot + optional project
```

### 2. Generate from Spec
```
User views saved spec in Preview mode
↓
Clicks "Generate App" button
↓
System calls POST /api/specs/:id/generate
↓
Converts spec to structured prompt:
{
  title: "Blog Platform"
  purpose: "Enable writers to publish content..."
  features: ["Create posts", "Manage categories", ...]
}
↓
Redirects to /generator with pre-filled prompt
↓
Generator analyzes → matches template → generates complete app
```

### 3. Version History
```
Every save creates immutable version snapshot
Users can view full history
Compare versions side-by-side (future)
Rollback to previous version (future)
```

## Integration Points

### Spec → Generator Flow
```typescript
// server/routes/specs.ts:277
POST /api/specs/:id/generate
↓
Fetches spec from database
↓
Constructs prompt:
const prompt = `
  ${spec.title}
  Purpose: ${spec.purpose}
  Audience: ${spec.audience}
  Features: ${acceptanceCriteria.join('\n')}
`;
↓
Returns prompt + projectName suggestion
↓
Frontend redirects to:
/generator?prompt=...&name=...
```

### Database Integration
- Specs linked to projects via projectId
- Projects auto-created if not provided
- Version snapshots stored as JSON blobs
- Soft deletes preserve data integrity

### Authentication
- All routes check req.session?.user?.id
- Returns 401 if unauthorized
- User ID stored in createdBy/changedBy fields

## Key Features

### ✅ Implemented
- Complete CRUD operations for specs
- Automatic version history
- Soft delete with isActive flag
- Spec-to-generator integration
- Edit/Preview modes in UI
- Tabbed interface for organization
- Success metrics management
- Acceptance criteria management
- Auto-save with toast notifications
- Generate App button workflow

### 🚧 Placeholder (Future Enhancements)
- User Journeys tab (currently placeholder)
- Data Models tab (currently placeholder)
- Real-time collaboration (Yjs integration)
- AI-powered suggestions
- Side-by-side version comparison
- Template marketplace
- Spec approval workflows
- Export to PDF/Markdown

## API Examples

### Create Spec
```bash
curl -X POST /api/specs \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ..." \
  -d '{
    "title": "Task Manager",
    "purpose": "Help teams organize work",
    "audience": "Small businesses",
    "problemStatement": "Too many tools, too complex",
    "solutionOverview": "Simple, focused task management",
    "successMetrics": [
      {"name": "Adoption", "target": "80%", "measurement": "Active users"}
    ],
    "acceptanceCriteria": [
      "Users can create tasks",
      "Users can assign to teammates"
    ]
  }'
```

### Generate from Spec
```bash
curl -X POST /api/specs/abc-123/generate \
  -H "X-CSRF-Token: ..."

Response:
{
  "prompt": "Task Manager\nPurpose: Help teams organize...",
  "projectName": "task-manager",
  "suggestion": "Use this prompt with the Generator..."
}
```

## Technical Details

### Type Safety
- Drizzle ORM with TypeScript schemas
- Full type inference from database to API
- Zod validation schemas (future)

### Performance
- Indexed queries on projectId, status, createdAt
- Soft deletes avoid cascading deletions
- Version snapshots stored efficiently as JSONB

### Security
- CSRF protection on all mutations
- Session-based authentication
- SQL injection protected by Drizzle
- No sensitive data in version snapshots

### Observability
- All requests logged with duration
- Error tracking in try/catch blocks
- Success/failure toast notifications
- Version history audit trail

## Migration Path

### From Current State
1. Users create specs via UI
2. Save to database with version tracking
3. Generate app from spec → opens generator
4. Generator creates complete Vite + React app

### Future Enhancements
1. Add AI suggestions for missing sections
2. Implement real-time collaboration
3. Build template marketplace
4. Add approval workflows
5. Enable Figma/design tool integration
6. Create mobile app for spec editing

## Bundle Impact
- Backend: +139KB (spec routes + registration)
- Frontend: +0.8KB (Generate App button + navigation)
- Total: Minimal impact, major functionality gain

## Testing Checklist
- [x] TypeScript compilation passes
- [x] Production build succeeds
- [x] Routes registered correctly
- [x] Database schema exists
- [ ] Manual E2E test: Create spec → Save → Generate
- [ ] Manual E2E test: Edit spec → Update → Version history
- [ ] Manual E2E test: Delete spec → Verify soft delete

## Known Limitations
1. No user authentication system yet (session stubs)
2. User Journeys and Data Models tabs are placeholders
3. No real-time collaboration yet
4. No AI suggestions yet
5. Version comparison not implemented

## Next Steps
1. Add authentication system
2. Implement User Journeys builder
3. Implement Data Models designer
4. Add AI-powered spec suggestions
5. Build Yjs real-time collaboration
6. Create template marketplace

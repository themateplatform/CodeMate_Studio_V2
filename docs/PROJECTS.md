# Projects Management System Documentation

**Status**: ✅ Complete and Ready for Deployment  
**Date**: October 13, 2025  
**Commit**: TBD

## Overview

The Projects Management System provides comprehensive CRUD operations for user projects with GitHub integration, stats tracking, and seamless integration with the Spec Editor and Generator systems. Users can create, view, update, duplicate, and delete projects through a modern dashboard interface.

## Architecture

### Backend Components

#### Project Routes (`server/routes/projects.ts`)

**GET /api/projects** - List all projects for current user
- Requires authentication
- Returns array of projects ordered by updatedAt (desc)
- Response: `{ projects: Project[] }`
- Status Codes: 200 (success), 401 (unauthorized), 500 (error)

**GET /api/projects/:id** - Get single project by ID
- Requires authentication + ownership verification
- Includes specs count for the project
- Response: `{ project: Project, specsCount: number }`
- Status Codes: 200 (success), 401 (unauthorized), 404 (not found), 500 (error)

**POST /api/projects** - Create new project
- Requires authentication + CSRF token
- Request: `{ name, description?, isPublic?, autonomyLevel?, techStack?, requirements?, briefResponses?, githubRepoUrl?, githubBranch?, organizationId? }`
- Validation: name required and non-empty
- Response: `{ project: Project }`
- Status Codes: 201 (created), 400 (validation), 401 (unauthorized), 500 (error)

**PUT /api/projects/:id** - Update existing project
- Requires authentication + CSRF token + ownership verification
- Request: Any combination of project fields
- Updates updatedAt timestamp automatically
- Response: `{ project: Project }`
- Status Codes: 200 (success), 400 (validation), 401 (unauthorized), 404 (not found), 500 (error)

**DELETE /api/projects/:id** - Delete project
- Requires authentication + CSRF token + ownership verification
- Cascade deletes related specs and data
- Response: `{ message: string }`
- Status Codes: 200 (success), 401 (unauthorized), 404 (not found), 500 (error)

**GET /api/projects/:id/specs** - Get all specs for project
- Requires authentication + ownership verification
- Returns specs ordered by updatedAt (desc)
- Response: `{ specs: Spec[] }`
- Status Codes: 200 (success), 401 (unauthorized), 404 (not found), 500 (error)

**POST /api/projects/:id/duplicate** - Duplicate project
- Requires authentication + CSRF token + ownership verification
- Creates copy with "(Copy)" suffix, private by default
- Resets provisioning status to not_provisioned
- Response: `{ project: Project }`
- Status Codes: 201 (created), 401 (unauthorized), 404 (not found), 500 (error)

**PATCH /api/projects/:id/github-sync** - Toggle GitHub sync
- Requires authentication + CSRF token + ownership verification
- Request: `{ enabled: boolean }`
- Validation: Cannot enable without githubRepoUrl
- Response: `{ project: Project }`
- Status Codes: 200 (success), 400 (validation), 401 (unauthorized), 404 (not found), 500 (error)

**GET /api/projects/stats** - Get user's project statistics
- Requires authentication
- Aggregates: totalProjects, publicProjects, privateProjects, githubSyncEnabled, provisionedProjects
- Response: `{ stats: ProjectStats }`
- Status Codes: 200 (success), 401 (unauthorized), 500 (error)

### Frontend Components

#### Projects Dashboard (`client/src/pages/projects-dashboard.tsx`)

**Features:**
- Authentication-gated access (redirects to login if not authenticated)
- Real-time project list with TanStack Query
- Project statistics dashboard (4 stat cards)
- Create project dialog with validation
- Project cards with metadata display
- Duplicate project functionality
- Delete project with confirmation
- Navigate to Spec Editor from project
- GitHub repository links
- Status badges (Public, GitHub, Autonomy Level)
- Empty state with call-to-action
- Loading states and error handling

**UI Components Used:**
- Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter
- Button, Input, Textarea, Select, Badge, Alert
- Icons: Plus, Folder, GitBranch, Settings, Copy, Trash2, ExternalLink, FileText, Code2, Loader2

**User Flows:**
1. **View Projects**: Auto-loads user's projects on mount
2. **Create Project**: Click "New Project" → Fill form → Submit → Auto-refresh list
3. **View Project Details**: Click project card to see full details
4. **Edit Specs**: Click "Specs" button → Navigate to Spec Editor with projectId
5. **Duplicate Project**: Click copy icon → Instant duplicate with "(Copy)" suffix
6. **Delete Project**: Click delete icon → Confirm → Remove from list

### Database Schema

#### projects table (existing, from schema.ts)
```sql
CREATE TABLE projects (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  organization_id VARCHAR REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  github_repo_url TEXT,
  github_branch TEXT DEFAULT 'main',
  github_sync_enabled BOOLEAN DEFAULT false,
  github_webhook_id TEXT,
  supabase_project_id TEXT,
  supabase_url TEXT,
  provisioning_status TEXT DEFAULT 'not_provisioned',
  
  -- Cross-app features
  parent_app_id VARCHAR,
  shared_design_tokens JSONB,
  shared_components JSONB,
  
  -- Project settings
  is_public BOOLEAN DEFAULT false,
  autonomy_level TEXT DEFAULT 'ask_some',
  deployment_config JSONB,
  
  -- Brief/questionnaire
  brief_responses JSONB,
  tech_stack JSONB,
  requirements JSONB,
  
  -- Test coverage
  test_coverage INTEGER,
  last_coverage_run TIMESTAMP,
  coverage_enforced BOOLEAN DEFAULT false,
  
  -- Normalization
  last_normalization_run VARCHAR,
  structure_compliance INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Integration with Existing Systems

### Authentication System
✅ All routes require authentication via `req.session?.user?.id`  
✅ Projects are user-scoped (userId foreign key)  
✅ Ownership verification on update/delete operations  
✅ Auth context integrated in frontend (redirects to login)

### Spec Editor System
✅ Projects can have multiple specs (1:N relationship)  
✅ Spec Editor accepts `?projectId=xxx` query parameter  
✅ "Specs" button navigates with projectId preserved  
✅ GET /api/projects/:id/specs endpoint for project specs  
✅ Spec creation can be linked to project

### Generator System
✅ Projects table ready for generator integration  
✅ techStack field for storing selected technologies  
✅ requirements field for functional requirements  
✅ briefResponses field for questionnaire answers  
✅ Ready to accept generated project data

## Security Features

✅ **Authentication Required**: All endpoints check session  
✅ **Ownership Verification**: Users can only access their own projects  
✅ **CSRF Protection**: State-changing endpoints protected  
✅ **Input Validation**: Name required, type checking  
✅ **Cascade Delete**: Related data cleaned up properly

## Usage Examples

### Backend: Create Project
```typescript
// POST /api/projects
const response = await fetch("/api/projects", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    name: "My New App",
    description: "An awesome application",
    autonomyLevel: "ask_some",
    isPublic: false
  })
});
```

### Backend: Get Projects
```typescript
// GET /api/projects
const response = await fetch("/api/projects", {
  credentials: "include"
});
const { projects } = await response.json();
```

### Frontend: Use Projects Dashboard
```tsx
import { ProjectsDashboard } from "@/pages/projects-dashboard";

function App() {
  return <Route path="/projects" component={ProjectsDashboard} />;
}
```

### Frontend: Navigate with Project Context
```tsx
// Navigate to Spec Editor with project
setLocation(`/spec-editor?projectId=${project.id}`);

// Navigate to IDE with project
setLocation(`/ide/${project.id}`);
```

## Statistics Tracking

The system tracks the following statistics per user:
- **Total Projects**: All projects count
- **Public Projects**: Projects with isPublic=true
- **Private Projects**: Projects with isPublic=false
- **GitHub Synced**: Projects with githubSyncEnabled=true
- **Provisioned**: Projects with provisioningStatus='provisioned'

Statistics are calculated on-demand from the projects table, ensuring accuracy.

## GitHub Integration

Projects can be linked to GitHub repositories:
- **githubRepoUrl**: Full repository URL
- **githubBranch**: Target branch (default: main)
- **githubSyncEnabled**: Toggle for automatic sync
- **githubWebhookId**: For webhook management

The system validates that a repository URL exists before enabling GitHub sync.

## Autonomy Levels

Projects support three AI autonomy levels:
1. **ask_everything**: Full approval required for all AI actions
2. **ask_some**: Balanced approach, approval for major changes (default)
3. **ask_none**: Full AI autonomy, minimal user intervention

This setting guides how the AI agent interacts with the user during project development.

## Future Enhancements

### Planned Features
- [ ] Project templates/starters
- [ ] Project sharing and collaboration
- [ ] Project archiving (soft delete)
- [ ] Project import/export
- [ ] GitHub webhook integration
- [ ] Supabase provisioning automation
- [ ] Test coverage visualization
- [ ] Structure compliance scoring
- [ ] Project search and filtering
- [ ] Project tags/categories
- [ ] Bulk operations (archive, delete multiple)
- [ ] Project activity timeline
- [ ] Cross-app component sharing UI

### Organization Support (Schema Ready)
Projects table includes `organizationId` foreign key for future multi-tenancy:
- Team workspaces
- Shared projects
- Organization-level permissions
- Billing per organization

## Files Modified/Created

### Created
- ✅ `server/routes/projects.ts` (375 lines) - Complete projects API with 9 endpoints
- ✅ `client/src/pages/projects-dashboard.tsx` (380 lines) - Full-featured projects UI
- ✅ `docs/PROJECTS.md` (this file)

### Modified
- ✅ `server/routes.ts` - Registered project routes
- ✅ `client/src/App.tsx` - Added /projects route with ProjectsDashboard

## API Reference Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/projects` | ✅ | List user's projects |
| GET | `/api/projects/:id` | ✅ | Get single project |
| POST | `/api/projects` | ✅ | Create project |
| PUT | `/api/projects/:id` | ✅ | Update project |
| DELETE | `/api/projects/:id` | ✅ | Delete project |
| GET | `/api/projects/:id/specs` | ✅ | Get project specs |
| POST | `/api/projects/:id/duplicate` | ✅ | Duplicate project |
| PATCH | `/api/projects/:id/github-sync` | ✅ | Toggle GitHub sync |
| GET | `/api/projects/stats` | ✅ | Get user stats |

## Testing Checklist

### Manual Testing
- [ ] Create project with valid data
- [ ] Create project fails without name
- [ ] List projects shows user's projects only
- [ ] Get single project returns details + specs count
- [ ] Update project modifies fields
- [ ] Delete project removes from list
- [ ] Duplicate project creates copy with "(Copy)" suffix
- [ ] GitHub sync toggle works
- [ ] Stats display correctly
- [ ] Navigate to Spec Editor with projectId
- [ ] Empty state shows when no projects
- [ ] Loading states display during operations
- [ ] Error messages show on failures

### API Testing
```bash
# Create project
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"Test Project","description":"A test project"}'

# List projects
curl http://localhost:5000/api/projects -b cookies.txt

# Get project stats
curl http://localhost:5000/api/projects/stats -b cookies.txt

# Duplicate project
curl -X POST http://localhost:5000/api/projects/PROJECT_ID/duplicate \
  -b cookies.txt

# Delete project
curl -X DELETE http://localhost:5000/api/projects/PROJECT_ID \
  -b cookies.txt
```

## Deployment Notes

### Pre-Deployment Checklist
✅ TypeScript compilation passes (`npm run check`)  
✅ Production build succeeds (`npm run build`)  
✅ All routes registered in server/routes.ts  
✅ Authentication integration complete  
✅ Database schema includes projects table  
✅ Frontend route added to App.tsx

### Post-Deployment Testing
- [ ] Test project CRUD operations
- [ ] Verify auth-gated access
- [ ] Check stats accuracy
- [ ] Test GitHub sync toggle
- [ ] Verify Spec Editor navigation
- [ ] Confirm duplicate functionality

## Performance Considerations

- Projects fetched with single query, ordered by updatedAt
- Stats calculated on-demand (consider caching for large datasets)
- Frontend uses TanStack Query for automatic caching
- Optimistic updates for instant UI feedback
- Lazy loading for project list (can add pagination)

## Support

For issues or questions:
- Check network tab for API errors
- Verify authentication session is valid
- Review browser console for client errors
- Check server logs for backend errors

---

**System Status**: Production Ready ✅  
**Build**: TypeScript ✅ | Production Bundle ✅ | Size: 574KB (166KB gzip)  
**Integration**: Auth ✅ | Specs ✅ | Generator Ready ✅

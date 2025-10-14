# User Journeys Visual Designer

## Overview

The User Journeys Visual Designer is a comprehensive system for creating, managing, and visualizing user journeys within CodeMate Studio. It enables product teams to define end-to-end user experiences, map user flows, identify pain points, and establish success criteria - all within the living specification.

**Feature Status**: ✅ Production Ready  
**Commit**: [To be added]  
**Architecture**: React Frontend + Express Backend + PostgreSQL

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [API Reference](#api-reference)
4. [Component Reference](#component-reference)
5. [Database Schema](#database-schema)
6. [Usage Guide](#usage-guide)
7. [Integration with AI](#integration-with-ai)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Features

### Core Capabilities

- **Visual Journey Editor**: Intuitive drag-and-drop interface for defining user journey steps
- **Step-by-Step Flow**: Sequential step editor with descriptions, expectations, and touchpoints
- **Pain Points Mapping**: Document user frustrations and problems each journey addresses
- **Success Criteria**: Define measurable outcomes for journey success
- **Priority Management**: Classify journeys as high/medium/low priority
- **Status Tracking**: Track journeys through draft → reviewed → implemented lifecycle
- **User Type Segmentation**: Associate journeys with specific user personas
- **Visual Flow Diagram**: Auto-generated visual representation of journey flow
- **Duplicate Journeys**: Clone existing journeys as templates
- **Export to AI**: Export journey data for AI user story generation
- **Statistics Dashboard**: Real-time metrics on journey status, priority distribution
- **Search & Filter**: Find journeys by name, status, priority, or user type

### Key Metrics

- **Total Journeys**: Count of all user journeys
- **By Status**: Breakdown of draft/reviewed/implemented journeys
- **By Priority**: Distribution of high/medium/low priority journeys
- **User Types**: List of unique user personas
- **Average Steps**: Mean number of steps per journey

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Spec Editor (React)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  JourneyList Component                               │   │
│  │  - Display journeys with filters                     │   │
│  │  - Create/Edit/Delete operations                     │   │
│  │  - Statistics dashboard                              │   │
│  │  ┌────────────────────────────────────────────┐     │   │
│  │  │  JourneyEditor Component                    │     │   │
│  │  │  - Journey information form                 │     │   │
│  │  │  - Step editor with drag-drop               │     │   │
│  │  │  - Pain points manager                      │     │   │
│  │  │  - Success criteria builder                 │     │   │
│  │  └────────────────────────────────────────────┘     │   │
│  │  ┌────────────────────────────────────────────┐     │   │
│  │  │  JourneyFlowVisualizer Component           │     │   │
│  │  │  - Visual journey diagram                   │     │   │
│  │  │  - Step-by-step flow with arrows            │     │   │
│  │  │  - Priority/status indicators               │     │   │
│  │  └────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│         Express.js API (server/routes/user-journeys.ts)     │
│  - 8 RESTful endpoints                                      │
│  - CRUD operations with validation                          │
│  - Export to AI format                                      │
│  - Statistics aggregation                                   │
└─────────────────────────────────────────────────────────────┘
                            ↕ Drizzle ORM
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                            │
│  Table: spec_user_journeys                                  │
│  - Journey metadata (name, description, type)               │
│  - Steps (jsonb array)                                      │
│  - Success criteria (jsonb array)                           │
│  - Pain points (jsonb array)                                │
│  - Priority, status, timestamps                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Create Journey**: User fills JourneyEditor → POST to `/api/specs/:specId/journeys` → Insert to database → Invalidate cache → Refresh UI
2. **Update Journey**: User edits in JourneyEditor → PUT to `/api/journeys/:journeyId` → Update database → Invalidate cache → Refresh UI
3. **Delete Journey**: User confirms deletion → DELETE to `/api/journeys/:journeyId` → Remove from database → Invalidate cache → Refresh UI
4. **Duplicate Journey**: User clicks duplicate → POST to `/api/journeys/:journeyId/duplicate` → Create copy with "(Copy)" suffix → Refresh UI
5. **Export Journey**: User clicks export → GET from `/api/journeys/:journeyId/export/user-stories` → Format for AI → Copy to clipboard
6. **View Statistics**: Component loads → GET from `/api/specs/:specId/journeys/stats` → Aggregate data → Display dashboard

---

## API Reference

### Base URL
All endpoints are prefixed with `/api`

### Authentication
All endpoints require authenticated session via `req.session.user`

### Endpoints

#### 1. List Journeys for Spec
```http
GET /api/specs/:specId/journeys
```

**Description**: Retrieve all user journeys for a specific specification.

**Parameters**:
- `specId` (path, string): Specification ID

**Response**:
```json
[
  {
    "id": "uuid",
    "specId": "uuid",
    "name": "New User Onboarding",
    "description": "Guide new users through initial setup",
    "userType": "Primary User",
    "steps": [
      {
        "step": "Sign Up",
        "description": "User creates account",
        "touchpoints": ["Landing Page", "Registration Form"],
        "expectations": "Quick and easy signup"
      }
    ],
    "successCriteria": ["80% completion rate", "< 5 min average time"],
    "painPoints": ["Complex forms", "Too many steps"],
    "priority": "high",
    "status": "reviewed",
    "createdAt": "2025-01-27T00:00:00.000Z",
    "updatedAt": "2025-01-27T00:00:00.000Z"
  }
]
```

**Status Codes**:
- `200 OK`: Journeys retrieved successfully
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Database error

---

#### 2. Get Specific Journey
```http
GET /api/journeys/:journeyId
```

**Description**: Retrieve a single user journey by ID.

**Parameters**:
- `journeyId` (path, string): Journey ID

**Response**: Same structure as list endpoint, single object

**Status Codes**:
- `200 OK`: Journey retrieved successfully
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Journey doesn't exist
- `500 Internal Server Error`: Database error

---

#### 3. Create Journey
```http
POST /api/specs/:specId/journeys
```

**Description**: Create a new user journey for a specification.

**Parameters**:
- `specId` (path, string): Specification ID

**Request Body**:
```json
{
  "name": "New User Onboarding",
  "description": "Guide new users through initial setup",
  "userType": "Primary User",
  "steps": [
    {
      "step": "Sign Up",
      "description": "User creates account",
      "touchpoints": ["Landing Page"],
      "expectations": "Quick signup"
    }
  ],
  "successCriteria": ["80% completion"],
  "painPoints": ["Complex forms"],
  "priority": "high",
  "status": "draft"
}
```

**Validation**:
- `name` (required, string, 1-200 chars)
- `description` (required, string)
- `userType` (required, string)
- `steps` (optional, array of objects)
- `successCriteria` (optional, array of strings)
- `painPoints` (optional, array of strings)
- `priority` (required, enum: high/medium/low)
- `status` (required, enum: draft/reviewed/implemented)

**Response**: Created journey object

**Status Codes**:
- `201 Created`: Journey created successfully
- `400 Bad Request`: Validation error
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Database error

---

#### 4. Update Journey
```http
PUT /api/journeys/:journeyId
```

**Description**: Update an existing user journey (partial updates supported).

**Parameters**:
- `journeyId` (path, string): Journey ID

**Request Body**: Same as create, all fields optional

**Response**: Updated journey object

**Status Codes**:
- `200 OK`: Journey updated successfully
- `400 Bad Request`: Validation error
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Journey doesn't exist
- `500 Internal Server Error`: Database error

---

#### 5. Delete Journey
```http
DELETE /api/journeys/:journeyId
```

**Description**: Permanently delete a user journey.

**Parameters**:
- `journeyId` (path, string): Journey ID

**Response**:
```json
{
  "message": "Journey deleted successfully"
}
```

**Status Codes**:
- `200 OK`: Journey deleted successfully
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Journey doesn't exist
- `500 Internal Server Error`: Database error

---

#### 6. Duplicate Journey
```http
POST /api/journeys/:journeyId/duplicate
```

**Description**: Create a copy of an existing journey with "(Copy)" appended to name.

**Parameters**:
- `journeyId` (path, string): Journey ID to duplicate

**Response**: New journey object (duplicate)

**Status Codes**:
- `201 Created`: Journey duplicated successfully
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Source journey doesn't exist
- `500 Internal Server Error`: Database error

---

#### 7. Export Journey for AI
```http
GET /api/journeys/:journeyId/export/user-stories
```

**Description**: Export journey in format optimized for AI user story generation.

**Parameters**:
- `journeyId` (path, string): Journey ID

**Response**:
```json
{
  "journeyName": "New User Onboarding",
  "userType": "Primary User",
  "description": "Guide new users through initial setup",
  "context": {
    "painPoints": ["Complex forms", "Too many steps"],
    "priority": "high",
    "status": "reviewed"
  },
  "steps": [
    {
      "stepNumber": 1,
      "stepName": "Sign Up",
      "what": "User creates account",
      "touchpoints": ["Landing Page", "Registration Form"],
      "userExpectation": "Quick and easy signup"
    }
  ],
  "successCriteria": [
    "80% completion rate",
    "< 5 min average time"
  ],
  "suggestedUserStories": [
    "As a Primary User, I want to sign up quickly so that I can start using the product"
  ]
}
```

**Status Codes**:
- `200 OK`: Export successful
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Journey doesn't exist
- `500 Internal Server Error`: Database error

---

#### 8. Get Journey Statistics
```http
GET /api/specs/:specId/journeys/stats
```

**Description**: Get aggregated statistics for all journeys in a specification.

**Parameters**:
- `specId` (path, string): Specification ID

**Response**:
```json
{
  "total": 12,
  "byStatus": {
    "draft": 5,
    "reviewed": 4,
    "implemented": 3
  },
  "byPriority": {
    "high": 3,
    "medium": 6,
    "low": 3
  },
  "userTypes": ["Primary User", "Admin", "Guest"],
  "avgStepsPerJourney": 4.5
}
```

**Status Codes**:
- `200 OK`: Statistics retrieved successfully
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Database error

---

## Component Reference

### JourneyList Component

**Location**: `client/src/components/journeys/JourneyList.tsx`

**Props**:
```typescript
interface JourneyListProps {
  specId: string;  // Required: Specification ID to load journeys for
}
```

**Features**:
- Statistics dashboard with 4 metric cards
- Search bar for filtering by name/description/userType
- Status filter dropdown (all/draft/reviewed/implemented)
- Priority filter dropdown (all/high/medium/low)
- Journey cards with edit/duplicate/export/delete actions
- Visual step flow preview
- Create new journey button
- Empty state with call-to-action
- Delete confirmation dialog

**Usage**:
```tsx
import { JourneyList } from "@/components/journeys/JourneyList";

<JourneyList specId="spec-uuid" />
```

**State Management**:
- Uses TanStack Query for data fetching and caching
- Optimistic updates with cache invalidation
- Toast notifications for all operations
- Local state for filters, dialogs, editing modes

---

### JourneyEditor Component

**Location**: `client/src/components/journeys/JourneyEditor.tsx`

**Props**:
```typescript
interface JourneyEditorProps {
  journey?: UserJourney;  // Optional: Journey to edit (omit for create mode)
  onSave: (journey: Omit<UserJourney, "id">) => void;  // Save callback
  onCancel: () => void;  // Cancel callback
}
```

**Features**:
- Journey information section (name, description, userType, priority, status)
- Visual step editor with add/edit/delete/reorder
- Step dialog with name, description, expectations
- Pain points list with add/remove
- Success criteria list with add/remove
- Validation for required fields
- Save/Cancel action buttons
- Step numbering and arrow connectors

**Usage**:
```tsx
import { JourneyEditor } from "@/components/journeys/JourneyEditor";

<JourneyEditor
  journey={existingJourney}  // Optional
  onSave={(data) => updateJourney(data)}
  onCancel={() => setEditing(false)}
/>
```

**Form Validation**:
- Name: Required, max 200 characters
- Description: Required
- User Type: Required
- Steps: Optional, each step requires name and description
- Priority: Required (high/medium/low)
- Status: Required (draft/reviewed/implemented)

---

### JourneyFlowVisualizer Component

**Location**: `client/src/components/journeys/JourneyFlowVisualizer.tsx`

**Props**:
```typescript
interface JourneyFlowVisualizerProps {
  journey: UserJourney;  // Required: Journey to visualize
}
```

**Features**:
- Journey header with priority/status indicators
- Pain points section with bullet list
- Visual step flow with numbered badges
- Step cards with descriptions and expectations
- Arrow connectors between steps
- Success criteria section with checkmarks
- Journey summary with key metrics
- Color-coded priority borders
- Responsive layout

**Usage**:
```tsx
import { JourneyFlowVisualizer } from "@/components/journeys/JourneyFlowVisualizer";

<JourneyFlowVisualizer journey={selectedJourney} />
```

**Visual Design**:
- Priority border colors: red (high), yellow (medium), green (low)
- Status colors: green (implemented), blue (reviewed), gray (draft)
- Step numbering with blue circular badges
- Arrow connectors for flow direction
- Card-based layout with hover effects

---

## Database Schema

### Table: `spec_user_journeys`

```sql
CREATE TABLE spec_user_journeys (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  user_type VARCHAR(100) NOT NULL,
  steps JSONB DEFAULT '[]'::jsonb,
  success_criteria JSONB DEFAULT '[]'::jsonb,
  pain_points JSONB DEFAULT '[]'::jsonb,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_spec_user_journeys_spec_id ON spec_user_journeys(spec_id);
CREATE INDEX idx_spec_user_journeys_user_type ON spec_user_journeys(user_type);
```

### Fields

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | varchar | Unique journey ID | Primary key, UUID |
| `spec_id` | varchar | Parent specification ID | Foreign key, indexed, cascade delete |
| `name` | varchar(200) | Journey name | Not null |
| `description` | text | Journey description | Not null |
| `user_type` | varchar(100) | User persona | Not null, indexed |
| `steps` | jsonb | Array of journey steps | Default `[]` |
| `success_criteria` | jsonb | Array of success metrics | Default `[]` |
| `pain_points` | jsonb | Array of pain points | Default `[]` |
| `priority` | varchar(20) | Priority level | Not null, default 'medium' |
| `status` | varchar(20) | Lifecycle status | Not null, default 'draft' |
| `created_at` | timestamp | Creation time | Default NOW() |
| `updated_at` | timestamp | Last update time | Default NOW() |

### JSONB Structures

**Steps Array**:
```json
[
  {
    "step": "Sign Up",
    "description": "User creates account",
    "touchpoints": ["Landing Page", "Registration Form"],
    "expectations": "Quick and easy signup"
  }
]
```

**Success Criteria Array**:
```json
[
  "80% of users complete the journey",
  "Average time < 5 minutes"
]
```

**Pain Points Array**:
```json
[
  "Complex forms deter users",
  "Too many steps cause drop-off"
]
```

---

## Usage Guide

### Creating a User Journey

1. Navigate to Spec Editor → User Journeys tab
2. Click "New Journey" button
3. Fill in basic information:
   - Journey Name (e.g., "New User Onboarding")
   - User Type (e.g., "Primary User")
   - Description (what this journey accomplishes)
   - Priority (high/medium/low)
   - Status (draft/reviewed/implemented)
4. Add journey steps:
   - Click "Add Step"
   - Enter step name (e.g., "Sign Up")
   - Enter step description
   - Add user expectations (optional)
   - Click "Add Step" to save
5. Add pain points (problems this journey solves)
6. Add success criteria (how to measure success)
7. Click "Create Journey"

### Editing a Journey

1. From journey list, click Edit icon on journey card
2. Modify any fields
3. Add/edit/delete/reorder steps
4. Add/remove pain points or success criteria
5. Click "Update Journey"

### Duplicating a Journey

1. Click Copy icon on journey card
2. Journey duplicated with "(Copy)" suffix
3. Edit the duplicate as needed

### Exporting for AI

1. Click Export icon on journey card
2. Journey data copied to clipboard in AI format
3. Paste into AI user story generator
4. AI generates user stories based on journey

### Viewing Statistics

- Statistics dashboard automatically displays at top
- Shows total journeys, breakdown by status
- Updates in real-time as journeys change

---

## Integration with AI

### Export Format

The export endpoint formats journey data for AI consumption:

```json
{
  "journeyName": "New User Onboarding",
  "userType": "Primary User",
  "description": "Guide new users through initial setup",
  "context": {
    "painPoints": ["Complex forms"],
    "priority": "high",
    "status": "reviewed"
  },
  "steps": [
    {
      "stepNumber": 1,
      "stepName": "Sign Up",
      "what": "User creates account",
      "touchpoints": ["Landing Page"],
      "userExpectation": "Quick and easy signup"
    }
  ],
  "successCriteria": ["80% completion rate"],
  "suggestedUserStories": [
    "As a Primary User, I want to sign up quickly so that I can start using the product"
  ]
}
```

### AI User Story Generation

The AIUserStories component can consume exported journey data:

1. User clicks "Generate User Stories" in AIUserStories component
2. Component fetches journey data via export endpoint
3. Formats data for OpenAI API
4. GPT-4o-mini generates comprehensive user stories
5. Stories displayed with acceptance criteria and technical notes

### Future AI Enhancements

- **Auto-generate journeys**: AI analyzes spec and suggests initial journeys
- **Smart step suggestions**: AI recommends next steps based on journey context
- **Pain point analysis**: AI identifies common pain points from similar products
- **Success metrics**: AI suggests relevant KPIs for journey success
- **Journey validation**: AI reviews journeys for completeness and coherence

---

## Testing

### Manual Testing Checklist

**Journey Creation**:
- [ ] Create journey with all fields filled
- [ ] Create journey with minimal required fields
- [ ] Add multiple steps to journey
- [ ] Add pain points and success criteria
- [ ] Verify journey appears in list
- [ ] Check statistics dashboard updates

**Journey Editing**:
- [ ] Edit journey name and description
- [ ] Change priority and status
- [ ] Add/edit/delete steps
- [ ] Reorder steps with up/down buttons
- [ ] Update pain points and success criteria
- [ ] Verify changes persist after save

**Journey Deletion**:
- [ ] Delete journey with confirmation dialog
- [ ] Verify journey removed from list
- [ ] Check statistics dashboard updates
- [ ] Cancel deletion and verify journey remains

**Journey Duplication**:
- [ ] Duplicate journey
- [ ] Verify copy has "(Copy)" suffix
- [ ] Edit duplicate independently
- [ ] Verify original unchanged

**Search and Filtering**:
- [ ] Search by journey name
- [ ] Search by description
- [ ] Search by user type
- [ ] Filter by status (draft/reviewed/implemented)
- [ ] Filter by priority (high/medium/low)
- [ ] Combine search and filters

**Export to AI**:
- [ ] Export journey to clipboard
- [ ] Verify clipboard contains formatted JSON
- [ ] Paste into AI user story generator
- [ ] Verify AI generates relevant stories

**Statistics Dashboard**:
- [ ] Verify total count accurate
- [ ] Check status breakdown correct
- [ ] Verify counts update on create/delete
- [ ] Check empty state when no journeys

**Error Handling**:
- [ ] Submit form with missing required fields
- [ ] Test with invalid data types
- [ ] Handle network errors gracefully
- [ ] Verify toast notifications appear

**Responsive Design**:
- [ ] Test on mobile viewport (320px)
- [ ] Test on tablet viewport (768px)
- [ ] Test on desktop viewport (1024px+)
- [ ] Verify all buttons/dialogs accessible

### Automated Testing

```typescript
// Example test suite structure
describe("JourneyList", () => {
  it("renders statistics dashboard", () => {});
  it("displays journeys from API", () => {});
  it("filters by search query", () => {});
  it("filters by status", () => {});
  it("creates new journey", () => {});
  it("updates existing journey", () => {});
  it("deletes journey with confirmation", () => {});
  it("duplicates journey", () => {});
  it("exports journey to clipboard", () => {});
});

describe("JourneyEditor", () => {
  it("validates required fields", () => {});
  it("adds journey step", () => {});
  it("edits journey step", () => {});
  it("deletes journey step", () => {});
  it("reorders steps", () => {});
  it("adds pain point", () => {});
  it("adds success criteria", () => {});
  it("saves journey", () => {});
  it("cancels editing", () => {});
});

describe("JourneyFlowVisualizer", () => {
  it("renders journey header", () => {});
  it("displays steps with connectors", () => {});
  it("shows pain points section", () => {});
  it("shows success criteria", () => {});
  it("applies priority colors", () => {});
});
```

---

## Troubleshooting

### Common Issues

**Issue**: Journeys not loading  
**Cause**: Spec ID not provided or invalid  
**Solution**: Ensure `projectId` query param exists in URL, save spec first

**Issue**: TypeScript errors in JourneyList  
**Cause**: Stats query not typed  
**Solution**: Add `JourneyStats` interface to `useQuery<JourneyStats>`

**Issue**: Steps not saving  
**Cause**: Step name or description empty  
**Solution**: Validate required fields before submitting

**Issue**: Export not copying to clipboard  
**Cause**: Browser clipboard permission denied  
**Solution**: Check browser permissions, use HTTPS

**Issue**: Statistics not updating  
**Cause**: Query cache not invalidated  
**Solution**: Ensure `invalidateQueries` called after mutations

**Issue**: Journey card overflow  
**Cause**: Long journey name or description  
**Solution**: Add CSS truncation or expand on hover

### Debug Steps

1. **Check Network Tab**: Verify API requests return 200 OK
2. **Check Console**: Look for React errors or warnings
3. **Check Database**: Query `spec_user_journeys` table directly
4. **Check Auth**: Verify user session exists (call `/api/session`)
5. **Check CSRF**: Ensure CSRF token included in POST/PUT/DELETE

### Performance Optimization

- **Lazy Load Components**: Use `React.lazy()` for JourneyEditor
- **Memoize Calculations**: Use `useMemo` for filtered journey lists
- **Debounce Search**: Delay search filtering by 300ms
- **Paginate Results**: Implement pagination for 50+ journeys
- **Index Database**: Ensure indexes on `spec_id` and `user_type`

---

## Future Enhancements

### Planned Features

1. **Journey Templates**: Pre-built journey templates for common use cases
2. **Journey Versioning**: Track changes to journeys over time
3. **Journey Collaboration**: Real-time collaborative editing with Yjs
4. **Journey Analytics**: Track actual vs. expected journey performance
5. **Journey Mapping**: Visual canvas for dragging and connecting steps
6. **Journey Import**: Import journeys from Figma, Miro, or CSV
7. **Journey Dependencies**: Link journeys that depend on each other
8. **Journey Personas**: Auto-link journeys to user personas
9. **Journey Testing**: Run automated tests against journey flows
10. **Journey Insights**: AI-powered recommendations for improvements

### Integration Opportunities

- **GitHub Issues**: Auto-create issues from journey steps
- **Jira**: Sync journeys with Jira epics and stories
- **Figma**: Import wireframes as journey touchpoints
- **Analytics**: Connect to Google Analytics for journey tracking
- **A/B Testing**: Integrate with Optimizely or LaunchDarkly

---

## Changelog

### v1.0.0 (2025-01-27)
- ✅ Initial release
- ✅ 8 RESTful API endpoints
- ✅ JourneyList component with search/filter
- ✅ JourneyEditor component with step builder
- ✅ JourneyFlowVisualizer component
- ✅ Statistics dashboard
- ✅ Export to AI format
- ✅ Duplicate journey functionality
- ✅ Integration with Spec Editor
- ✅ TypeScript validation passing
- ✅ Production build successful

---

## Support

For issues, questions, or feature requests:
- **GitHub Issues**: [Create an issue](https://github.com/your-repo/issues)
- **Documentation**: Check troubleshooting section above
- **Community**: Join discussions in GitHub Discussions

---

## License

MIT License - See LICENSE file for details

---

**Built with ❤️ for CodeMate Studio**

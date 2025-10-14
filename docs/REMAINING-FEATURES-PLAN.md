# Implementation Plan: Template Marketplace & Remaining Features

## Feature #4: Template Marketplace

### Overview
Pre-built project templates for common use cases: Subscriptions/Memberships, Ticketing/Bookings, CRM-lite.

### Database Schema
```sql
CREATE TABLE project_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'subscription', 'ticketing', 'crm'
  thumbnail_url TEXT,
  spec_template JSONB NOT NULL, -- Complete spec structure
  features JSONB, -- Array of features
  tech_stack JSONB, -- Technologies used
  is_premium BOOLEAN DEFAULT false,
  install_count INTEGER DEFAULT 0,
  rating DECIMAL(2,1),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Backend API Endpoints
- `GET /api/templates` - List all templates with filtering
- `GET /api/templates/:templateId` - Get specific template
- `POST /api/templates/:templateId/install` - Install template to new project
- `GET /api/templates/categories` - Get template categories
- `GET /api/templates/:templateId/preview` - Preview template details

### Frontend Components
- `TemplateMarketplace.tsx` - Main marketplace grid view
- `TemplateCard.tsx` - Individual template card
- `TemplateDetail.tsx` - Detailed template view
- `TemplateInstallDialog.tsx` - Installation configuration

### Template Definitions
**Subscription/Membership Template:**
```json
{
  "name": "SaaS Subscription Platform",
  "category": "subscription",
  "spec": {
    "title": "SaaS Subscription Platform",
    "purpose": "Manage recurring subscriptions with multiple tiers",
    "dataModels": [
      {
        "name": "Subscription",
        "fields": [
          {"name": "planId", "type": "uuid", "required": true},
          {"name": "userId", "type": "uuid", "required": true},
          {"name": "status", "type": "string", "validation": {"enum": ["active", "canceled", "past_due"]}},
          {"name": "currentPeriodStart", "type": "date", "required": true},
          {"name": "currentPeriodEnd", "type": "date", "required": true},
          {"name": "cancelAtPeriodEnd", "type": "boolean", "defaultValue": "false"}
        ]
      },
      {
        "name": "Plan",
        "fields": [
          {"name": "name", "type": "string", "required": true},
          {"name": "price", "type": "decimal", "required": true},
          {"name": "interval", "type": "string", "validation": {"enum": ["month", "year"]}},
          {"name": "features", "type": "json"}
        ]
      }
    ],
    "userJourneys": [
      {
        "name": "Sign Up & Subscribe",
        "steps": [
          {"step": "Browse Plans", "description": "User views available subscription tiers"},
          {"step": "Select Plan", "description": "User chooses a plan"},
          {"step": "Enter Payment", "description": "User provides payment method"},
          {"step": "Confirm Subscription", "description": "Subscription activated"}
        ]
      }
    ]
  }
}
```

**Ticketing/Booking Template:**
```json
{
  "name": "Event Ticketing Platform",
  "category": "ticketing",
  "spec": {
    "title": "Event Ticketing Platform",
    "purpose": "Sell and manage event tickets with capacity control",
    "dataModels": [
      {
        "name": "Event",
        "fields": [
          {"name": "title", "type": "string", "required": true},
          {"name": "description", "type": "text"},
          {"name": "startDate", "type": "datetime", "required": true},
          {"name": "endDate", "type": "datetime", "required": true},
          {"name": "venueId", "type": "uuid", "required": true},
          {"name": "capacity", "type": "integer", "required": true},
          {"name": "ticketsSold", "type": "integer", "defaultValue": "0"}
        ]
      },
      {
        "name": "Ticket",
        "fields": [
          {"name": "eventId", "type": "uuid", "required": true},
          {"name": "userId", "type": "uuid", "required": true},
          {"name": "ticketType", "type": "string", "required": true},
          {"name": "price", "type": "decimal", "required": true},
          {"name": "qrCode", "type": "string", "unique": true},
          {"name": "checkedIn", "type": "boolean", "defaultValue": "false"}
        ]
      }
    ],
    "userJourneys": [
      {
        "name": "Purchase Tickets",
        "steps": [
          {"step": "Browse Events", "description": "User finds event"},
          {"step": "Select Tickets", "description": "Choose quantity and type"},
          {"step": "Checkout", "description": "Complete purchase"},
          {"step": "Receive Tickets", "description": "QR codes emailed"}
        ]
      }
    ]
  }
}
```

**CRM-lite Template:**
```json
{
  "name": "Simple CRM",
  "category": "crm",
  "spec": {
    "title": "Simple CRM",
    "purpose": "Manage contacts, deals, and follow-ups",
    "dataModels": [
      {
        "name": "Contact",
        "fields": [
          {"name": "firstName", "type": "string", "required": true},
          {"name": "lastName", "type": "string", "required": true},
          {"name": "email", "type": "string", "required": true, "unique": true},
          {"name": "phone", "type": "string"},
          {"name": "company", "type": "string"},
          {"name": "status", "type": "string", "validation": {"enum": ["lead", "prospect", "customer"]}}
        ]
      },
      {
        "name": "Deal",
        "fields": [
          {"name": "contactId", "type": "uuid", "required": true},
          {"name": "title", "type": "string", "required": true},
          {"name": "value", "type": "decimal", "required": true},
          {"name": "stage", "type": "string", "validation": {"enum": ["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"]}},
          {"name": "expectedCloseDate", "type": "date"}
        ]
      }
    ],
    "userJourneys": [
      {
        "name": "Add New Lead",
        "steps": [
          {"step": "Capture Contact", "description": "Enter contact information"},
          {"step": "Qualify Lead", "description": "Assess fit and interest"},
          {"step": "Create Deal", "description": "Track opportunity"},
          {"step": "Schedule Follow-up", "description": "Set next action"}
        ]
      }
    ]
  }
}
```

### Installation Flow
1. User browses templates in marketplace
2. Clicks "Use Template" button
3. Dialog prompts for project name and customizations
4. Backend creates new project from template spec
5. Redirects to new project's spec editor
6. User can customize before generating app

---

## Feature #5: GitHub OAuth Integration

### OAuth Flow
1. User clicks "Connect GitHub" in settings
2. Redirect to GitHub OAuth authorization
3. GitHub redirects back with code
4. Exchange code for access token
5. Store encrypted token in database
6. Fetch user's repositories

### Database Schema
```sql
CREATE TABLE github_connections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  github_user_id VARCHAR NOT NULL,
  github_username VARCHAR NOT NULL,
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  scopes TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_github_connections_user ON github_connections(user_id);
```

### Backend API Endpoints
- `GET /api/auth/github` - Initiate OAuth flow
- `GET /api/auth/github/callback` - Handle OAuth callback
- `GET /api/github/repos` - List user's repositories
- `POST /api/github/repos/:owner/:repo/deploy` - Deploy to GitHub repo
- `GET /api/github/status` - Check connection status
- `DELETE /api/github/disconnect` - Remove GitHub connection

### Features to Implement
- Repository selection for project deployment
- Automatic commit and push on "Deploy"
- Create GitHub issues from user stories
- Branch management (create feature branches)
- Pull request creation
- Webhook integration for CI/CD triggers

---

## Feature #6: Native Mobile App Generation

### Architecture
- **Capacitor**: Web-to-native wrapper for iOS/Android
- **Expo**: React Native alternative with better DX
- Approach: Generate React Native components from spec

### Database Schema
```sql
CREATE TABLE mobile_app_configs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL REFERENCES projects(id),
  platform VARCHAR(20) NOT NULL, -- 'ios', 'android', 'both'
  app_name VARCHAR(200) NOT NULL,
  bundle_id VARCHAR(200) NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  icon_url TEXT,
  splash_screen_url TEXT,
  config_json JSONB, -- Capacitor/Expo config
  build_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Backend API Endpoints
- `POST /api/mobile/generate` - Generate mobile app from spec
- `GET /api/mobile/status/:configId` - Check build status
- `POST /api/mobile/build/:configId` - Trigger build
- `GET /api/mobile/download/:configId` - Download APK/IPA
- `PUT /api/mobile/config/:configId` - Update mobile config

### Generation Strategy
1. **Analyze Spec**: Extract data models, user journeys, UI requirements
2. **Generate Screens**: Create React Native screens for each journey step
3. **Navigation**: Setup React Navigation based on journey flows
4. **Data Layer**: Generate API client and local storage (SQLite)
5. **Offline Support**: Implement data sync and queue
6. **Platform-Specific**: Handle iOS/Android differences
7. **Build**: Use EAS Build (Expo) or Capacitor CLI

### Code Generation Templates
```typescript
// Screen template from user journey
function generateScreen(journey: UserJourney, step: JourneyStep): string {
  return `
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function ${step.step.replace(/\s/g, '')}Screen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>${step.step}</Text>
      <Text style={styles.description}>${step.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  description: { fontSize: 16, color: '#666' }
});
  `;
}

// API client from data models
function generateAPIClient(models: DataModel[]): string {
  const endpoints = models.map(model => {
    const name = model.name.toLowerCase();
    return `
  ${name}: {
    list: () => api.get('/${name}'),
    get: (id: string) => api.get(\`/${name}/\${id}\`),
    create: (data: ${model.name}) => api.post('/${name}', data),
    update: (id: string, data: Partial<${model.name}>) => api.put(\`/${name}/\${id}\`, data),
    delete: (id: string) => api.delete(\`/${name}/\${id}\`)
  }`;
  }).join(',\n');

  return `
import { API_BASE_URL } from './config';

const api = {
  get: (path: string) => fetch(\`\${API_BASE_URL}\${path}\`).then(r => r.json()),
  post: (path: string, data: any) => fetch(\`\${API_BASE_URL}\${path}\`, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
  put: (path: string, data: any) => fetch(\`\${API_BASE_URL}\${path}\`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
  delete: (path: string) => fetch(\`\${API_BASE_URL}\${path}\`, { method: 'DELETE' }).then(r => r.json())
};

export const apiClient = {${endpoints}
};
  `;
}
```

### Offline Support
- **Local Storage**: SQLite for data persistence
- **Sync Queue**: Queue mutations when offline
- **Conflict Resolution**: Last-write-wins or custom strategies
- **Background Sync**: Service worker for PWA, background tasks for native

---

## Implementation Priority

1. **Template Marketplace** (High) - Fastest time to value for users
2. **GitHub OAuth** (Medium) - Enables deployment workflows
3. **Mobile Generation** (Complex) - Requires significant architecture

## Estimated Effort

- **Template Marketplace**: 2-3 days (templates + UI + installation)
- **GitHub OAuth**: 3-4 days (OAuth flow + repo operations + webhooks)
- **Mobile Generation**: 1-2 weeks (code gen + build pipeline + testing)

## Next Steps

1. Create template definitions for 3 categories
2. Build marketplace UI with preview/install
3. Implement template installation logic
4. Add GitHub OAuth flow
5. Build repository operations
6. Design mobile generation architecture
7. Create code generation templates
8. Implement build pipeline

---

**Status**: Plan documented. Ready for implementation when token budget allows.

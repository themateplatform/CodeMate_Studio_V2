# BuildMate Studio API Reference

This document provides comprehensive API documentation for BuildMate Studio, including REST endpoints, WebSocket connections, and programmatic usage.

## Table of Contents

- [REST API](#rest-api)
- [WebSocket API](#websocket-api)
- [JavaScript SDK](#javascript-sdk)
- [CLI Tool](#cli-tool)
- [Webhooks](#webhooks)

## REST API

### Base URL

```
https://api.buildmate-studio.com/v1
```

### Authentication

All API requests require authentication using an API key:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.buildmate-studio.com/v1/projects
```

### Rate Limits

- **Free tier**: 100 requests/hour
- **Pro tier**: 1000 requests/hour
- **Enterprise**: Custom limits

### Endpoints

#### Projects

##### List Projects

```http
GET /projects
```

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20, max: 100)
- `status` (string): Filter by status (draft, building, completed, failed)

**Response:**
```json
{
  "projects": [
    {
      "id": "proj_abc123",
      "name": "Employee Dashboard",
      "type": "dashboard",
      "status": "completed",
      "design_system": "employse",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T11:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

##### Create Project

```http
POST /projects
```

**Request Body:**
```json
{
  "name": "Task Management App",
  "spec": {
    "type": "saas",
    "design_system": "taskflow",
    "features": ["authentication", "task_management"],
    "framework": "react"
  }
}
```

**Response:**
```json
{
  "project": {
    "id": "proj_xyz789",
    "name": "Task Management App",
    "status": "draft",
    "spec_url": "https://api.buildmate-studio.com/v1/projects/proj_xyz789/spec",
    "created_at": "2024-01-15T12:00:00Z"
  }
}
```

##### Get Project

```http
GET /projects/:id
```

**Response:**
```json
{
  "project": {
    "id": "proj_abc123",
    "name": "Employee Dashboard",
    "type": "dashboard",
    "status": "completed",
    "design_system": "employse",
    "spec": { /* full spec */ },
    "generated_files": [
      {
        "path": "src/components/EmployeeList.tsx",
        "size": 2453,
        "url": "https://storage.buildmate.com/proj_abc123/src/components/EmployeeList.tsx"
      }
    ],
    "build_logs": "https://api.buildmate-studio.com/v1/projects/proj_abc123/logs",
    "preview_url": "https://proj-abc123.buildmate.app",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T11:45:00Z"
  }
}
```

##### Update Project

```http
PATCH /projects/:id
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "spec": { /* updated spec */ }
}
```

##### Delete Project

```http
DELETE /projects/:id
```

**Response:**
```json
{
  "message": "Project deleted successfully"
}
```

#### Code Generation

##### Start Generation

```http
POST /projects/:id/generate
```

**Request Body:**
```json
{
  "regenerate": false,  // Regenerate all files
  "target_files": []    // Specific files to regenerate (optional)
}
```

**Response:**
```json
{
  "build_id": "build_456",
  "status": "building",
  "estimated_time": "120s",
  "websocket_url": "wss://api.buildmate-studio.com/v1/builds/build_456"
}
```

##### Get Build Status

```http
GET /builds/:build_id
```

**Response:**
```json
{
  "build": {
    "id": "build_456",
    "project_id": "proj_abc123",
    "status": "building",
    "progress": 45,
    "current_step": "Generating components",
    "steps": [
      {
        "name": "Fetching design tokens",
        "status": "completed",
        "duration": "2.3s"
      },
      {
        "name": "Generating components",
        "status": "in_progress",
        "progress": 60
      },
      {
        "name": "Setting up routes",
        "status": "pending"
      }
    ],
    "started_at": "2024-01-15T12:05:00Z"
  }
}
```

##### Cancel Build

```http
POST /builds/:build_id/cancel
```

#### Design Systems

##### List Design Systems

```http
GET /design-systems
```

**Response:**
```json
{
  "design_systems": [
    {
      "id": "employse",
      "name": "Employse",
      "description": "Employee management design system",
      "token_count": 156,
      "updated_at": "2024-01-10T08:00:00Z"
    }
  ]
}
```

##### Get Design Tokens

```http
GET /design-systems/:id/tokens
```

**Response:**
```json
{
  "design_system": "employse",
  "tokens": {
    "colors": { /* colors */ },
    "spacing": { /* spacing */ },
    "typography": { /* typography */ },
    "radius": { /* radius */ },
    "shadows": { /* shadows */ }
  },
  "version": "1.2.0",
  "updated_at": "2024-01-10T08:00:00Z"
}
```

#### Deployments

##### Deploy Project

```http
POST /projects/:id/deploy
```

**Request Body:**
```json
{
  "platform": "vercel",
  "environment": "production",
  "env_vars": {
    "DATABASE_URL": "postgres://...",
    "API_KEY": "secret_key"
  }
}
```

**Response:**
```json
{
  "deployment": {
    "id": "dep_789",
    "status": "deploying",
    "platform": "vercel",
    "url": "https://employee-dashboard.vercel.app",
    "progress_url": "https://api.buildmate-studio.com/v1/deployments/dep_789"
  }
}
```

##### Get Deployment Status

```http
GET /deployments/:id
```

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('wss://api.buildmate-studio.com/v1/ws');

ws.addEventListener('open', () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'YOUR_API_KEY'
  }));
});
```

### Events

#### Subscribe to Project

```json
{
  "type": "subscribe",
  "channel": "project:proj_abc123"
}
```

#### Build Progress

```json
{
  "type": "build.progress",
  "build_id": "build_456",
  "progress": 65,
  "step": "Implementing business logic",
  "timestamp": "2024-01-15T12:06:30Z"
}
```

#### Build Complete

```json
{
  "type": "build.complete",
  "build_id": "build_456",
  "project_id": "proj_abc123",
  "files_generated": 42,
  "preview_url": "https://proj-abc123.buildmate.app",
  "timestamp": "2024-01-15T12:08:00Z"
}
```

#### Build Failed

```json
{
  "type": "build.failed",
  "build_id": "build_456",
  "error": {
    "code": "DESIGN_SYSTEM_NOT_FOUND",
    "message": "Design system 'employse' not found",
    "details": { /* error details */ }
  },
  "timestamp": "2024-01-15T12:07:15Z"
}
```

## JavaScript SDK

### Installation

```bash
npm install @buildmate/sdk
```

### Basic Usage

```typescript
import { BuildMate } from '@buildmate/sdk';

const buildmate = new BuildMate({
  apiKey: process.env.BUILDMATE_API_KEY
});

// Create project
const project = await buildmate.projects.create({
  name: 'My App',
  spec: {
    type: 'dashboard',
    design_system: 'employse',
    features: ['authentication', 'data_tables']
  }
});

// Start generation
const build = await project.generate();

// Subscribe to progress
build.on('progress', (data) => {
  console.log(`Progress: ${data.progress}%`);
});

build.on('complete', (data) => {
  console.log(`Build complete: ${data.preview_url}`);
});

build.on('error', (error) => {
  console.error('Build failed:', error);
});
```

### Projects API

```typescript
// List projects
const projects = await buildmate.projects.list({
  status: 'completed',
  limit: 50
});

// Get project
const project = await buildmate.projects.get('proj_abc123');

// Update project
await project.update({
  spec: { /* updated spec */ }
});

// Delete project
await project.delete();
```

### Code Generation

```typescript
// Generate code
const build = await project.generate({
  regenerate: false
});

// Wait for completion
const result = await build.wait();

// Download files
const files = await build.downloadFiles('./output');
```

### Design Systems

```typescript
// List design systems
const systems = await buildmate.designSystems.list();

// Get tokens
const tokens = await buildmate.designSystems.getTokens('employse');

// Validate token
const isValid = await buildmate.designSystems.validateToken(
  'employse',
  'primary'
);
```

### Deployments

```typescript
// Deploy project
const deployment = await project.deploy({
  platform: 'vercel',
  environment: 'production',
  envVars: {
    DATABASE_URL: process.env.DATABASE_URL
  }
});

// Wait for deployment
await deployment.wait();

console.log(`Deployed to: ${deployment.url}`);
```

## CLI Tool

### Installation

```bash
npm install -g @buildmate/cli
```

### Authentication

```bash
# Login
buildmate login

# Set API key
buildmate config set apiKey YOUR_API_KEY
```

### Commands

#### Create Project

```bash
buildmate create my-app --spec spec.yaml
```

#### Generate Code

```bash
buildmate generate proj_abc123
```

#### Deploy

```bash
buildmate deploy proj_abc123 --platform vercel
```

#### List Projects

```bash
buildmate list --status completed
```

#### Download Files

```bash
buildmate download proj_abc123 --output ./my-app
```

#### Watch Mode

```bash
# Regenerate on spec changes
buildmate watch proj_abc123 --spec spec.yaml
```

## Webhooks

### Configuration

Configure webhooks in the BuildMate dashboard or via API:

```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/buildmate",
  "events": [
    "build.complete",
    "build.failed",
    "deployment.complete"
  ],
  "secret": "your-webhook-secret"
}
```

### Events

#### build.complete

```json
{
  "event": "build.complete",
  "timestamp": "2024-01-15T12:08:00Z",
  "data": {
    "build_id": "build_456",
    "project_id": "proj_abc123",
    "files_generated": 42,
    "preview_url": "https://proj-abc123.buildmate.app"
  }
}
```

#### build.failed

```json
{
  "event": "build.failed",
  "timestamp": "2024-01-15T12:07:15Z",
  "data": {
    "build_id": "build_456",
    "project_id": "proj_abc123",
    "error": {
      "code": "DESIGN_SYSTEM_NOT_FOUND",
      "message": "Design system 'employse' not found"
    }
  }
}
```

#### deployment.complete

```json
{
  "event": "deployment.complete",
  "timestamp": "2024-01-15T12:15:00Z",
  "data": {
    "deployment_id": "dep_789",
    "project_id": "proj_abc123",
    "platform": "vercel",
    "url": "https://employee-dashboard.vercel.app"
  }
}
```

### Webhook Verification

Verify webhook signatures:

```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(hash)
  );
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `AUTHENTICATION_FAILED` | Invalid API key |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `PROJECT_NOT_FOUND` | Project does not exist |
| `DESIGN_SYSTEM_NOT_FOUND` | Design system not found in DesignMate |
| `INVALID_SPEC` | Spec validation failed |
| `BUILD_FAILED` | Code generation failed |
| `DEPLOYMENT_FAILED` | Deployment failed |
| `INSUFFICIENT_CREDITS` | Not enough API credits |

## Rate Limiting

API responses include rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1642252800
```

## Pagination

Paginated endpoints use cursor-based pagination:

```json
{
  "data": [ /* items */ ],
  "pagination": {
    "cursor": "eyJpZCI6InByb2pfYWJjMTIzIn0",
    "has_more": true
  }
}
```

Next page:
```http
GET /projects?cursor=eyJpZCI6InByb2pfYWJjMTIzIn0
```

## Support

- **API Status**: https://status.buildmate-studio.com
- **Documentation**: https://docs.buildmate-studio.com
- **Support**: support@buildmate-studio.com

---

**Version**: 1.0.0 | **Last Updated**: January 2024

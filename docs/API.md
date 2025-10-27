# BuildMate Studio API Reference

BuildMate Studio provides both a web interface and programmatic API for generating applications from specifications.

## REST API

### Base URL
```
https://buildmate-studio.com/api
```

### Authentication

Use API key authentication:
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://buildmate-studio.com/api/generate
```

## Endpoints

### Generate Application

Generate code from a specification.

**Endpoint:** `POST /api/generate`

**Request:**
```json
{
  "spec": {
    "name": "My App",
    "type": "dashboard",
    "features": ["authentication", "user_list"],
    "design_system": "employse"
  },
  "options": {
    "framework": "react",
    "database": "supabase",
    "outputFormat": "github_pr"
  }
}
```

**Response:**
```json
{
  "id": "gen_abc123",
  "status": "processing",
  "progress": 0,
  "estimated_time": 120
}
```

### Check Generation Status

**Endpoint:** `GET /api/generate/:id`

**Response:**
```json
{
  "id": "gen_abc123",
  "status": "completed",
  "progress": 100,
  "result": {
    "repository_url": "https://github.com/org/repo",
    "pr_url": "https://github.com/org/repo/pull/1",
    "preview_url": "https://preview.buildmate.app/gen_abc123"
  }
}
```

### List Design Systems

Get available design systems from DesignMate.

**Endpoint:** `GET /api/design-systems`

**Response:**
```json
{
  "design_systems": [
    {
      "id": "employse",
      "name": "Employse Design System",
      "tokens_count": 150
    },
    {
      "id": "hottr",
      "name": "Hottr Design System",
      "tokens_count": 120
    }
  ]
}
```

### Validate Spec

Validate a specification before generation.

**Endpoint:** `POST /api/validate`

**Request:**
```json
{
  "spec": {
    "name": "My App",
    "type": "dashboard"
  }
}
```

**Response:**
```json
{
  "valid": true,
  "warnings": [
    "No design_system specified, using default"
  ],
  "errors": []
}
```

## JavaScript SDK

### Installation

```bash
npm install @buildmate/sdk
```

### Usage

```typescript
import { BuildMateClient } from '@buildmate/sdk';

const client = new BuildMateClient({
  apiKey: process.env.BUILDMATE_API_KEY
});

// Generate application
const generation = await client.generate({
  spec: {
    name: 'Employee Dashboard',
    type: 'dashboard',
    features: ['employee_list', 'shift_calendar'],
    design_system: 'employse'
  },
  options: {
    framework: 'react',
    database: 'supabase'
  }
});

// Wait for completion
await generation.waitForCompletion();

console.log('Generated:', generation.result.repository_url);
```

### Advanced Usage

```typescript
// Generate with streaming progress
const generation = await client.generate(spec, {
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percent}%`);
    console.log(`Current step: ${progress.step}`);
  }
});

// Generate to GitHub PR
const generation = await client.generate(spec, {
  output: {
    type: 'github_pr',
    repository: 'org/repo',
    branch: 'feature/new-dashboard'
  }
});

// Generate to local directory
const generation = await client.generate(spec, {
  output: {
    type: 'local',
    path: './generated-app'
  }
});
```

## CLI

### Installation

```bash
npm install -g @buildmate/cli
```

### Commands

#### Generate

```bash
buildmate generate [spec-file]

# Examples
buildmate generate dashboard-spec.yaml
buildmate generate --spec inline --name "My App" --type dashboard
```

#### Validate

```bash
buildmate validate [spec-file]

# Example
buildmate validate dashboard-spec.yaml
```

#### Deploy

```bash
buildmate deploy [directory]

# Example
buildmate deploy ./generated-app --platform vercel
```

## Webhooks

Receive notifications when generation completes.

### Setup

1. Configure webhook URL in BuildMate dashboard
2. Receive POST requests on completion

### Webhook Payload

```json
{
  "event": "generation.completed",
  "generation_id": "gen_abc123",
  "spec": {
    "name": "My App",
    "type": "dashboard"
  },
  "result": {
    "repository_url": "https://github.com/org/repo",
    "pr_url": "https://github.com/org/repo/pull/1"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Verify Webhooks

```typescript
import { verifyWebhook } from '@buildmate/sdk';

app.post('/webhooks/buildmate', (req, res) => {
  const signature = req.headers['x-buildmate-signature'];
  
  if (!verifyWebhook(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  console.log('Generation completed:', req.body.generation_id);
  
  res.sendStatus(200);
});
```

## Rate Limits

- **Free tier**: 10 generations/day
- **Pro tier**: 100 generations/day
- **Enterprise**: Unlimited

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705315200
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid spec format |
| 401 | Invalid API key |
| 402 | Payment required |
| 404 | Generation not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

## Examples

### Generate Dashboard

```bash
curl -X POST https://buildmate-studio.com/api/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "spec": {
      "name": "Admin Dashboard",
      "type": "dashboard",
      "features": ["user_management", "analytics"],
      "design_system": "employse"
    }
  }'
```

### Generate Landing Page

```typescript
const generation = await client.generate({
  spec: {
    name: 'Product Landing',
    type: 'landing_page',
    sections: ['hero', 'features', 'pricing'],
    design_system: 'hottr'
  }
});
```

## Next Steps

- [Spec Format](./SPEC_FORMAT.md) - Learn spec syntax
- [Design Integration](./DESIGN_INTEGRATION.md) - Connect DesignMate
- [Deployment](./DEPLOYMENT.md) - Deploy generated apps

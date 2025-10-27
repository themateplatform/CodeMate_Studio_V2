# Deployment Guide

Deploy your BuildMate-generated applications to various hosting platforms.

## Supported Platforms

BuildMate supports deployment to:
- Vercel
- Netlify
- Replit
- Lovable
- AWS Amplify
- Cloudflare Pages
- Custom hosting

## Quick Deploy

### Via BuildMate Interface

1. Generate your application
2. Click "Deploy" button
3. Select platform (Vercel, Netlify, etc.)
4. Authorize platform connection
5. Configure deployment settings
6. Deploy!

### Via CLI

```bash
# Deploy to Vercel
buildmate deploy ./my-app --platform vercel

# Deploy to Netlify
buildmate deploy ./my-app --platform netlify

# Deploy to Replit
buildmate deploy ./my-app --platform replit
```

## Platform-Specific Guides

### Vercel

**Prerequisites:**
- Vercel account
- Vercel CLI installed: `npm i -g vercel`

**Deploy:**
```bash
cd generated-app
vercel
```

**Configure:**
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_URL": "@api-url"
  }
}
```

**Custom Domain:**
```bash
vercel --prod --alias my-app.com
```

### Netlify

**Prerequisites:**
- Netlify account
- Netlify CLI: `npm i -g netlify-cli`

**Deploy:**
```bash
cd generated-app
netlify deploy --prod
```

**Configure:**
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
```

**Environment Variables:**
```bash
netlify env:set VITE_API_URL https://api.example.com
```

### Replit

**Prerequisites:**
- Replit account
- Git repository

**Deploy:**

1. Connect GitHub repository
2. Replit auto-detects React + Vite
3. Configure environment variables
4. Deploy with Autoscale, Static, or Reserved VM

**Configuration:**
```toml
# .replit
run = "npm run dev"

[deployment]
build = ["npm", "run", "build"]
run = ["npm", "start"]
```

### Lovable

**Prerequisites:**
- Lovable account
- GitHub repository

**Deploy:**

1. Import GitHub repository
2. Lovable handles build/deployment
3. Automatic preview deployments
4. Custom domain support

### AWS Amplify

**Prerequisites:**
- AWS account
- Amplify CLI: `npm i -g @aws-amplify/cli`

**Deploy:**
```bash
amplify init
amplify add hosting
amplify publish
```

**Configure:**
```yaml
# amplify.yml
version: 1
frontend:
  phases:
    build:
      commands:
        - npm ci
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
```

### Cloudflare Pages

**Prerequisites:**
- Cloudflare account

**Deploy:**
```bash
npm run build
npx wrangler pages publish dist
```

**Configure:**
```toml
# wrangler.toml
name = "my-app"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"
```

## Environment Variables

### Required Variables

```bash
# API Configuration
VITE_API_URL=https://api.example.com
VITE_APP_NAME=My App

# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx

# Authentication
VITE_GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# AI Services (if using)
OPENROUTER_API_KEY=xxx
```

### Setting Variables

**Vercel:**
```bash
vercel env add VITE_API_URL
```

**Netlify:**
```bash
netlify env:set VITE_API_URL https://api.example.com
```

**Replit:**
Add in Secrets tab or `.env` file

**GitHub Actions:**
Add in repository Settings > Secrets

## Custom Domain

### Vercel
```bash
vercel domains add my-app.com
```

### Netlify
```bash
netlify domains:add my-app.com
```

### Cloudflare
1. Add site to Cloudflare
2. Update nameservers
3. Connect to Pages project

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  script:
    - npm ci
    - npm run build
    - netlify deploy --prod --dir=dist
  only:
    - main
```

## Database Deployment

### Supabase

```bash
# Link project
supabase link --project-ref your-project

# Push migrations
supabase db push

# Deploy functions
supabase functions deploy
```

### Neon DB

```bash
# Create branch
neon branches create --name production

# Apply migrations
npm run db:push
```

## Monitoring

### Set Up Monitoring

**Vercel Analytics:**
```typescript
// Add to app
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <>
      <YourApp />
      <Analytics />
    </>
  );
}
```

**Sentry Error Tracking:**
```bash
npm install @sentry/react
```

Configure:
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV
});
```

## Rollback

### Vercel
```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote [deployment-url]
```

### Netlify
```bash
# List deploys
netlify deploys:list

# Restore deploy
netlify deploys:restore [deploy-id]
```

## Performance Optimization

### Build Optimization

```typescript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
};
```

### CDN Caching

```javascript
// vercel.json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Build Fails

**Error:** `Cannot find module`
**Solution:** Ensure all dependencies in `package.json`

**Error:** `Out of memory`
**Solution:** Increase Node memory: `NODE_OPTIONS=--max_old_space_size=4096`

### Environment Variables Not Working

**Error:** Variables undefined in production
**Solution:** Ensure variables prefixed with `VITE_` for Vite apps

### 404 Errors on Routes

**Error:** Direct URLs return 404
**Solution:** Add redirect rules for SPA:

```toml
# netlify.toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Best Practices

1. **Use Environment Variables**: Never commit secrets
2. **Enable HTTPS**: All platforms support free SSL
3. **Set Up Monitoring**: Track errors and performance
4. **Automate Deployments**: Use CI/CD pipelines
5. **Test Before Production**: Use preview deployments
6. **Configure Caching**: Optimize static asset delivery

## Next Steps

- [Spec Format](./SPEC_FORMAT.md) - Define applications
- [Design Integration](./DESIGN_INTEGRATION.md) - Use design tokens
- [API Reference](./API.md) - Programmatic usage

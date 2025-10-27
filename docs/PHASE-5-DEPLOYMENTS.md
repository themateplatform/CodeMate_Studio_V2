# Phase 5: Replit Deployments Configuration

## Overview

This phase implements comprehensive deployment strategies for BuildMate Studio using all available Replit deployment types:

1. **Autoscale Deployment** - Main production deployment for the full-stack application
2. **Static Deployment** - Frontend-only deployment for client-side only mode
3. **Scheduled Deployment** - Background jobs and maintenance tasks
4. **Reserved VM Deployment** - Dedicated compute for enterprise workloads

## Deployment Types

### 1. Autoscale Deployment (Primary)

**Purpose**: Production-ready full-stack application with automatic scaling
**Best for**: Main application serving web traffic with dynamic backend

**Configuration**:
- **Build Command**: `npm run build`
- **Run Command**: `npm run start`
- **Machine**: 1 vCPU, 1GB RAM (auto-scales)
- **Max Machines**: 10
- **Port**: 5000

**Features**:
- Auto-scales from 0 to 10 instances based on traffic
- Pay-per-request pricing
- Custom domain support
- SSL/TLS termination
- Health checks
- Zero-downtime deployments

### 2. Static Deployment

**Purpose**: Client-side only deployment for static frontend
**Best for**: Preview builds, documentation, static demos

**Configuration**:
- **Public Directory**: `dist/public`
- **Build Command**: `npm run build:static`
- **Index File**: `index.html`
- **Error Page**: `404.html`

**Features**:
- Global CDN distribution
- Automatic caching
- Custom headers
- URL rewrites for SPA
- Cost-effective for static content

### 3. Scheduled Deployment

**Purpose**: Background jobs and maintenance tasks
**Best for**: Database cleanup, report generation, health checks

**Configuration**:
- **Schedule**: Various cron expressions
- **Machine**: 0.5 vCPU, 512MB RAM
- **Timeout**: 30 minutes
- **Build Command**: `npm run build:worker`
- **Run Command**: `npm run worker`

**Jobs Available**:
- Database maintenance (daily)
- Analytics aggregation (hourly)
- System health checks (every 5 minutes)
- Backup operations (weekly)

### 4. Reserved VM Deployment

**Purpose**: Always-on dedicated compute for enterprise features
**Best for**: WebSocket connections, real-time collaboration, intensive processing

**Configuration**:
- **Machine**: 2 vCPU, 4GB RAM
- **Always On**: Yes
- **Private**: Enterprise only
- **Build Command**: `npm run build:enterprise`
- **Run Command**: `npm run start:enterprise`

**Features**:
- Dedicated resources
- Predictable performance
- Always-on availability
- Private networking (Enterprise)
- Custom resource allocation

## Build Scripts

The following npm scripts are configured for different deployment types:

```json
{
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "build:static": "VITE_DEPLOYMENT_TYPE=static vite build",
  "build:worker": "esbuild server/jobs/*.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/jobs",
  "build:enterprise": "VITE_DEPLOYMENT_TYPE=enterprise vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "start:enterprise": "NODE_ENV=production DEPLOYMENT_TYPE=enterprise node dist/index.js",
  "worker": "node dist/jobs/worker.js"
}
```

## Environment Variables by Deployment Type

### All Deployments
- `DATABASE_URL` - Supabase database connection
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key
- `SESSION_SECRET` - Session encryption key

### Autoscale & Reserved VM Only
- `OPENAI_API_KEY` - AI functionality
- `GITHUB_CLIENT_ID` - GitHub integration
- `GITHUB_CLIENT_SECRET` - GitHub OAuth

### Static Deployment Only
- `VITE_SUPABASE_URL` - Client-side Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Client-side Supabase key
- `VITE_API_BASE_URL` - Backend API endpoint

## Security Considerations

### Network Security
- All deployments use HTTPS/TLS
- Environment variables are encrypted at rest
- API keys use Supabase Edge Functions proxy

### Access Control
- Static deployments have no server-side secrets
- Reserved VM can be configured as private
- Scheduled jobs run with minimal permissions

### Data Protection
- Database access through Supabase RLS
- Session data encrypted
- Audit logging enabled

## Monitoring & Observability

### Health Checks
- `/health` endpoint for all deployments
- Database connectivity checks
- External service availability

### Metrics Collection
- Request/response times
- Error rates
- Resource utilization
- User activity

### Logging
- Structured JSON logging
- Error tracking
- Performance monitoring
- Security events

## Deployment Workflow

### Development → Staging → Production

1. **Development**: Local development with hot reload
2. **Staging**: Autoscale deployment with staging data
3. **Production**: Multiple deployment types as needed

### CI/CD Integration

All deployments are triggered through GitHub Actions:

1. Code pushed to feature branch → No deployment
2. PR merged to `main` → Staging autoscale deployment
3. Release tag created → Production deployment to all types
4. Manual trigger → Specific deployment type

## Cost Optimization

### Autoscale
- Scales to zero when idle
- Pay only for active requests
- Optimized for variable traffic

### Static
- No compute costs
- CDN bandwidth pricing
- Ideal for client-only features

### Scheduled
- Pay only for job execution time
- Configurable timeouts
- Resource-appropriate sizing

### Reserved VM
- Predictable monthly costs
- Dedicated resources
- Best for consistent workloads

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check build logs in deployment console
   - Verify all dependencies are installed
   - Ensure environment variables are set

2. **Runtime Errors**
   - Check application logs
   - Verify database connectivity
   - Validate environment configuration

3. **Performance Issues**
   - Monitor resource usage
   - Check scaling metrics
   - Review database query performance

### Support Resources

- Replit deployment documentation
- Community forums
- Support tickets for Enterprise users
- Internal monitoring dashboards

## Implementation Status

- [x] Autoscale deployment configuration
- [x] Build pipeline optimization
- [x] Environment variable setup
- [ ] Static deployment configuration
- [ ] Scheduled job implementation
- [ ] Reserved VM configuration
- [ ] Monitoring integration
- [ ] Cost optimization features
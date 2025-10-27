# BuildMate Studio Deployment Guide

## Overview

BuildMate Studio supports multiple deployment strategies on Replit, each optimized for different use cases and workloads. This guide covers all four deployment types and how to configure them for your needs.

## Deployment Types

### 1. Autoscale Deployment (Default)

**Best for**: Production web applications with variable traffic

#### Features
- Automatic scaling from 0 to 10 instances
- Pay-per-request pricing model
- Zero-downtime deployments
- Custom domain support
- SSL/TLS termination
- Health checks and monitoring

#### Configuration
```bash
# Deploy with autoscale (default)
./scripts/deploy.sh autoscale

# Or deploy manually through Replit UI:
# 1. Open Publishing tool
# 2. Select "Autoscale" 
# 3. Configure machine settings (1 vCPU, 1GB RAM)
# 4. Set max replicas to 10
# 5. Enable health checks on /health endpoint
```

#### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `OPENAI_API_KEY` - (Optional) AI features
- `GITHUB_CLIENT_ID` - (Optional) GitHub integration
- `GITHUB_CLIENT_SECRET` - (Optional) GitHub OAuth

#### Monitoring
- Health endpoint: `https://your-app.replit.app/health`
- Readiness probe: `https://your-app.replit.app/ready`
- Metrics: Available in Replit deployment dashboard

### 2. Static Deployment

**Best for**: Frontend-only apps, demos, documentation sites

#### Features
- Global CDN distribution
- Automatic caching and compression
- Custom 404 pages
- URL rewrites for SPAs
- No compute costs
- Security headers

#### Configuration
```bash
# Deploy as static site
./scripts/deploy.sh static

# Manual configuration:
# 1. Open Publishing tool
# 2. Select "Static"
# 3. Set public directory to "dist"
# 4. Configure build command: npm run build:static
```

#### Build Process
The static build creates a client-only version:
- Removes server-side functionality
- Bundles all assets for CDN
- Configures environment for client-side only
- Sets up SPA routing with URL rewrites

#### Environment Variables Required
- `VITE_SUPABASE_URL` - Client-side Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Client-side Supabase key
- `VITE_API_BASE_URL` - Backend API endpoint (if separate)

### 3. Scheduled Deployment

**Best for**: Background jobs, maintenance tasks, data processing

#### Features
- Cron-based scheduling
- Multiple job definitions
- Error alerts and monitoring
- Configurable timeouts
- Resource-appropriate sizing

#### Available Jobs
1. **Database Maintenance** - Daily at 2 AM UTC
   - Clean expired sessions
   - Remove old audit logs
   - Optimize database performance

2. **Health Checks** - Every 5 minutes
   - System component validation
   - External service connectivity
   - Resource usage monitoring

3. **Analytics Aggregation** - Hourly
   - User activity metrics
   - API usage statistics
   - Performance metrics

4. **Backup Operations** - Weekly on Sunday at 3 AM UTC
   - Database schema backup
   - Configuration backup
   - User data backup

#### Configuration
```bash
# Deploy scheduled jobs
./scripts/deploy.sh scheduled

# Run individual jobs for testing
npm run worker db-maintenance
npm run worker health-check
npm run worker analytics
npm run worker backup
```

### 4. Reserved VM Deployment

**Best for**: Enterprise applications, always-on services, high-traffic apps

#### Features
- Dedicated compute resources
- Predictable performance
- Always-on availability
- Private networking (Enterprise)
- Custom resource allocation
- WebSocket support

#### Configuration
```bash
# Deploy to reserved VM
./scripts/deploy.sh enterprise

# Manual configuration:
# 1. Open Publishing tool
# 2. Select "Reserved VM"
# 3. Choose machine size (2 vCPU, 4GB RAM)
# 4. Enable private deployment (if available)
# 5. Configure health checks
```

#### Enterprise Features
- WebSocket server on port 8080
- Real-time collaboration support
- Enhanced monitoring and alerting
- Automatic backups
- Custom firewall rules

## Deployment Workflow

### Development to Production Pipeline

1. **Development**: Local development with hot reload
   ```bash
   npm run dev
   ```

2. **Testing**: Pre-deployment validation
   ```bash
   npm run check  # Type checking
   curl http://localhost:5000/health  # Health validation
   ```

3. **Staging**: Deploy to autoscale for testing
   ```bash
   ./scripts/deploy.sh autoscale --dry-run  # Preview
   ./scripts/deploy.sh autoscale            # Deploy
   ```

4. **Production**: Deploy appropriate type for workload
   ```bash
   ./scripts/deploy.sh enterprise  # High-traffic production
   ./scripts/deploy.sh static      # Static frontend
   ./scripts/deploy.sh scheduled   # Background jobs
   ```

### CI/CD Integration

All deployments integrate with GitHub Actions:

1. **Feature Development**: 
   - Push to feature branch → No deployment
   - CI runs tests and validation

2. **Staging Deployment**:
   - Merge to `main` → Autoscale staging deployment
   - Automated testing and validation

3. **Production Release**:
   - Create release tag → Production deployment
   - Manual approval gates for critical changes

### Monitoring and Troubleshooting

#### Health Monitoring
All deployments provide comprehensive health checks:

```bash
# Check overall health
curl https://your-app.replit.app/health

# Quick readiness check
curl https://your-app.replit.app/ready

# Liveness probe
curl https://your-app.replit.app/live
```

#### Common Issues

1. **Build Failures**
   - Check build logs in deployment console
   - Verify all dependencies are in package.json
   - Ensure environment variables are configured

2. **Runtime Errors**
   - Review application logs
   - Test database connectivity
   - Validate environment configuration

3. **Performance Issues**
   - Monitor resource usage in dashboard
   - Check autoscaling metrics
   - Review database query performance

4. **Connectivity Issues**
   - Verify health check endpoints
   - Test external service connections
   - Check firewall and security settings

## Security Considerations

### Environment Variable Management
- Use Replit's secret management system
- Never commit secrets to version control
- Rotate keys regularly
- Use different keys per environment

### Network Security
- All deployments use HTTPS/TLS
- Private deployments for enterprise (when available)
- Custom firewall rules for reserved VMs
- Rate limiting on all endpoints

### Access Control
- Role-based permissions through Supabase RLS
- Session-based authentication
- API key management through Edge Functions
- Audit logging for all operations

## Cost Optimization

### Deployment Type Selection
- **Development/Testing**: Autoscale (scales to zero)
- **Low Traffic**: Static deployment (no compute cost)
- **Background Jobs**: Scheduled (pay per execution)
- **High Traffic**: Reserved VM (predictable costs)

### Resource Optimization
- Use appropriate machine sizes
- Configure autoscaling limits
- Implement caching strategies
- Optimize build sizes

### Monitoring and Alerting
- Set up cost alerts
- Monitor resource usage
- Track scaling metrics
- Review monthly usage reports

## Support and Maintenance

### Backup Strategy
- Daily database backups (automated)
- Configuration backups (weekly)
- Code versioning through Git
- Environment variable backups

### Update Process
1. Test changes in development
2. Deploy to staging environment
3. Run automated test suite
4. Deploy to production with approval
5. Monitor deployment health
6. Rollback if issues detected

### Getting Help
- Replit documentation and community forums
- GitHub issues for application-specific problems
- Enterprise support for business plans
- Internal monitoring dashboards for real-time status

---

## Quick Reference

| Deployment Type | Use Case | Cost Model | Scaling | Best For |
|----------------|----------|------------|---------|----------|
| Autoscale | Web apps | Pay-per-request | 0-10 instances | Variable traffic |
| Static | Frontend only | CDN bandwidth | N/A | Low cost sites |
| Scheduled | Background jobs | Per execution | Single instance | Cron jobs |
| Reserved VM | Always-on apps | Monthly fixed | Always on | High traffic |

### Command Reference
```bash
# Test deployment configuration
./scripts/deploy.sh <type> --dry-run

# Force deployment (skip validation)
./scripts/deploy.sh <type> --force

# Check application health
curl https://your-app.replit.app/health

# Run background job
npm run worker <job-name>
```
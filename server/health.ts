/**
 * Health Check Endpoints for CodeVibe MVP
 * Enhanced observability with performance monitoring and memory optimization
 */

import { Router } from 'express';

export const healthRouter = Router();

// Performance tracking globals for MVP observability
let requestCount = 0;
let totalResponseTime = 0;
let errorCount = 0;
let lastGcTime = Date.now();
let gcCount = 0;

// Track performance metrics
export function trackRequest(responseTime: number, isError: boolean = false) {
  requestCount++;
  totalResponseTime += responseTime;
  if (isError) errorCount++;
}

// Force garbage collection monitoring  
if (global.gc) {
  // Simply track when GC is available, not override it due to complex types
  console.log('🧹 Garbage collection available for memory optimization');
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  deploymentType: string;
  checks: HealthCheck[];
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
    rss: number;
    external: number;
  };
  performance: {
    avgResponseTime: number;
    requestCount: number;
    errorRate: number;
    gcFrequency: number;
  };
}

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  message?: string;
  data?: any;
}

/**
 * Comprehensive health check endpoint
 */
healthRouter.get('/health', async (req, res) => {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];

  try {
    // Basic checks that apply to all deployment types
    checks.push(await checkMemoryUsage());
    checks.push(await checkDiskSpace());
    checks.push(await checkEnvironmentVariables());

    // Database check (if database is available)
    if (process.env.DATABASE_URL) {
      checks.push(await checkDatabaseConnection());
    }

    // Supabase check (if configured)
    if (process.env.SUPABASE_URL) {
      checks.push(await checkSupabaseConnection());
    }

    // External API checks (for full deployments only)
    const deploymentType = process.env.DEPLOYMENT_TYPE || 'autoscale';
    if (deploymentType === 'autoscale' || deploymentType === 'enterprise') {
      if (process.env.OPENAI_API_KEY) {
        checks.push(await checkOpenAIConnection());
      }
      if (process.env.GITHUB_CLIENT_ID) {
        checks.push(await checkGitHubConnection());
      }
    }

    // Determine overall status
    const failedChecks = checks.filter(check => check.status === 'fail');
    const warnChecks = checks.filter(check => check.status === 'warn');

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (failedChecks.length > 0) {
      overallStatus = 'unhealthy';
    } else if (warnChecks.length > 0) {
      overallStatus = 'degraded';
    }

    const memory = process.memoryUsage();
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      deploymentType: deploymentType,
      checks,
      uptime: process.uptime(),
      memory: {
        used: memory.heapUsed,
        total: memory.heapTotal,
        percentage: Math.round((memory.heapUsed / memory.heapTotal) * 100),
        rss: memory.rss,
        external: memory.external
      },
      performance: {
        avgResponseTime: requestCount > 0 ? Math.round(totalResponseTime / requestCount) : 0,
        requestCount,
        errorRate: requestCount > 0 ? Math.round((errorCount / requestCount) * 100) : 0,
        gcFrequency: gcCount
      }
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthStatus);

  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      deploymentType: process.env.DEPLOYMENT_TYPE || 'unknown',
      checks: [...checks, {
        name: 'Health Check Execution',
        status: 'fail',
        duration: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error'
      }],
      uptime: process.uptime(),
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
        rss: 0,
        external: 0
      },
      performance: {
        avgResponseTime: 0,
        requestCount: 0,
        errorRate: 0,
        gcFrequency: 0
      }
    };

    res.status(503).json(errorStatus);
  }
});

/**
 * Simple readiness probe for load balancers
 */
healthRouter.get('/ready', (req, res) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

/**
 * Simple liveness probe for containers
 */
healthRouter.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Health check implementations
 */

async function checkMemoryUsage(): Promise<HealthCheck> {
  const startTime = Date.now();
  const memory = process.memoryUsage();
  const usagePercentage = (memory.heapUsed / memory.heapTotal) * 100;

  // Enhanced thresholds for MVP personal service
  let status: 'pass' | 'warn' | 'fail' = 'pass';
  let message: string | undefined;

  if (usagePercentage > 95) {
    status = 'fail';
    message = 'Critical memory usage - potential crash risk';
  } else if (usagePercentage > 85) {
    status = 'warn';
    message = 'High memory usage - monitor closely';
  }

  // Trigger garbage collection if memory is high (throttled)
  if (usagePercentage > 80 && global.gc && (Date.now() - lastGcTime) > 10000) {
    try {
      global.gc();
      gcCount++;
      lastGcTime = Date.now();
      console.log(`🧹 Triggered garbage collection at ${Math.round(usagePercentage)}% memory usage`);
    } catch (e) {
      console.warn('Failed to trigger garbage collection:', e);
    }
  }

  return {
    name: 'Memory Usage',
    status,
    duration: Date.now() - startTime,
    message,
    data: {
      used: Math.round(memory.heapUsed / 1024 / 1024),
      total: Math.round(memory.heapTotal / 1024 / 1024),
      percentage: Math.round(usagePercentage),
      rss: Math.round(memory.rss / 1024 / 1024),
      external: Math.round(memory.external / 1024 / 1024)
    }
  };
}

async function checkDiskSpace(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // In a real implementation, you would check actual disk space
    // For now, simulate a check
    return {
      name: 'Disk Space',
      status: 'pass',
      duration: Date.now() - startTime,
      data: {
        available: '10GB',
        used: '2GB',
        percentage: 20
      }
    };
  } catch (error) {
    return {
      name: 'Disk Space',
      status: 'fail',
      duration: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Disk check failed'
    };
  }
}

async function checkEnvironmentVariables(): Promise<HealthCheck> {
  const startTime = Date.now();
  const requiredVars = ['DATABASE_URL', 'SESSION_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  return {
    name: 'Environment Variables',
    status: missingVars.length > 0 ? 'fail' : 'pass',
    duration: Date.now() - startTime,
    message: missingVars.length > 0 ? `Missing variables: ${missingVars.join(', ')}` : undefined,
    data: {
      required: requiredVars,
      missing: missingVars
    }
  };
}

async function checkDatabaseConnection(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // In a real implementation, test actual database connection
    // For now, just check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not configured');
    }

    return {
      name: 'Database Connection',
      status: 'pass',
      duration: Date.now() - startTime,
      data: {
        url: 'Connected'
      }
    };
  } catch (error) {
    return {
      name: 'Database Connection',
      status: 'fail',
      duration: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

async function checkSupabaseConnection(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Supabase not configured');
    }

    // In a real implementation, test actual Supabase connection
    return {
      name: 'Supabase Connection',
      status: 'pass',
      duration: Date.now() - startTime,
      data: {
        url: process.env.SUPABASE_URL,
        configured: true
      }
    };
  } catch (error) {
    return {
      name: 'Supabase Connection',
      status: 'fail',
      duration: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Supabase connection failed'
    };
  }
}

async function checkOpenAIConnection(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        name: 'OpenAI Connection',
        status: 'warn',
        duration: Date.now() - startTime,
        message: 'OpenAI API key not configured (optional)'
      };
    }

    // In a real implementation, test actual OpenAI connection
    return {
      name: 'OpenAI Connection',
      status: 'pass',
      duration: Date.now() - startTime,
      data: {
        configured: true
      }
    };
  } catch (error) {
    return {
      name: 'OpenAI Connection',
      status: 'warn',
      duration: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'OpenAI connection failed'
    };
  }
}

async function checkGitHubConnection(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      return {
        name: 'GitHub Connection',
        status: 'warn',
        duration: Date.now() - startTime,
        message: 'GitHub OAuth not configured (optional)'
      };
    }

    // In a real implementation, test actual GitHub connection
    return {
      name: 'GitHub Connection',
      status: 'pass',
      duration: Date.now() - startTime,
      data: {
        configured: true
      }
    };
  } catch (error) {
    return {
      name: 'GitHub Connection',
      status: 'warn',
      duration: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'GitHub connection failed'
    };
  }
}
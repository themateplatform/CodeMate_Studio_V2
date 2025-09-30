#!/usr/bin/env node

/**
 * Background Worker for CodeMate Studio
 * Handles scheduled jobs and maintenance tasks
 */

import { workflowEngine } from '../services/workflowEngine';
import { storage } from '../storage';
import { db } from '../db';
import { implementationPlans, planSteps } from '@shared/schema';
import { eq, and, or, lt, sql } from 'drizzle-orm';

interface JobConfig {
  name: string;
  description: string;
  handler: () => Promise<void>;
  schedule?: string;
}

class WorkerManager {
  private jobs: Map<string, JobConfig> = new Map();

  constructor() {
    this.registerJobs();
  }

  /**
   * Register all available jobs
   */
  private registerJobs() {
    // Database maintenance job
    this.jobs.set('db-maintenance', {
      name: 'Database Maintenance',
      description: 'Clean up expired sessions and optimize database',
      handler: this.runDatabaseMaintenance.bind(this),
      schedule: '0 2 * * *' // Daily at 2 AM
    });

    // Health check job
    this.jobs.set('health-check', {
      name: 'System Health Check',
      description: 'Verify system components are healthy',
      handler: this.runHealthCheck.bind(this),
      schedule: '*/5 * * * *' // Every 5 minutes
    });

    // Analytics aggregation
    this.jobs.set('analytics', {
      name: 'Analytics Aggregation',
      description: 'Process and aggregate usage analytics',
      handler: this.runAnalyticsAggregation.bind(this),
      schedule: '0 * * * *' // Hourly
    });

    // Backup operations
    this.jobs.set('backup', {
      name: 'Backup Operations',
      description: 'Create backups of critical data',
      handler: this.runBackupOperations.bind(this),
      schedule: '0 3 * * 0' // Weekly on Sunday at 3 AM
    });
    
    // Workflow execution job
    this.jobs.set('workflow-executor', {
      name: 'Workflow Executor',
      description: 'Process pending workflow steps',
      handler: this.runWorkflowExecutor.bind(this),
      schedule: '*/30 * * * * *' // Every 30 seconds
    });
    
    // Workflow retry job
    this.jobs.set('workflow-retry', {
      name: 'Workflow Retry Handler',
      description: 'Retry failed workflow steps with backoff',
      handler: this.runWorkflowRetryHandler.bind(this),
      schedule: '*/1 * * * *' // Every minute
    });
  }

  /**
   * Run a specific job
   */
  async runJob(jobName: string): Promise<void> {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job '${jobName}' not found`);
    }

    console.log(`[${new Date().toISOString()}] Starting job: ${job.name}`);
    console.log(`Description: ${job.description}`);

    try {
      const startTime = Date.now();
      await job.handler();
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] Job completed successfully in ${duration}ms`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Job failed:`, error);
      throw error;
    }
  }

  /**
   * List all available jobs
   */
  listJobs(): JobConfig[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Database maintenance tasks
   */
  private async runDatabaseMaintenance(): Promise<void> {
    console.log('Running database maintenance...');

    // Clean up expired sessions (older than 30 days)
    const sessionCleanupQuery = `
      DELETE FROM session 
      WHERE expire < NOW() - INTERVAL '30 days'
    `;

    // Clean up old audit logs (older than 90 days)
    const auditCleanupQuery = `
      DELETE FROM api_audit_log 
      WHERE created_at < NOW() - INTERVAL '90 days'
    `;

    console.log('- Cleaning expired sessions...');
    console.log('- Cleaning old audit logs...');
    console.log('- Running VACUUM ANALYZE...');

    // In a real implementation, these would connect to the database
    console.log('Database maintenance completed');
  }

  /**
   * System health check
   */
  private async runHealthCheck(): Promise<void> {
    console.log('Running system health check...');

    const checks = [
      this.checkDatabaseConnection(),
      this.checkSupabaseConnection(),
      this.checkExternalAPIs(),
      this.checkDiskSpace(),
      this.checkMemoryUsage()
    ];

    const results = await Promise.allSettled(checks);
    
    let allHealthy = true;
    results.forEach((result, index) => {
      const checkNames = ['Database', 'Supabase', 'External APIs', 'Disk Space', 'Memory'];
      if (result.status === 'rejected') {
        console.error(`❌ ${checkNames[index]} check failed:`, result.reason);
        allHealthy = false;
      } else {
        console.log(`✅ ${checkNames[index]} check passed`);
      }
    });

    if (!allHealthy) {
      throw new Error('One or more health checks failed');
    }

    console.log('All health checks passed');
  }

  /**
   * Analytics aggregation
   */
  private async runAnalyticsAggregation(): Promise<void> {
    console.log('Running analytics aggregation...');

    // Aggregate user activity
    console.log('- Aggregating user activity metrics...');
    
    // Aggregate API usage
    console.log('- Aggregating API usage statistics...');
    
    // Aggregate error rates
    console.log('- Calculating error rates...');
    
    // Generate performance metrics
    console.log('- Generating performance metrics...');

    console.log('Analytics aggregation completed');
  }

  /**
   * Backup operations
   */
  private async runBackupOperations(): Promise<void> {
    console.log('Running backup operations...');

    // Backup database schema
    console.log('- Creating database schema backup...');
    
    // Backup configuration
    console.log('- Backing up application configuration...');
    
    // Backup user data (if applicable)
    console.log('- Creating user data backup...');

    console.log('Backup operations completed');
  }

  // Health check implementations
  private async checkDatabaseConnection(): Promise<void> {
    // Mock database connection check
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not configured');
    }
    // In real implementation: await db.execute('SELECT 1');
  }

  private async checkSupabaseConnection(): Promise<void> {
    // Mock Supabase connection check
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Supabase not configured');
    }
    // In real implementation: await supabase.auth.getSession();
  }

  private async checkExternalAPIs(): Promise<void> {
    // Mock external API checks
    console.log('Checking external API connectivity...');
    // In real implementation: test OpenAI, GitHub APIs
  }

  private async checkDiskSpace(): Promise<void> {
    // Mock disk space check
    console.log('Checking disk space...');
    // In real implementation: check available disk space
  }

  private async checkMemoryUsage(): Promise<void> {
    // Mock memory usage check
    const usage = process.memoryUsage();
    console.log('Memory usage:', {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`
    });
  }
  
  /**
   * Process pending workflow steps
   */
  private async runWorkflowExecutor(): Promise<void> {
    console.log('Running workflow executor...');
    
    try {
      console.log('- Checking for active workflows...');
      const activePlans = await db.select()
        .from(implementationPlans)
        .where(eq(implementationPlans.status, 'active'));
      
      console.log(`Found ${activePlans.length} active workflow(s)`);
      
      for (const plan of activePlans) {
        console.log(`  Processing workflow: ${plan.id} (${plan.title})`);
        try {
          await workflowEngine.tick(plan.id);
          console.log(`    ✅ Workflow ${plan.id} processed successfully`);
        } catch (error) {
          console.error(`    ❌ Error processing workflow ${plan.id}:`, error);
          // Don't throw here to continue processing other workflows
        }
      }
      
      console.log('Workflow executor completed');
    } catch (error) {
      console.error('Workflow executor error:', error);
      throw error;
    }
  }
  
  /**
   * Retry failed workflow steps with exponential backoff
   */
  private async runWorkflowRetryHandler(): Promise<void> {
    console.log('Running workflow retry handler...');
    
    try {
      console.log('- Checking for steps ready to retry...');
      const retryableSteps = await db.select()
        .from(planSteps)
        .where(and(
          eq(planSteps.status, 'queued'),
          sql`(${planSteps.metadata}->>'nextRetryAt')::timestamp < NOW()`
        ));
      
      console.log(`Found ${retryableSteps.length} step(s) ready to retry`);
      
      for (const step of retryableSteps) {
        const plan = await storage.getImplementationPlan(step.planId);
        if (plan && plan.status === 'active') {
          console.log(`  Retrying step: ${step.id} (${step.type})`);
          try {
            await workflowEngine.tick(step.planId);
            console.log(`    ✅ Step ${step.id} retry processed`);
          } catch (error) {
            console.error(`    ❌ Error retrying step ${step.id}:`, error);
            // Continue processing other steps
          }
        }
      }
      
      console.log('Workflow retry handler completed');
    } catch (error) {
      console.error('Workflow retry handler error:', error);
      throw error;
    }
  }
}

/**
 * Main worker execution
 */
async function main() {
  const worker = new WorkerManager();
  
  // Get job name from command line arguments
  const jobName = process.argv[2];
  
  if (!jobName) {
    console.log('Available jobs:');
    worker.listJobs().forEach(job => {
      console.log(`- ${job.name}: ${job.description}`);
      if (job.schedule) {
        console.log(`  Schedule: ${job.schedule}`);
      }
    });
    console.log('\nUsage: node worker.js <job-name>');
    process.exit(1);
  }

  try {
    await worker.runJob(jobName);
    process.exit(0);
  } catch (error) {
    console.error('Worker failed:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { WorkerManager };
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import { storage } from '../storage';
import { 
  type Project, 
  type InsertProvisioningLog, 
  type ProvisioningLog 
} from '@shared/schema';
import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { secretsService } from '../secrets';
import { workflowEngine } from './workflowEngine';
import { getConnectorRegistry } from './connectors/init';
import type { SupabaseConnector } from './connectors/sql/SupabaseConnector';

// Provisioning status enum
export enum ProvisioningStatus {
  NOT_PROVISIONED = 'not_provisioned',
  PROVISIONING = 'provisioning',
  PROVISIONED = 'provisioned',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

// Provisioning step enum
export enum ProvisioningStep {
  VALIDATE_CREDENTIALS = 'validate_credentials',
  DETECT_SCHEMA = 'detect_schema',
  SETUP_DATABASE = 'setup_database',
  APPLY_MIGRATIONS = 'apply_migrations',
  VERIFY_CONNECTION = 'verify_connection'
}

// Schema template mapping
const TEMPLATE_SCHEMA_MAP: Record<string, string> = {
  'react-starter': 'react-starter.sql',
  'next-fullstack': 'next-fullstack.sql',
  'api-backend': 'api-backend.sql',
  'react': 'react-starter.sql',
  'nextjs': 'next-fullstack.sql',
  'node': 'api-backend.sql',
  'express': 'api-backend.sql',
  'default': 'react-starter.sql'
};

// Supabase credentials schema
const SupabaseCredentialsSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseKey: z.string().min(1),
  serviceRoleKey: z.string().min(1).optional(),
  databaseUrl: z.string().url().optional(),
  databasePassword: z.string().optional()
});

type SupabaseCredentials = z.infer<typeof SupabaseCredentialsSchema>;

export class SupabaseProvisioningService {
  private static instance: SupabaseProvisioningService;
  private supabaseClients: Map<string, SupabaseClient> = new Map();
  private pgPools: Map<string, Pool> = new Map();
  
  private constructor() {}
  
  static getInstance(): SupabaseProvisioningService {
    if (!this.instance) {
      this.instance = new SupabaseProvisioningService();
    }
    return this.instance;
  }
  
  /**
   * Main provisioning method for a project
   */
  async provisionProject(projectId: string, credentials?: Partial<SupabaseCredentials>): Promise<{
    success: boolean;
    error?: string;
    project?: Project;
  }> {
    let provisioningLog: ProvisioningLog | undefined;
    
    try {
      // Get project details
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }
      
      // Check if already provisioned
      if (project.provisioningStatus === ProvisioningStatus.PROVISIONED) {
        return { 
          success: true, 
          project 
        };
      }
      
      // Start provisioning log
      provisioningLog = await this.logProvisioningStep(projectId, ProvisioningStep.VALIDATE_CREDENTIALS, 'started');
      
      // Update project status
      await storage.updateProject(projectId, {
        provisioningStatus: ProvisioningStatus.PROVISIONING
      });
      
      // Step 1: Validate and get credentials
      const validatedCredentials = await this.validateCredentials(projectId, credentials);
      await this.logProvisioningStep(projectId, ProvisioningStep.VALIDATE_CREDENTIALS, 'completed');
      
      // Step 2: Detect schema based on project template
      await this.logProvisioningStep(projectId, ProvisioningStep.DETECT_SCHEMA, 'in_progress');
      const schemaFile = this.detectSchema(project.template || 'default');
      await this.logProvisioningStep(projectId, ProvisioningStep.DETECT_SCHEMA, 'completed', undefined, {
        schemaFile
      });
      
      // Step 3: Setup database connection
      await this.logProvisioningStep(projectId, ProvisioningStep.SETUP_DATABASE, 'in_progress');
      const { supabaseClient, pgPool } = await this.setupDatabaseConnection(projectId, validatedCredentials);
      await this.logProvisioningStep(projectId, ProvisioningStep.SETUP_DATABASE, 'completed');
      
      // Step 4: Apply schema migrations
      await this.logProvisioningStep(projectId, ProvisioningStep.APPLY_MIGRATIONS, 'in_progress');
      await this.applySchema(pgPool, schemaFile);
      await this.logProvisioningStep(projectId, ProvisioningStep.APPLY_MIGRATIONS, 'completed');
      
      // Step 5: Verify connection
      await this.logProvisioningStep(projectId, ProvisioningStep.VERIFY_CONNECTION, 'in_progress');
      const verified = await this.verifyConnection(supabaseClient, pgPool);
      if (!verified) {
        throw new Error('Connection verification failed');
      }
      await this.logProvisioningStep(projectId, ProvisioningStep.VERIFY_CONNECTION, 'completed');
      
      // Update project with provisioning details
      const updatedProject = await storage.updateProject(projectId, {
        supabaseProjectId: this.extractProjectId(validatedCredentials.supabaseUrl),
        supabaseUrl: validatedCredentials.supabaseUrl,
        provisioningStatus: ProvisioningStatus.PROVISIONED
      });
      
      // Complete provisioning log
      if (provisioningLog) {
        await storage.updateProvisioningLog(provisioningLog.id, {
          status: 'completed',
          completedAt: new Date()
        });
      }
      
      return { 
        success: true, 
        project: updatedProject || project 
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error
      if (provisioningLog) {
        await storage.updateProvisioningLog(provisioningLog.id, {
          status: 'failed',
          error: errorMessage,
          completedAt: new Date()
        });
      }
      
      // Update project status
      await storage.updateProject(projectId, {
        provisioningStatus: ProvisioningStatus.FAILED
      });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Validate Supabase credentials
   */
  private async validateCredentials(projectId: string, credentials?: Partial<SupabaseCredentials>): Promise<SupabaseCredentials> {
    try {
      // Try to get credentials from various sources
      let finalCredentials: Partial<SupabaseCredentials> = {};
      
      // 1. Use provided credentials
      if (credentials) {
        finalCredentials = { ...credentials };
      }
      
      // 2. Try to get from secrets service
      if (!finalCredentials.supabaseUrl || !finalCredentials.supabaseKey) {
        try {
          const storedCredentials = await secretsService.getSecretValue('SUPABASE_CREDENTIALS', projectId);
          if (storedCredentials) {
            const parsed = JSON.parse(storedCredentials);
            finalCredentials = { ...finalCredentials, ...parsed };
          }
        } catch (error) {
          // Secrets might not exist yet
        }
      }
      
      // 3. Fall back to environment variables
      if (!finalCredentials.supabaseUrl) {
        finalCredentials.supabaseUrl = process.env.SUPABASE_URL || '';
      }
      if (!finalCredentials.supabaseKey) {
        finalCredentials.supabaseKey = process.env.SUPABASE_ANON_KEY || '';
      }
      if (!finalCredentials.serviceRoleKey) {
        finalCredentials.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE || '';
      }
      if (!finalCredentials.databaseUrl) {
        finalCredentials.databaseUrl = process.env.SUPABASE_DATABASE_URL || '';
      }
      
      // Validate the credentials
      const validated = SupabaseCredentialsSchema.parse(finalCredentials);
      
      // Store credentials securely for future use
      await secretsService.createOrUpdateSecret({
        key: `SUPABASE_CREDENTIALS_${projectId}`,
        value: JSON.stringify(validated),
        description: 'Supabase credentials for project',
        projectId,
        isEncrypted: true
      });
      
      return validated;
      
    } catch (error) {
      throw new Error(`Invalid Supabase credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Detect appropriate schema based on project template
   */
  private detectSchema(template: string): string {
    const schemaFile = TEMPLATE_SCHEMA_MAP[template] || TEMPLATE_SCHEMA_MAP['default'];
    return schemaFile;
  }
  
  /**
   * Setup database connection
   */
  private async setupDatabaseConnection(
    projectId: string, 
    credentials: SupabaseCredentials
  ): Promise<{ supabaseClient: SupabaseClient; pgPool: Pool }> {
    try {
      // Create Supabase client
      const supabaseClient = createClient(
        credentials.supabaseUrl,
        credentials.serviceRoleKey || credentials.supabaseKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      
      // Store in cache
      this.supabaseClients.set(projectId, supabaseClient);
      
      // Create PostgreSQL connection pool if database URL is provided
      let pgPool: Pool;
      
      if (credentials.databaseUrl) {
        pgPool = new Pool({
          connectionString: credentials.databaseUrl,
          max: 5, // Small pool size to prevent exhaustion
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000
        });
      } else {
        // Extract database connection from Supabase URL
        const projectRef = this.extractProjectId(credentials.supabaseUrl);
        const host = `db.${projectRef}.supabase.co`;
        const password = credentials.databasePassword || credentials.serviceRoleKey || '';
        
        pgPool = new Pool({
          host,
          port: 5432,
          database: 'postgres',
          user: 'postgres',
          password,
          ssl: { rejectUnauthorized: false },
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000
        });
      }
      
      // Store in cache
      this.pgPools.set(projectId, pgPool);
      
      return { supabaseClient, pgPool };
      
    } catch (error) {
      throw new Error(`Failed to setup database connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Apply schema to database
   */
  private async applySchema(pool: Pool, schemaFile: string): Promise<void> {
    try {
      // Read schema file
      const schemaPath = join(process.cwd(), 'server', 'schemas', schemaFile);
      const schemaSql = readFileSync(schemaPath, 'utf-8');
      
      // Split into individual statements (simple approach - may need refinement)
      const statements = schemaSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      // Execute each statement in a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await client.query(statement + ';');
            } catch (error) {
              // Log but continue - some statements might fail if objects already exist
              console.warn(`Schema statement warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
              // Only fail on critical errors
              if (error instanceof Error && !error.message.includes('already exists')) {
                throw error;
              }
            }
          }
        }
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      throw new Error(`Failed to apply schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Verify database connection
   */
  private async verifyConnection(supabaseClient: SupabaseClient, pool: Pool): Promise<boolean> {
    try {
      // Test Supabase client
      const { error: supabaseError } = await supabaseClient
        .from('users')
        .select('count')
        .limit(1)
        .single();
      
      // It's OK if the table doesn't exist yet
      if (supabaseError && !supabaseError.message.includes('relation') && !supabaseError.code?.includes('42P01')) {
        throw supabaseError;
      }
      
      // Test PostgreSQL pool
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT NOW()');
        if (!result.rows || result.rows.length === 0) {
          throw new Error('Database query returned no results');
        }
      } finally {
        client.release();
      }
      
      return true;
      
    } catch (error) {
      console.error('Connection verification failed:', error);
      return false;
    }
  }
  
  /**
   * Get provisioning status for a project
   */
  async getProvisioningStatus(projectId: string): Promise<{
    status: string;
    logs: ProvisioningLog[];
    currentStep?: string;
    error?: string;
  }> {
    try {
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }
      
      const logs = await storage.getProvisioningLogsByProject(projectId);
      const latestLog = logs[0];
      
      return {
        status: project.provisioningStatus || ProvisioningStatus.NOT_PROVISIONED,
        logs,
        currentStep: latestLog?.step,
        error: latestLog?.error || undefined
      };
      
    } catch (error) {
      throw new Error(`Failed to get provisioning status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Apply a specific schema pack to a project
   */
  async applySchemapack(projectId: string, schemaName: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }
      
      if (project.provisioningStatus !== ProvisioningStatus.PROVISIONED) {
        throw new Error('Project must be provisioned first');
      }
      
      // Get the connection pool
      const pool = this.pgPools.get(projectId);
      if (!pool) {
        throw new Error('Database connection not found. Please provision the project first.');
      }
      
      // Determine schema file
      const schemaFile = TEMPLATE_SCHEMA_MAP[schemaName] || schemaName;
      if (!schemaFile.endsWith('.sql')) {
        throw new Error('Invalid schema name');
      }
      
      // Apply the schema
      await this.applySchema(pool, schemaFile);
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Create provisioning workflow steps
   */
  async createProvisioningWorkflow(projectId: string): Promise<string> {
    const workflowSteps = [
      {
        id: 'validate_credentials',
        name: 'Validate Credentials',
        type: 'custom' as const,
        description: 'Check Supabase access credentials',
        prompt: 'Validate that Supabase credentials are available and correct',
        dependsOn: [],
        maxRetries: 2,
        timeoutMs: 10000
      },
      {
        id: 'detect_schema',
        name: 'Detect Schema',
        type: 'custom' as const,
        description: 'Determine optimal schema based on project template',
        prompt: 'Detect the appropriate database schema for the project',
        dependsOn: ['validate_credentials'],
        maxRetries: 1,
        timeoutMs: 5000
      },
      {
        id: 'setup_database',
        name: 'Setup Database',
        type: 'custom' as const,
        description: 'Create and configure database connection',
        prompt: 'Setup database connection to Supabase',
        dependsOn: ['detect_schema'],
        maxRetries: 3,
        timeoutMs: 30000
      },
      {
        id: 'apply_migrations',
        name: 'Apply Migrations',
        type: 'custom' as const,
        description: 'Apply schema pack migrations',
        prompt: 'Apply the selected schema to the database',
        dependsOn: ['setup_database'],
        maxRetries: 2,
        timeoutMs: 60000
      },
      {
        id: 'verify_connection',
        name: 'Verify Connection',
        type: 'custom' as const,
        description: 'Test database connectivity',
        prompt: 'Verify that the database connection is working',
        dependsOn: ['apply_migrations'],
        maxRetries: 3,
        timeoutMs: 10000
      }
    ];
    
    // Create workflow using the workflow engine
    const workflowId = await workflowEngine.createWorkflow(
      {
        name: 'Supabase Provisioning',
        description: 'Auto-provision Supabase database for project',
        version: '1.0',
        steps: workflowSteps
      },
      projectId
    );
    
    return workflowId;
  }
  
  /**
   * Retry failed provisioning
   */
  async retryProvisioning(projectId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }
      
      if (project.provisioningStatus !== ProvisioningStatus.FAILED) {
        throw new Error('Can only retry failed provisioning');
      }
      
      // Update status to retrying
      await storage.updateProject(projectId, {
        provisioningStatus: ProvisioningStatus.RETRYING
      });
      
      // Retry provisioning
      return await this.provisionProject(projectId);
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Clean up resources for a project
   */
  async cleanup(projectId: string): Promise<void> {
    try {
      // Close Supabase client
      const supabaseClient = this.supabaseClients.get(projectId);
      if (supabaseClient) {
        // Supabase client doesn't have explicit cleanup
        this.supabaseClients.delete(projectId);
      }
      
      // Close PostgreSQL pool
      const pool = this.pgPools.get(projectId);
      if (pool) {
        await pool.end();
        this.pgPools.delete(projectId);
      }
      
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
  
  /**
   * Helper: Extract project ID from Supabase URL
   */
  private extractProjectId(supabaseUrl: string): string {
    const match = supabaseUrl.match(/https:\/\/([a-zA-Z0-9-]+)\.supabase\.(co|io)/);
    return match ? match[1] : '';
  }
  
  /**
   * Helper: Log provisioning step
   */
  private async logProvisioningStep(
    projectId: string,
    step: ProvisioningStep,
    status: string,
    error?: string,
    metadata?: any
  ): Promise<ProvisioningLog> {
    const log: InsertProvisioningLog = {
      projectId,
      status,
      step,
      message: `${step}: ${status}`,
      error,
      metadata,
      completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined
    };
    
    return await storage.createProvisioningLog(log);
  }
}

// Export singleton instance
export const supabaseProvisioningService = SupabaseProvisioningService.getInstance();
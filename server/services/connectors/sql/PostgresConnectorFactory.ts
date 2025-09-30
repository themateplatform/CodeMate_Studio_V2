import { z } from 'zod';
import { PostgresConnector, PostgresConnectorConfig } from './PostgresConnector';
import { ConnectorFactory } from '../registry/ConnectorRegistry';
import { ConnectorError, ValidationError } from '../types/errors';
import { ConnectorIntegrationHelpers } from '../utils/integrationHelpers';
import { DataConnectorCredentialsService } from '../../dataConnectorCredentialsService';
import type { DataConnection } from '@shared/schema';

/**
 * Zod schema for PostgreSQL credentials validation
 */
export const PostgresCredentialsSchema = z.object({
  user: z.string()
    .min(1, 'Database username is required')
    .max(63, 'Username too long (max 63 characters)'),
    
  password: z.string()
    .min(1, 'Database password is required')
    .max(1000, 'Password too long'),
    
  host: z.string()
    .min(1, 'Database host is required')
    .max(255, 'Host too long')
    .optional(), // Can be overridden in connection config
    
  port: z.number()
    .int()
    .min(1)
    .max(65535)
    .optional(), // Can be overridden in connection config
    
  database: z.string()
    .min(1, 'Database name is required')
    .max(63, 'Database name too long')
    .optional(), // Can be overridden in connection config
    
  connectionString: z.string()
    .url('Invalid connection string URL')
    .optional(), // Alternative to individual parameters
    
  // Additional connection options that can be in credentials
  applicationName: z.string().max(64).optional(),
  connectTimeout: z.number().int().min(0).max(300).optional(), // seconds
});

/**
 * Zod schema for PostgreSQL SSL configuration
 */
export const PostgresSSLConfigSchema = z.object({
  enabled: z.boolean().default(false),
  rejectUnauthorized: z.boolean().default(true),
  ca: z.string().optional(),
  cert: z.string().optional(),
  key: z.string().optional(),
  mode: z.enum(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']).default('prefer'),
}).strict();

/**
 * Zod schema for PostgreSQL pool configuration
 */
export const PostgresPoolConfigSchema = z.object({
  min: z.number().int().min(1).max(50).default(1),
  max: z.number().int().min(1).max(200).default(10),
  idleTimeoutMillis: z.number().int().min(1000).max(300000).default(30000), // 30s
  connectionTimeoutMillis: z.number().int().min(1000).max(60000).default(5000), // 5s
  acquireTimeoutMillis: z.number().int().min(1000).max(300000).default(60000), // 60s
  maxUses: z.number().int().min(1).default(999999999),
  allowExitOnIdle: z.boolean().default(false),
  keepAlive: z.boolean().default(true),
  keepAliveInitialDelayMillis: z.number().int().min(1000).max(60000).default(10000), // 10s
}).strict();

/**
 * Zod schema for complete PostgreSQL connector configuration
 */
export const PostgresConnectorConfigSchema = z.object({
  // Connection parameters
  host: z.string().min(1).max(255).default('localhost'),
  port: z.number().int().min(1).max(65535).default(5432),
  database: z.string().min(1).max(63).default('postgres'),
  
  // Connection options
  applicationName: z.string().max(64).default('codevibe-connector'),
  connectionString: z.string().url().optional(),
  
  // Pool configuration
  poolConfig: PostgresPoolConfigSchema.default({}),
  
  // SSL configuration
  sslConfig: PostgresSSLConfigSchema.default({ enabled: false }),
  
  // Query configuration
  queryTimeout: z.number().int().min(1000).max(3600000).default(30000), // 30s
  statementTimeout: z.number().int().min(1000).max(3600000).default(30000), // 30s
  
  // Schema configuration
  searchPath: z.array(z.string().min(1)).max(20).default(['public']),
  defaultSchema: z.string().min(1).max(63).default('public'),
  
  // Base connector config properties
  retryPolicy: z.object({
    maxAttempts: z.number().int().min(1).max(10).default(3),
    baseDelay: z.number().int().min(100).max(10000).default(1000),
    maxDelay: z.number().int().min(1000).max(60000).default(10000),
    jitter: z.boolean().default(true),
  }).default({}),
  
  healthCheck: z.object({
    enabled: z.boolean().default(true),
    interval: z.number().int().min(5000).max(300000).default(30000), // 30s
    timeout: z.number().int().min(1000).max(60000).default(5000), // 5s
    retryCount: z.number().int().min(1).max(5).default(3),
  }).default({}),
  
  introspection: z.object({
    enabled: z.boolean().default(true),
    excludedSchemas: z.array(z.string()).default(['information_schema', 'pg_catalog', 'pg_toast']),
    includedTables: z.array(z.string()).optional(),
    excludedTables: z.array(z.string()).default([]),
    maxTables: z.number().int().min(1).max(1000).default(500),
    maxColumns: z.number().int().min(1).max(5000).default(2000),
  }).default({}),
  
  caching: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().int().min(60).max(86400).default(3600), // 1 hour
    maxSize: z.number().int().min(10).max(10000).default(1000),
  }).default({}),
  
}).strict();

/**
 * PostgreSQL connector factory implementation
 */
export class PostgresConnectorFactory implements ConnectorFactory<PostgresConnector, PostgresConnectorConfig> {
  readonly type = 'postgres';
  readonly name = 'PostgreSQL Database';
  readonly description = 'Connect to PostgreSQL databases with full schema introspection and CRUD operations';
  readonly version = '1.0.0';
  
  private credentialsService: DataConnectorCredentialsService;
  
  constructor(credentialsService: DataConnectorCredentialsService) {
    this.credentialsService = credentialsService;
  }
  
  /**
   * Validate configuration against schema
   */
  validateConfig(config: unknown): PostgresConnectorConfig {
    try {
      const result = PostgresConnectorConfigSchema.parse(config);
      
      // Additional validation logic
      this.validateConfigLogic(result);
      
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Invalid PostgreSQL configuration',
          {
            validationErrors: error.errors,
            schema: 'PostgresConnectorConfig'
          }
        );
      }
      throw error;
    }
  }
  
  /**
   * Validate configuration for registry (returns validation result)
   */
  async validateConfigForRegistry(config: unknown): Promise<{ valid: boolean; errors: string[] }> {
    try {
      this.validateConfig(config);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error']
      };
    }
  }
  
  /**
   * Validate credentials against schema
   */
  validateCredentials(credentials: unknown): z.infer<typeof PostgresCredentialsSchema> {
    try {
      const result = PostgresCredentialsSchema.parse(credentials);
      
      // Additional validation - either individual params or connection string required
      if (!result.connectionString && (!result.user || !result.password)) {
        throw new ValidationError('Either connectionString or user/password must be provided');
      }
      
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Invalid PostgreSQL credentials',
          {
            validationErrors: error.errors,
            schema: 'PostgresCredentials'
          }
        );
      }
      throw error;
    }
  }
  
  /**
   * Create default configuration
   */
  createDefaultConfig(overrides?: Partial<PostgresConnectorConfig>): PostgresConnectorConfig {
    const defaultConfig = PostgresConnectorConfigSchema.parse({
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      ...overrides,
    });
    
    return defaultConfig;
  }
  
  /**
   * Test configuration validity by attempting to create a connector
   */
  async testConfig(
    config: PostgresConnectorConfig, 
    credentials: Record<string, any>
  ): Promise<{ valid: boolean; errors?: string[]; warnings?: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Validate configuration
      this.validateConfig(config);
      this.validateCredentials(credentials);
      
      // Test connection by creating a temporary connector
      const connector = new PostgresConnector('test', config);
      
      try {
        await connector.connect(credentials);
        
        // Test basic query
        const result = await connector.execute('SELECT 1 as test');
        if (!result.success) {
          errors.push('Failed to execute test query');
        }
        
        await connector.disconnect();
      } catch (error) {
        errors.push(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Add warnings for potential issues
      if (config.poolConfig.max > 20) {
        warnings.push('High connection pool max size may impact database performance');
      }
      
      if (!config.sslConfig.enabled && config.host !== 'localhost') {
        warnings.push('SSL is disabled for remote connection - consider enabling for security');
      }
      
      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
      
    } catch (error) {
      errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { valid: false, errors };
    }
  }
  
  /**
   * Create a new PostgreSQL connector instance
   */
  async create(
    id: string,
    config: PostgresConnectorConfig,
    dataConnection: DataConnection
  ): Promise<PostgresConnector> {
    // Validate configuration
    const validatedConfig = this.validateConfig(config);
    
    // Get credentials from credentials service
    const credentials = await this.credentialsService.getCredentials(dataConnection.credentialsSecretId);
    
    // Validate credentials
    this.validateCredentials(credentials);
    
    // Create connector instance
    const connector = new PostgresConnector(id, validatedConfig);
    
    // Initialize connection
    try {
      await connector.connect(credentials);
      return connector;
    } catch (error) {
      throw new ConnectorError(
        `Failed to create PostgreSQL connector: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { connectorId: id, config: validatedConfig }
      );
    }
  }
  
  /**
   * Additional configuration validation logic
   */
  private validateConfigLogic(config: PostgresConnectorConfig): void {
    // Validate pool configuration consistency
    if (config.poolConfig.min > config.poolConfig.max) {
      throw new ValidationError('Pool min size cannot be greater than max size');
    }
    
    // Validate timeout configurations
    if (config.queryTimeout > 300000) { // 5 minutes
      throw new ValidationError('Query timeout too high (max 5 minutes)');
    }
    
    if (config.poolConfig.connectionTimeoutMillis > config.poolConfig.acquireTimeoutMillis) {
      throw new ValidationError('Connection timeout should not exceed acquire timeout');
    }
    
    // Validate schema paths
    for (const schema of config.searchPath) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
        throw new ValidationError(`Invalid schema name in search path: ${schema}`);
      }
    }
    
    // Validate SSL configuration
    if (config.sslConfig.enabled && config.sslConfig.mode === 'disable') {
      throw new ValidationError('Cannot enable SSL with disable mode');
    }
    
    if (config.sslConfig.mode === 'verify-full' && !config.sslConfig.ca) {
      throw new ValidationError('CA certificate required for verify-full SSL mode');
    }
  }
  
  /**
   * Get default configuration (required by IConnectorFactory interface)
   */
  getDefaultConfig(): Partial<PostgresConnectorConfig> {
    return this.createDefaultConfig();
  }
  
  /**
   * Get configuration schema for documentation/UI generation
   */
  getConfigSchema() {
    return PostgresConnectorConfigSchema;
  }
  
  /**
   * Get credentials schema for documentation/UI generation
   */
  getCredentialsSchema() {
    return PostgresCredentialsSchema;
  }
  
  /**
   * Get supported features for this connector
   */
  getSupportedFeatures() {
    return {
      schemas: true,
      tables: true,
      views: true,
      functions: true,
      procedures: true,
      triggers: true,
      indexes: true,
      constraints: true,
      sequences: true,
      extensions: true,
      transactions: true,
      savepoints: true,
      streaming: false, // Not implemented yet
      realtime: false,  // Not applicable for standard PostgreSQL
      backup: false,    // Would require additional implementation
      restore: false,   // Would require additional implementation
    };
  }
  
  /**
   * Get example configurations for different use cases
   */
  getExampleConfigs() {
    return {
      development: this.createDefaultConfig({
        host: 'localhost',
        port: 5432,
        database: 'myapp_dev',
        poolConfig: { max: 5, min: 1 },
        sslConfig: { enabled: false }
      }),
      
      production: this.createDefaultConfig({
        host: 'prod-db.example.com',
        port: 5432,
        database: 'myapp',
        poolConfig: { max: 20, min: 5 },
        sslConfig: { enabled: true, mode: 'require' },
        queryTimeout: 10000,
        healthCheck: { interval: 15000 }
      }),
      
      highPerformance: this.createDefaultConfig({
        poolConfig: { 
          max: 50, 
          min: 10,
          keepAlive: true,
          idleTimeoutMillis: 60000 
        },
        caching: { enabled: true, ttl: 7200 },
        queryTimeout: 5000
      })
    };
  }
}
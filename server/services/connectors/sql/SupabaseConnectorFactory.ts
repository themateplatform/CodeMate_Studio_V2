import { z } from 'zod';
import { SupabaseConnector, SupabaseConnectorConfig } from './SupabaseConnector';
import { PostgresConnectorConfigSchema, PostgresCredentialsSchema, PostgresConnectorFactory } from './PostgresConnectorFactory';
import { ConnectorFactory } from '../registry/ConnectorRegistry';
import { ConnectorError, ValidationError } from '../types/errors';
import { ConnectorIntegrationHelpers } from '../utils/integrationHelpers';
import { DataConnectorCredentialsService } from '../../dataConnectorCredentialsService';
import type { DataConnection } from '@shared/schema';

/**
 * Zod schema for Supabase credentials validation
 */
export const SupabaseCredentialsSchema = z.object({
  supabaseUrl: z.string()
    .url('Invalid Supabase URL')
    .refine(url => url.includes('supabase.co') || url.includes('supabase.io'), {
      message: 'Must be a valid Supabase URL'
    }),
    
  supabaseKey: z.string()
    .min(1, 'Supabase API key is required')
    .max(1000, 'API key too long'),
    
  apiKey: z.string()
    .min(1, 'API key is required')
    .max(1000, 'API key too long')
    .optional(), // Alias for supabaseKey
    
  serviceRoleKey: z.string()
    .min(1)
    .max(1000)
    .optional(), // For admin operations
    
  // Optional Postgres connection details for direct SQL access
  user: z.string().max(63).optional(),
  password: z.string().max(1000).optional(),
  host: z.string().max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  database: z.string().max(63).optional(),
  
  // JWT secret for custom auth (if needed)
  jwtSecret: z.string().max(1000).optional(),
  
  // Project reference for easier management
  projectRef: z.string().max(100).optional(),
}).refine(
  (data) => data.supabaseKey || data.apiKey,
  {
    message: "Either supabaseKey or apiKey must be provided",
    path: ["supabaseKey"],
  }
);

/**
 * Zod schema for Supabase auth configuration
 */
export const SupabaseAuthConfigSchema = z.object({
  autoRefreshToken: z.boolean().default(false),
  persistSession: z.boolean().default(false),
  detectSessionInUrl: z.boolean().default(false),
  flowType: z.enum(['implicit', 'pkce']).default('implicit'),
}).strict();

/**
 * Zod schema for Supabase real-time configuration
 */
export const SupabaseRealtimeConfigSchema = z.object({
  enabled: z.boolean().default(false),
  channels: z.array(z.string()).max(50).default([]),
  heartbeatIntervalMs: z.number().int().min(1000).max(60000).default(30000),
  reconnectDelay: z.number().int().min(1000).max(30000).default(5000),
  maxReconnectAttempts: z.number().int().min(1).max(20).default(5),
  enablePresence: z.boolean().default(false),
  enableBroadcast: z.boolean().default(false),
}).strict();

/**
 * Zod schema for Supabase RLS configuration
 */
export const SupabaseRLSConfigSchema = z.object({
  enforceRLS: z.boolean().default(true),
  bypassRLSForService: z.boolean().default(false),
  defaultPolicies: z.array(z.string()).max(20).default([]),
}).strict();

/**
 * Zod schema for Supabase features configuration
 */
export const SupabaseFeaturesConfigSchema = z.object({
  enableEdgeFunctions: z.boolean().default(false),
  enableStorage: z.boolean().default(false),
  enableAuth: z.boolean().default(false),
  enableRealtime: z.boolean().default(false),
}).strict();

/**
 * Zod schema for Supabase API configuration
 */
export const SupabaseAPIConfigSchema = z.object({
  schema: z.string().max(63).default('public'),
  headers: z.record(z.string(), z.string()).default({}),
}).strict();

/**
 * Zod schema for complete Supabase connector configuration
 */
export const SupabaseConnectorConfigSchema = PostgresConnectorConfigSchema.extend({
  // Supabase connection details
  supabaseUrl: z.string()
    .url('Invalid Supabase URL')
    .refine(url => url.includes('supabase.co') || url.includes('supabase.io'), {
      message: 'Must be a valid Supabase URL'
    }),
    
  supabaseKey: z.string()
    .min(1)
    .max(1000)
    .optional(), // Can be provided via credentials
    
  // Configuration objects
  authConfig: SupabaseAuthConfigSchema.default({}),
  realtimeConfig: SupabaseRealtimeConfigSchema.default({ enabled: false }),
  rlsConfig: SupabaseRLSConfigSchema.default({ enforceRLS: true }),
  features: SupabaseFeaturesConfigSchema.default({}),
  apiConfig: SupabaseAPIConfigSchema.default({ schema: 'public' }),
  
}).strict();

/**
 * Supabase connector factory implementation
 */
export class SupabaseConnectorFactory implements ConnectorFactory<SupabaseConnector, SupabaseConnectorConfig> {
  readonly type = 'supabase';
  readonly name = 'Supabase Database';
  readonly description = 'Connect to Supabase PostgreSQL databases with real-time features, RLS, and REST API support';
  readonly version = '1.0.0';
  
  private credentialsService: DataConnectorCredentialsService;
  private postgresFactory: PostgresConnectorFactory;
  
  constructor(credentialsService: DataConnectorCredentialsService) {
    this.credentialsService = credentialsService;
    this.postgresFactory = new PostgresConnectorFactory(credentialsService);
  }
  
  /**
   * Validate configuration against schema
   */
  validateConfig(config: unknown): SupabaseConnectorConfig {
    try {
      const result = SupabaseConnectorConfigSchema.parse(config);
      
      // Additional validation logic
      this.validateConfigLogic(result);
      
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Invalid Supabase configuration',
          {
            validationErrors: error.errors,
            schema: 'SupabaseConnectorConfig'
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
  validateCredentials(credentials: unknown): z.infer<typeof SupabaseCredentialsSchema> {
    try {
      const result = SupabaseCredentialsSchema.parse(credentials);
      
      // Additional validation logic
      this.validateCredentialsLogic(result);
      
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Invalid Supabase credentials',
          {
            validationErrors: error.errors,
            schema: 'SupabaseCredentials'
          }
        );
      }
      throw error;
    }
  }
  
  /**
   * Create default configuration
   */
  createDefaultConfig(overrides?: Partial<SupabaseConnectorConfig>): SupabaseConnectorConfig {
    const defaultConfig = SupabaseConnectorConfigSchema.parse({
      host: 'localhost', // Will be overridden by Supabase URL
      port: 5432,
      database: 'postgres',
      supabaseUrl: 'https://exampleproject1234567890.supabase.co', // Must be provided in actual usage
      authConfig: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        flowType: 'implicit'
      },
      realtimeConfig: {
        enabled: false,
      },
      rlsConfig: {
        enforceRLS: true,
      },
      features: {
        enableEdgeFunctions: false,
        enableStorage: false,
        enableAuth: false,
        enableRealtime: false,
      },
      apiConfig: {
        schema: 'public',
        headers: {}
      },
      ...overrides,
    });
    
    return defaultConfig;
  }
  
  /**
   * Test configuration validity by attempting to create a connector
   */
  async testConfig(
    config: SupabaseConnectorConfig,
    credentials: Record<string, any>
  ): Promise<{ valid: boolean; errors?: string[]; warnings?: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Validate configuration and credentials
      this.validateConfig(config);
      const validatedCredentials = this.validateCredentials(credentials);
      
      // Test connection by creating a temporary connector
      const connector = new SupabaseConnector('test', config);
      
      try {
        await connector.connect(validatedCredentials);
        
        // Test Supabase API connection
        const supabaseClient = await connector.getSupabaseClient();
        const { data, error } = await supabaseClient
          .from('information_schema.tables')
          .select('table_name')
          .limit(1)
          .maybeSingle();
          
        if (error && error.code !== 'PGRST116') {
          errors.push(`Supabase API test failed: ${error.message}`);
        }
        
        // Test basic query if Postgres connection is available
        try {
          const result = await connector.execute('SELECT 1 as test');
          if (!result.success) {
            warnings.push('Direct SQL connection failed, only REST API will be available');
          }
        } catch {
          warnings.push('Direct SQL connection not available, using REST API only');
        }
        
        await connector.disconnect();
        
      } catch (error) {
        errors.push(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Add warnings for potential issues
      if (config.realtimeConfig.enabled && !validatedCredentials.serviceRoleKey) {
        warnings.push('Real-time features may be limited without service role key');
      }
      
      if (!config.rlsConfig.enforceRLS && !validatedCredentials.serviceRoleKey) {
        warnings.push('RLS is disabled but no service role key provided - data access may be limited');
      }
      
      if (config.poolConfig.max > 10) {
        warnings.push('High connection pool max size - Supabase has connection limits');
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
   * Create a new Supabase connector instance
   */
  async create(
    id: string,
    config: SupabaseConnectorConfig,
    dataConnection: DataConnection
  ): Promise<SupabaseConnector> {
    // Validate configuration
    const validatedConfig = this.validateConfig(config);
    
    // Get credentials from credentials service
    const credentials = await this.credentialsService.getCredentials(dataConnection.credentialsSecretId);
    
    // Validate credentials
    this.validateCredentials(credentials);
    
    // Create connector instance
    const connector = new SupabaseConnector(id, validatedConfig);
    
    // Initialize connection
    try {
      await connector.connect(credentials);
      return connector;
    } catch (error) {
      throw new ConnectorError(
        `Failed to create Supabase connector: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { connectorId: id, config: validatedConfig }
      );
    }
  }
  
  /**
   * Additional configuration validation logic
   */
  private validateConfigLogic(config: SupabaseConnectorConfig): void {
    // Validate Supabase URL format
    if (!config.supabaseUrl.match(/^https:\/\/[a-zA-Z0-9-]+\.supabase\.(co|io)$/)) {
      throw new ValidationError('Invalid Supabase URL format');
    }
    
    // Extract project reference from URL for validation
    const urlMatch = config.supabaseUrl.match(/https:\/\/([a-zA-Z0-9-]+)\.supabase\.(co|io)/);
    if (!urlMatch || urlMatch[1].length < 20) {
      throw new ValidationError('Invalid Supabase project reference in URL');
    }
    
    // Validate real-time configuration
    if (config.realtimeConfig.enabled) {
      if (config.realtimeConfig.channels.length > 10) {
        // Note: Would need warnings array here if we want to collect warnings during config validation
        console.warn('High number of real-time channels may impact performance');
      }
      
      if (!config.features.enableRealtime) {
        throw new ValidationError('Real-time config enabled but feature flag is disabled');
      }
    }
    
    // Validate RLS configuration
    if (!config.rlsConfig.enforceRLS && config.rlsConfig.bypassRLSForService) {
      throw new ValidationError('Cannot bypass RLS when RLS is not enforced');
    }
    
    // Validate API configuration
    if (config.apiConfig.schema && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.apiConfig.schema)) {
      throw new ValidationError(`Invalid schema name: ${config.apiConfig.schema}`);
    }
    
    // Validate features consistency
    if (config.features.enableRealtime && !config.realtimeConfig.enabled) {
      throw new ValidationError('Real-time feature enabled but real-time config is disabled');
    }
    
    // Call parent validation for Postgres-specific settings
    try {
      // Create a temporary config for parent validation (removing Supabase-specific fields)
      const {
        supabaseUrl,
        supabaseKey,
        authConfig,
        realtimeConfig,
        rlsConfig,
        features,
        apiConfig,
        ...postgresConfig
      } = config;
      
      this.postgresFactory['validateConfigLogic'](postgresConfig as any);
    } catch (error) {
      // Re-throw validation errors from parent
      throw error;
    }
  }
  
  /**
   * Additional credentials validation logic
   */
  private validateCredentialsLogic(credentials: z.infer<typeof SupabaseCredentialsSchema>): void {
    // Ensure we have either supabaseKey or apiKey
    const apiKey = credentials.supabaseKey || credentials.apiKey;
    if (!apiKey) {
      throw new ValidationError('Either supabaseKey or apiKey must be provided');
    }
    
    // Validate API key format (Supabase keys have specific patterns)
    if (apiKey.startsWith('eyJ')) {
      // JWT format - likely anon or service_role key
      try {
        const payload = JSON.parse(atob(apiKey.split('.')[1]));
        if (!payload.role || !payload.iss) {
          throw new ValidationError('Invalid Supabase JWT key format');
        }
      } catch {
        throw new ValidationError('Invalid Supabase JWT key format');
      }
    } else if (!apiKey.match(/^sb-[a-zA-Z0-9-]{20,}$/)) {
      // Legacy format validation
      throw new ValidationError('Invalid Supabase API key format');
    }
    
    // Validate Supabase URL matches project reference if provided
    if (credentials.projectRef) {
      const urlMatch = credentials.supabaseUrl.match(/https:\/\/([a-zA-Z0-9-]+)\.supabase\.(co|io)/);
      if (urlMatch && urlMatch[1] !== credentials.projectRef) {
        throw new ValidationError('Project reference does not match Supabase URL');
      }
    }
    
    // Validate service role key if provided
    if (credentials.serviceRoleKey) {
      try {
        const payload = JSON.parse(atob(credentials.serviceRoleKey.split('.')[1]));
        if (payload.role !== 'service_role') {
          throw new ValidationError('Service role key does not have service_role claim');
        }
      } catch {
        throw new ValidationError('Invalid service role key format');
      }
    }
    
    // Validate Postgres credentials if provided (for direct SQL access)
    if (credentials.user || credentials.password || credentials.host) {
      if (!credentials.user || !credentials.password) {
        throw new ValidationError('Both user and password required for Postgres connection');
      }
      
      // Host should match Supabase URL pattern
      if (credentials.host && !credentials.host.includes('supabase')) {
        throw new ValidationError('Postgres host should be a Supabase database host');
      }
    }
  }
  
  /**
   * Get default configuration (required by IConnectorFactory interface)
   */
  getDefaultConfig(): Partial<SupabaseConnectorConfig> {
    return this.createDefaultConfig();
  }
  
  /**
   * Get configuration schema for documentation/UI generation
   */
  getConfigSchema() {
    return SupabaseConnectorConfigSchema;
  }
  
  /**
   * Get credentials schema for documentation/UI generation
   */
  getCredentialsSchema() {
    return SupabaseCredentialsSchema;
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
      procedures: false, // Not directly supported via Supabase API
      triggers: true,
      indexes: true,
      constraints: true,
      sequences: true,
      extensions: false, // Limited via API
      transactions: true, // Limited to API transactions
      savepoints: false, // Not supported via API
      streaming: false,
      realtime: true, // Supabase-specific feature
      backup: false,
      restore: false,
      rowLevelSecurity: true, // Supabase-specific feature
      restApi: true, // Supabase-specific feature
      edgeFunctions: true, // Supabase-specific feature
      storage: true, // Supabase-specific feature
      auth: true, // Supabase-specific feature
    };
  }
  
  /**
   * Get example configurations for different use cases
   */
  getExampleConfigs() {
    return {
      development: this.createDefaultConfig({
        supabaseUrl: 'https://your-project.supabase.co',
        poolConfig: { max: 3, min: 1 },
        realtimeConfig: { enabled: true },
        features: { enableRealtime: true, enableAuth: true },
      }),
      
      production: this.createDefaultConfig({
        supabaseUrl: 'https://your-project.supabase.co',
        poolConfig: { max: 10, min: 2 },
        rlsConfig: { enforceRLS: true, bypassRLSForService: true },
        features: { enableRealtime: true, enableAuth: true, enableStorage: true },
        healthCheck: { interval: 30000 },
      }),
      
      apiOnly: this.createDefaultConfig({
        supabaseUrl: 'https://your-project.supabase.co',
        poolConfig: { max: 5, min: 1 },
        features: { enableAuth: true },
        // No Postgres connection details - API only
      }),
      
      realtime: this.createDefaultConfig({
        supabaseUrl: 'https://your-project.supabase.co',
        realtimeConfig: {
          enabled: true,
          channels: ['public:*'],
          enablePresence: true,
          enableBroadcast: true,
        },
        features: { enableRealtime: true },
      })
    };
  }
}
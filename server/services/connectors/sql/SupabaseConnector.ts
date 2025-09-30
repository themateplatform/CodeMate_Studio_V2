import { createClient, SupabaseClient, PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import { z } from 'zod';
import { PostgresConnector, PostgresConnectorConfig, PostgresConnectionPool, PostgresTransaction } from './PostgresConnector';
import { SQLConnectionPool, SQLTransaction } from './SQLBaseConnector';
import {
  QueryResult as ConnectorQueryResult,
  QueryContext,
  ConnectionValidationResult,
  IntrospectionOptions
} from '../interfaces/IConnector';
import {
  DatabaseSchema,
  TableDefinition,
  ColumnDefinition,
  DatabaseType,
  ConstraintType,
  IndexType
} from '../types/schema';
import {
  ConnectorError,
  ConnectionError,
  ConnectionTimeoutError,
  AuthenticationError,
  QueryError,
  SchemaError,
  ConnectorErrorUtils
} from '../types/errors';

/**
 * Supabase-specific connection configuration
 */
export interface SupabaseConnectorConfig extends PostgresConnectorConfig {
  // Supabase connection details
  supabaseUrl: string;
  supabaseKey?: string; // Can be provided via credentials instead
  
  // Authentication configuration
  authConfig?: {
    autoRefreshToken?: boolean;
    persistSession?: boolean;
    detectSessionInUrl?: boolean;
    flowType?: 'implicit' | 'pkce';
  };
  
  // Real-time configuration
  realtimeConfig?: {
    enabled: boolean;
    channels?: string[];
    heartbeatIntervalMs?: number;
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
    enablePresence?: boolean;
    enableBroadcast?: boolean;
  };
  
  // Row Level Security (RLS) configuration  
  rlsConfig?: {
    enforceRLS: boolean;
    bypassRLSForService?: boolean;
    defaultPolicies?: string[];
  };
  
  // Supabase-specific features
  features?: {
    enableEdgeFunctions?: boolean;
    enableStorage?: boolean;
    enableAuth?: boolean;
    enableRealtime?: boolean;
  };
  
  // API configuration
  apiConfig?: {
    schema?: string;
    headers?: Record<string, string>;
    fetch?: typeof fetch;
  };
}

/**
 * Supabase connection pool that manages both Supabase client and Postgres connections
 */
export class SupabaseConnectionPool extends PostgresConnectionPool {
  private supabaseClient?: SupabaseClient;
  private supabaseConfig: SupabaseConnectorConfig;
  
  constructor(config: SupabaseConnectorConfig) {
    super(config);
    this.supabaseConfig = config;
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Initialize Supabase client first
      if (!this.supabaseClient) {
        throw new ConnectionError('Supabase client not configured');
      }
      
      // Test Supabase connection
      const { data, error } = await this.supabaseClient
        .from('_supabase_health_check')
        .select('1')
        .limit(1)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 = table not found, which is fine
        // If health check fails, still try to initialize the underlying Postgres pool
        console.warn('Supabase health check failed, attempting Postgres connection:', error);
      }
      
      // Initialize the underlying Postgres connection pool
      await super.initialize();
      
      this.isInitialized = true;
    } catch (error) {
      throw new ConnectionError(`Failed to initialize Supabase connection pool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  setSupabaseClient(client: SupabaseClient): void {
    this.supabaseClient = client;
  }
  
  getSupabaseClient(): SupabaseClient {
    if (!this.supabaseClient) {
      throw new ConnectionError('Supabase client not initialized');
    }
    return this.supabaseClient;
  }
}

/**
 * Supabase transaction that supports both Supabase API calls and raw SQL
 */
export class SupabaseTransaction extends PostgresTransaction {
  private supabaseClient: SupabaseClient;
  
  constructor(id: string, client: any, connector: SupabaseConnector, supabaseClient: SupabaseClient) {
    super(id, client, connector);
    this.supabaseClient = supabaseClient;
  }
  
  // Supabase-specific transaction methods using PostgREST API
  async selectFromTable<T = any>(tableName: string, options?: {
    select?: string;
    eq?: Record<string, any>;
    neq?: Record<string, any>;
    gt?: Record<string, any>;
    gte?: Record<string, any>;
    lt?: Record<string, any>;
    lte?: Record<string, any>;
    like?: Record<string, any>;
    ilike?: Record<string, any>;
    in?: Record<string, any[]>;
    is?: Record<string, boolean | null>;
    limit?: number;
    offset?: number;
    orderBy?: { column: string; ascending?: boolean }[];
  }): Promise<ConnectorQueryResult<T>> {
    const startTime = Date.now();
    
    try {
      let query = this.supabaseClient.from(tableName);
      
      if (options?.select) {
        query = query.select(options.select);
      } else {
        query = query.select('*');
      }
      
      // Apply filters
      if (options?.eq) {
        Object.entries(options.eq).forEach(([col, val]) => {
          query = query.eq(col, val);
        });
      }
      
      if (options?.neq) {
        Object.entries(options.neq).forEach(([col, val]) => {
          query = query.neq(col, val);
        });
      }
      
      if (options?.gt) {
        Object.entries(options.gt).forEach(([col, val]) => {
          query = query.gt(col, val);
        });
      }
      
      if (options?.gte) {
        Object.entries(options.gte).forEach(([col, val]) => {
          query = query.gte(col, val);
        });
      }
      
      if (options?.lt) {
        Object.entries(options.lt).forEach(([col, val]) => {
          query = query.lt(col, val);
        });
      }
      
      if (options?.lte) {
        Object.entries(options.lte).forEach(([col, val]) => {
          query = query.lte(col, val);
        });
      }
      
      if (options?.like) {
        Object.entries(options.like).forEach(([col, val]) => {
          query = query.like(col, val);
        });
      }
      
      if (options?.ilike) {
        Object.entries(options.ilike).forEach(([col, val]) => {
          query = query.ilike(col, val);
        });
      }
      
      if (options?.in) {
        Object.entries(options.in).forEach(([col, val]) => {
          query = query.in(col, val);
        });
      }
      
      if (options?.is) {
        Object.entries(options.is).forEach(([col, val]) => {
          query = query.is(col, val);
        });
      }
      
      // Apply ordering
      if (options?.orderBy) {
        options.orderBy.forEach(({ column, ascending = true }) => {
          query = query.order(column, { ascending });
        });
      }
      
      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      if (options?.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 1000)) - 1);
      }
      
      const { data, error, count } = await query;
      const executionTime = Date.now() - startTime;
      
      if (error) {
        return {
          success: false,
          executionTimeMs: executionTime,
          error: new QueryError(`Supabase query failed: ${error.message}`, { 
            details: error.details,
            hint: error.hint,
            code: error.code 
          })
        };
      }
      
      return {
        success: true,
        data: data as T[],
        totalCount: count || data?.length || 0,
        affectedRows: data?.length || 0,
        executionTimeMs: executionTime,
        metadata: {
          table: tableName,
          apiMethod: 'select',
          filters: options
        }
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        executionTimeMs: executionTime,
        error: ConnectorErrorUtils.wrapDatabaseError(error as Error)
      };
    }
  }
  
  async insertIntoTable<T = any>(tableName: string, data: T | T[], options?: {
    select?: string;
    onConflict?: string;
    ignoreDuplicates?: boolean;
    count?: 'exact' | 'planned' | 'estimated';
  }): Promise<ConnectorQueryResult<T>> {
    const startTime = Date.now();
    
    try {
      let query = this.supabaseClient.from(tableName).insert(data);
      
      if (options?.select) {
        query = query.select(options.select);
      }
      
      if (options?.onConflict) {
        query = query.upsert(data as any, { onConflict: options.onConflict, ignoreDuplicates: options.ignoreDuplicates });
      }
      
      if (options?.count) {
        query = query.select('*', { count: options.count });
      }
      
      const { data: result, error, count } = await query;
      const executionTime = Date.now() - startTime;
      
      if (error) {
        return {
          success: false,
          executionTimeMs: executionTime,
          error: new QueryError(`Supabase insert failed: ${error.message}`, { 
            details: error.details,
            hint: error.hint,
            code: error.code 
          })
        };
      }
      
      return {
        success: true,
        data: result as T[],
        totalCount: count || result?.length || 0,
        affectedRows: Array.isArray(data) ? data.length : 1,
        executionTimeMs: executionTime,
        metadata: {
          table: tableName,
          apiMethod: 'insert'
        }
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        executionTimeMs: executionTime,
        error: ConnectorErrorUtils.wrapDatabaseError(error as Error)
      };
    }
  }
  
  async updateTable<T = any>(tableName: string, updates: Partial<T>, conditions: Record<string, any>, options?: {
    select?: string;
    count?: 'exact' | 'planned' | 'estimated';
  }): Promise<ConnectorQueryResult<T>> {
    const startTime = Date.now();
    
    try {
      let query = this.supabaseClient.from(tableName).update(updates);
      
      // Apply conditions
      Object.entries(conditions).forEach(([col, val]) => {
        query = query.eq(col, val);
      });
      
      if (options?.select) {
        query = query.select(options.select);
      }
      
      if (options?.count) {
        query = query.select('*', { count: options.count });
      }
      
      const { data, error, count } = await query;
      const executionTime = Date.now() - startTime;
      
      if (error) {
        return {
          success: false,
          executionTimeMs: executionTime,
          error: new QueryError(`Supabase update failed: ${error.message}`, { 
            details: error.details,
            hint: error.hint,
            code: error.code 
          })
        };
      }
      
      return {
        success: true,
        data: data as T[],
        totalCount: count || data?.length || 0,
        affectedRows: data?.length || 0,
        executionTimeMs: executionTime,
        metadata: {
          table: tableName,
          apiMethod: 'update'
        }
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        executionTimeMs: executionTime,
        error: ConnectorErrorUtils.wrapDatabaseError(error as Error)
      };
    }
  }
  
  async deleteFromTable<T = any>(tableName: string, conditions: Record<string, any>, options?: {
    select?: string;
    count?: 'exact' | 'planned' | 'estimated';
  }): Promise<ConnectorQueryResult<T>> {
    const startTime = Date.now();
    
    try {
      let query = this.supabaseClient.from(tableName).delete();
      
      // Apply conditions
      Object.entries(conditions).forEach(([col, val]) => {
        query = query.eq(col, val);
      });
      
      if (options?.select) {
        query = query.select(options.select);
      }
      
      if (options?.count) {
        query = query.select('*', { count: options.count });
      }
      
      const { data, error, count } = await query;
      const executionTime = Date.now() - startTime;
      
      if (error) {
        return {
          success: false,
          executionTimeMs: executionTime,
          error: new QueryError(`Supabase delete failed: ${error.message}`, { 
            details: error.details,
            hint: error.hint,
            code: error.code 
          })
        };
      }
      
      return {
        success: true,
        data: data as T[],
        totalCount: count || 0,
        affectedRows: count || data?.length || 0,
        executionTimeMs: executionTime,
        metadata: {
          table: tableName,
          apiMethod: 'delete'
        }
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        executionTimeMs: executionTime,
        error: ConnectorErrorUtils.wrapDatabaseError(error as Error)
      };
    }
  }
}

/**
 * Supabase database connector implementation
 */
export class SupabaseConnector extends PostgresConnector {
  public readonly type = 'supabase';
  private supabaseClient?: SupabaseClient;
  private supabaseConfig: SupabaseConnectorConfig;
  private realtimeSubscriptions: Map<string, any> = new Map();
  
  constructor(id: string, config: SupabaseConnectorConfig) {
    super(id, config);
    this.supabaseConfig = config;
  }
  
  protected createConnectionPool(config: SupabaseConnectorConfig): SupabaseConnectionPool {
    return new SupabaseConnectionPool(config);
  }
  
  async connect(credentials: Record<string, any>): Promise<void> {
    try {
      // Extract Supabase credentials
      const supabaseUrl = this.supabaseConfig.supabaseUrl || credentials.supabaseUrl;
      const supabaseKey = this.supabaseConfig.supabaseKey || credentials.supabaseKey || credentials.apiKey;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new AuthenticationError('Supabase URL and API key are required');
      }
      
      // Create Supabase client
      this.supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: this.supabaseConfig.authConfig || {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        },
        realtime: {
          ...(this.supabaseConfig.realtimeConfig || {}),
        },
        global: {
          headers: this.supabaseConfig.apiConfig?.headers || {},
          fetch: this.supabaseConfig.apiConfig?.fetch
        }
      });
      
      // Set up the connection pool with Supabase client
      const pool = this.pool as SupabaseConnectionPool;
      pool.setSupabaseClient(this.supabaseClient);
      
      // Connect using parent Postgres implementation for direct SQL queries
      // Extract Postgres connection details from Supabase URL if available
      if (credentials.host && credentials.user && credentials.password) {
        await super.connect(credentials);
      } else {
        // For Supabase-only mode, just initialize the pool
        await this.pool.initialize();
      }
      
      this.connectionStatus = 'connected';
      this.metrics.lastActivity = new Date();
      
    } catch (error) {
      this.connectionStatus = 'error';
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      if (error instanceof AuthenticationError) {
        throw error;
      } else {
        throw new ConnectionError(`Failed to connect to Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  async disconnect(): Promise<void> {
    try {
      // Remove all realtime subscriptions
      for (const [channel, subscription] of this.realtimeSubscriptions) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.warn(`Failed to unsubscribe from ${channel}:`, error);
        }
      }
      this.realtimeSubscriptions.clear();
      
      // Disconnect Supabase client
      if (this.supabaseClient) {
        // Supabase client doesn't have an explicit disconnect method
        this.supabaseClient = undefined;
      }
      
      // Disconnect parent Postgres connection
      await super.disconnect();
      
    } catch (error) {
      console.warn('Error during Supabase disconnect:', error);
      throw new ConnectionError(`Failed to disconnect from Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async validateConnection(): Promise<ConnectionValidationResult> {
    try {
      if (!this.supabaseClient) {
        return {
          isValid: false,
          error: 'Supabase client not initialized',
          details: { reason: 'Client not available' }
        };
      }
      
      // Test Supabase connection with a simple query
      const { data, error } = await this.supabaseClient
        .from('information_schema.tables')
        .select('table_name')
        .limit(1)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 = table not found
        return {
          isValid: false,
          error: `Supabase connection failed: ${error.message}`,
          details: { 
            code: error.code,
            details: error.details,
            hint: error.hint
          }
        };
      }
      
      // Also validate underlying Postgres connection if available
      const postgresResult = await super.validateConnection();
      
      return {
        isValid: true,
        details: {
          supabaseConnection: 'OK',
          postgresConnection: postgresResult.isValid ? 'OK' : 'Limited (API only)',
          features: this.getSupabaseFeatures()
        }
      };
      
    } catch (error) {
      return {
        isValid: false,
        error: `Connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { exception: error }
      };
    }
  }
  
  // Supabase-specific methods
  async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabaseClient) {
      throw new ConnectionError('Supabase client not initialized');
    }
    return this.supabaseClient;
  }
  
  async subscribeToTable(
    tableName: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    callback: (payload: any) => void,
    options?: {
      filter?: string;
      schema?: string;
    }
  ): Promise<string> {
    if (!this.supabaseClient) {
      throw new ConnectionError('Supabase client not initialized');
    }
    
    const channelName = `${tableName}_${event}_${Date.now()}`;
    const schema = options?.schema || this.supabaseConfig.apiConfig?.schema || 'public';
    
    const subscription = this.supabaseClient
      .channel(channelName)
      .on('postgres_changes', {
        event,
        schema,
        table: tableName,
        filter: options?.filter
      }, callback)
      .subscribe();
      
    this.realtimeSubscriptions.set(channelName, subscription);
    
    return channelName;
  }
  
  async unsubscribeFromTable(channelName: string): Promise<void> {
    const subscription = this.realtimeSubscriptions.get(channelName);
    if (subscription) {
      subscription.unsubscribe();
      this.realtimeSubscriptions.delete(channelName);
    }
  }
  
  async createTransaction(options?: { isolationLevel?: string }): Promise<SupabaseTransaction> {
    // For Supabase, we primarily use the API but can fall back to SQL
    if (this.pool instanceof SupabaseConnectionPool && this.supabaseClient) {
      try {
        const client = await this.pool.acquire();
        const transactionId = `supabase_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return new SupabaseTransaction(transactionId, client, this, this.supabaseClient);
      } catch (error) {
        // Fallback to API-only transaction (no actual SQL transaction)
        const transactionId = `supabase_api_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return new SupabaseTransaction(transactionId, null, this, this.supabaseClient);
      }
    }
    
    // Fallback to parent Postgres transaction
    return super.createTransaction(options) as any;
  }
  
  // Enhanced schema introspection that works with Supabase API
  async introspectSchema(options?: IntrospectionOptions): Promise<DatabaseSchema> {
    try {
      // First try parent Postgres introspection if available
      if (this.pool instanceof PostgresConnectionPool) {
        try {
          return await super.introspectSchema(options);
        } catch (error) {
          console.warn('Postgres introspection failed, falling back to Supabase API:', error);
        }
      }
      
      // Fallback to Supabase-specific introspection
      return await this.introspectSchemaViaAPI(options);
      
    } catch (error) {
      throw new SchemaError(`Schema introspection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async introspectSchemaViaAPI(options?: IntrospectionOptions): Promise<DatabaseSchema> {
    if (!this.supabaseClient) {
      throw new ConnectionError('Supabase client not initialized');
    }
    
    const schema: DatabaseSchema = {
      version: '1.0.0',
      databaseType: 'supabase',
      name: this.supabaseConfig.database || 'supabase',
      schemas: [],
      tables: [],
      views: [],
      functions: [],
      triggers: [],
      sequences: [],
      extensions: [],
      metadata: {
        introspectedAt: new Date().toISOString(),
        introspectionMethod: 'supabase-api',
        source: 'supabase'
      }
    };
    
    try {
      // Get table information from Supabase REST API
      // This is a simplified approach - in production, you'd want more comprehensive introspection
      const { data: tables, error } = await this.supabaseClient
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public');
        
      if (error) {
        console.warn('Failed to get table list via API:', error);
      } else if (tables) {
        for (const table of tables) {
          if (table.table_type === 'BASE TABLE') {
            // Get column information for each table
            const { data: columns } = await this.supabaseClient
              .from('information_schema.columns')
              .select(`
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length,
                numeric_precision,
                numeric_scale
              `)
              .eq('table_name', table.table_name)
              .eq('table_schema', 'public')
              .order('ordinal_position');
              
            const tableDefinition: TableDefinition = {
              name: table.table_name,
              schema: 'public',
              type: 'table',
              columns: (columns || []).map(col => ({
                name: col.column_name,
                type: this.mapDataType(col.data_type),
                nullable: col.is_nullable === 'YES',
                defaultValue: col.column_default,
                maxLength: col.character_maximum_length,
                precision: col.numeric_precision,
                scale: col.numeric_scale,
                isPrimaryKey: false, // Would need additional query to determine
                isAutoIncrement: col.column_default?.includes('nextval'),
                metadata: {
                  supabaseType: col.data_type
                }
              })),
              constraints: [],
              indexes: [],
              metadata: {
                rowCount: 0, // Would need COUNT query
                supabaseTable: true
              }
            };
            
            schema.tables.push(tableDefinition);
          }
        }
      }
      
    } catch (error) {
      console.warn('API-based introspection had errors:', error);
    }
    
    return schema;
  }
  
  private getSupabaseFeatures() {
    return {
      restApi: true,
      realtimeSubscriptions: this.supabaseConfig.realtimeConfig?.enabled || false,
      rowLevelSecurity: this.supabaseConfig.rlsConfig?.enforceRLS || false,
      auth: this.supabaseConfig.features?.enableAuth || false,
      storage: this.supabaseConfig.features?.enableStorage || false,
      edgeFunctions: this.supabaseConfig.features?.enableEdgeFunctions || false,
    };
  }
  
  getTypeMapping(): Record<string, string> {
    // Extend parent Postgres type mapping with Supabase specifics
    const parentMapping = super.getTypeMapping();
    return {
      ...parentMapping,
      // Supabase-specific types
      'uuid': 'uuid',
      'timestamptz': 'timestamp with time zone',
      'jsonb': 'jsonb',
    };
  }
}
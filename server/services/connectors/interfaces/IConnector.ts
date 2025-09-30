import { 
  DatabaseSchema, 
  TableDefinition, 
  ColumnDefinition,
  SchemaComparison 
} from '../types/schema';
import { ConnectorError } from '../types/errors';

/**
 * Connection configuration interface that all connectors must implement
 */
export interface ConnectorConfig {
  type: string;
  name: string;
  host?: string;
  port?: number;
  database?: string;
  
  // Credentials - these will be securely retrieved via DataConnectorCredentialsService
  credentialsSecretId: string;
  
  // Connection pool settings
  poolConfig?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    acquireTimeoutMillis?: number;
  };
  
  // SSL/TLS configuration
  sslConfig?: {
    enabled: boolean;
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
  
  // Connector-specific configuration
  options?: Record<string, any>;
  
  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Connection validation result
 */
export interface ConnectionValidationResult {
  isValid: boolean;
  latencyMs?: number;
  serverVersion?: string;
  capabilities?: string[];
  warnings?: string[];
  error?: ConnectorError;
  metadata?: Record<string, any>;
}

/**
 * Query execution context
 */
export interface QueryContext {
  timeoutMs?: number;
  readOnly?: boolean;
  transaction?: boolean;
  cursor?: boolean;
  batchSize?: number;
  metadata?: Record<string, any>;
}

/**
 * Query result interface
 */
export interface QueryResult<T = any> {
  success: boolean;
  data?: T[];
  totalCount?: number;
  affectedRows?: number;
  insertId?: any;
  executionTimeMs?: number;
  warnings?: string[];
  error?: ConnectorError;
  metadata?: Record<string, any>;
}

/**
 * Pagination options for data retrieval
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  orderBy?: {
    column: string;
    direction: 'ASC' | 'DESC';
  }[];
}

/**
 * Filter options for data retrieval
 */
export interface FilterOptions {
  where?: Record<string, any>;
  whereRaw?: string;
  search?: {
    columns: string[];
    term: string;
  };
}

/**
 * Data operation options
 */
export interface DataOperationOptions {
  pagination?: PaginationOptions;
  filters?: FilterOptions;
  context?: QueryContext;
  returning?: string[]; // Columns to return after insert/update
}

/**
 * Bulk operation options
 */
export interface BulkOperationOptions {
  batchSize?: number;
  continueOnError?: boolean;
  context?: QueryContext;
  returning?: string[];
}

/**
 * Schema introspection options
 */
export interface IntrospectionOptions {
  includeTables?: string[];
  excludeTables?: string[];
  includeViews?: boolean;
  includeFunctions?: boolean;
  includeProcedures?: boolean;
  includeTriggers?: boolean;
  includeSequences?: boolean;
  includeIndexes?: boolean;
  includeConstraints?: boolean;
  schemaFilter?: string[];
}

/**
 * Connection lifecycle events
 */
export interface ConnectionEvents {
  onConnect?: () => void | Promise<void>;
  onDisconnect?: () => void | Promise<void>;
  onError?: (error: ConnectorError) => void | Promise<void>;
  onQuery?: (query: string, duration: number) => void | Promise<void>;
  onReconnect?: () => void | Promise<void>;
}

/**
 * Core connector interface that all data source connectors must implement
 */
export interface IConnector<TConfig extends ConnectorConfig = ConnectorConfig> {
  /**
   * Connector metadata
   */
  readonly type: string;
  readonly version: string;
  readonly capabilities: string[];
  readonly supportedOperations: string[];
  
  /**
   * Connection management
   */
  connect(config: TConfig, events?: ConnectionEvents): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectionStatus(): Promise<ConnectionValidationResult>;
  
  /**
   * Connection validation and testing
   */
  validateConnection(config: TConfig): Promise<ConnectionValidationResult>;
  validateConfiguration(config: TConfig): Promise<{ valid: boolean; errors: string[] }>;
  testQuery(query: string, context?: QueryContext): Promise<QueryResult>;
  
  /**
   * Schema introspection and discovery
   */
  introspectSchema(options?: IntrospectionOptions): Promise<DatabaseSchema>;
  listTables(schemaName?: string): Promise<string[]>;
  listSchemas(): Promise<string[]>;
  getTableDefinition(tableName: string, schemaName?: string): Promise<TableDefinition>;
  getTableColumns(tableName: string, schemaName?: string): Promise<ColumnDefinition[]>;
  getTablePrimaryKey(tableName: string, schemaName?: string): Promise<string[]>;
  getTableForeignKeys(tableName: string, schemaName?: string): Promise<{
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
    constraintName: string;
  }[]>;
  getTableIndexes(tableName: string, schemaName?: string): Promise<{
    name: string;
    columns: string[];
    unique: boolean;
    type: string;
  }[]>;
  
  /**
   * Schema comparison and migration support
   */
  compareSchemas(source: DatabaseSchema, target: DatabaseSchema): Promise<SchemaComparison>;
  generateSchemaDiff(comparison: SchemaComparison): Promise<string[]>;
  
  /**
   * Data operations - Core CRUD operations
   */
  getTableData<T = any>(
    tableName: string, 
    options?: DataOperationOptions
  ): Promise<QueryResult<T>>;
  
  insertRecord<T = any>(
    tableName: string, 
    data: Record<string, any>, 
    options?: { returning?: string[]; context?: QueryContext }
  ): Promise<QueryResult<T>>;
  
  insertRecords<T = any>(
    tableName: string, 
    data: Record<string, any>[], 
    options?: BulkOperationOptions
  ): Promise<QueryResult<T>>;
  
  updateRecord<T = any>(
    tableName: string, 
    id: any, 
    data: Record<string, any>, 
    options?: { returning?: string[]; context?: QueryContext; idColumn?: string }
  ): Promise<QueryResult<T>>;
  
  updateRecords<T = any>(
    tableName: string, 
    criteria: Record<string, any>, 
    data: Record<string, any>, 
    options?: { returning?: string[]; context?: QueryContext }
  ): Promise<QueryResult<T>>;
  
  deleteRecord(
    tableName: string, 
    id: any, 
    options?: { context?: QueryContext; idColumn?: string }
  ): Promise<QueryResult>;
  
  deleteRecords(
    tableName: string, 
    criteria: Record<string, any>, 
    options?: { context?: QueryContext }
  ): Promise<QueryResult>;
  
  /**
   * Raw query execution
   */
  executeQuery<T = any>(query: string, parameters?: any[], context?: QueryContext): Promise<QueryResult<T>>;
  executeTransaction<T = any>(
    operations: Array<{
      query: string;
      parameters?: any[];
    }>,
    context?: QueryContext
  ): Promise<QueryResult<T>>;
  
  /**
   * Advanced data operations
   */
  upsertRecord<T = any>(
    tableName: string, 
    data: Record<string, any>, 
    conflictColumns: string[], 
    options?: { returning?: string[]; context?: QueryContext }
  ): Promise<QueryResult<T>>;
  
  bulkUpsert<T = any>(
    tableName: string, 
    data: Record<string, any>[], 
    conflictColumns: string[], 
    options?: BulkOperationOptions
  ): Promise<QueryResult<T>>;
  
  countRecords(
    tableName: string, 
    criteria?: Record<string, any>, 
    options?: { context?: QueryContext }
  ): Promise<QueryResult<{ count: number }>>;
  
  /**
   * Query building and optimization
   */
  buildSelectQuery(
    tableName: string, 
    options?: {
      columns?: string[];
      joins?: Array<{
        table: string;
        type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
        on: string;
      }>;
      where?: Record<string, any>;
      groupBy?: string[];
      having?: Record<string, any>;
      orderBy?: Array<{ column: string; direction: 'ASC' | 'DESC' }>;
      limit?: number;
      offset?: number;
    }
  ): string;
  
  buildInsertQuery(
    tableName: string, 
    data: Record<string, any> | Record<string, any>[], 
    options?: {
      onConflict?: {
        columns: string[];
        action: 'DO NOTHING' | 'DO UPDATE';
        updateColumns?: string[];
      };
      returning?: string[];
    }
  ): { query: string; parameters: any[] };
  
  buildUpdateQuery(
    tableName: string, 
    data: Record<string, any>, 
    criteria: Record<string, any>, 
    options?: {
      returning?: string[];
    }
  ): { query: string; parameters: any[] };
  
  buildDeleteQuery(
    tableName: string, 
    criteria: Record<string, any>
  ): { query: string; parameters: any[] };
  
  /**
   * Performance and monitoring
   */
  getQueryExecutionPlan(query: string, parameters?: any[]): Promise<any>;
  getConnectionMetrics(): Promise<{
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
    queriesExecuted: number;
    averageQueryTime: number;
    lastActivity: Date;
  }>;
  
  /**
   * Data type handling and conversion
   */
  serializeValue(value: any, columnType: string): any;
  deserializeValue(value: any, columnType: string): any;
  convertToNativeType(value: any, targetType: string): any;
  getTypeMapping(): Record<string, string>;
  
  /**
   * Utilities and helpers
   */
  escapeIdentifier(identifier: string): string;
  escapeLiteral(literal: string): string;
  getQuoteCharacter(): string;
  getParameterPlaceholder(index: number): string;
  
  /**
   * Health checks and diagnostics
   */
  healthCheck(): Promise<{
    healthy: boolean;
    status: string;
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      duration?: number;
    }>;
    timestamp: Date;
  }>;
  
  /**
   * Resource cleanup
   */
  cleanup(): Promise<void>;
}

/**
 * Factory interface for creating connector instances
 */
export interface IConnectorFactory<TConfig extends ConnectorConfig = ConnectorConfig> {
  readonly type: string;
  readonly supportedVersions: string[];
  
  create(config: TConfig): Promise<IConnector<TConfig>>;
  validateConfig(config: TConfig): Promise<{ valid: boolean; errors: string[] }>;
  getDefaultConfig(): Partial<TConfig>;
  getConfigSchema(): any; // Zod schema for configuration validation
}

/**
 * Connector plugin interface for registry system
 */
export interface IConnectorPlugin {
  readonly name: string;
  readonly type: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly dependencies: string[];
  readonly capabilities: string[];
  
  getFactory(): IConnectorFactory;
  getConfigSchema(): any;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}

/**
 * Connection pool interface for shared pool management
 */
export interface IConnectionPool {
  acquire(): Promise<any>;
  release(connection: any): Promise<void>;
  destroy(connection: any): Promise<void>;
  clear(): Promise<void>;
  getStats(): {
    total: number;
    idle: number;
    active: number;
    pending: number;
    max: number;
    min: number;
  };
}

/**
 * Transaction interface for transaction management
 */
export interface ITransaction {
  readonly id: string;
  readonly status: 'active' | 'committed' | 'aborted';
  
  execute<T = any>(query: string, parameters?: any[]): Promise<QueryResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  savepoint(name: string): Promise<void>;
  rollbackToSavepoint(name: string): Promise<void>;
  releaseSavepoint(name: string): Promise<void>;
}

/**
 * Type guards for runtime type checking
 */
export function isConnector(obj: any): obj is IConnector {
  return obj && 
    typeof obj.connect === 'function' &&
    typeof obj.disconnect === 'function' &&
    typeof obj.validateConnection === 'function' &&
    typeof obj.introspectSchema === 'function' &&
    typeof obj.getTableData === 'function' &&
    typeof obj.insertRecord === 'function' &&
    typeof obj.updateRecord === 'function' &&
    typeof obj.deleteRecord === 'function';
}

export function isConnectorFactory(obj: any): obj is IConnectorFactory {
  return obj && 
    typeof obj.create === 'function' &&
    typeof obj.validateConfig === 'function' &&
    typeof obj.type === 'string';
}

export function isConnectorPlugin(obj: any): obj is IConnectorPlugin {
  return obj && 
    typeof obj.getFactory === 'function' &&
    typeof obj.initialize === 'function' &&
    typeof obj.dispose === 'function' &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string';
}
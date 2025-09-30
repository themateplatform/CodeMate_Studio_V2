import {
  IConnector,
  ConnectorConfig,
  ConnectionValidationResult,
  QueryContext,
  QueryResult,
  PaginationOptions,
  FilterOptions,
  DataOperationOptions,
  BulkOperationOptions,
  IntrospectionOptions,
  ConnectionEvents,
  IConnectionPool,
  ITransaction
} from '../interfaces/IConnector';
import {
  DatabaseSchema,
  TableDefinition,
  ColumnDefinition,
  DatabaseType,
  ConstraintType,
  IndexType,
  SchemaComparison
} from '../types/schema';
import {
  ConnectorError,
  ConnectionError,
  ConnectionTimeoutError,
  AuthenticationError,
  QueryError,
  SchemaError,
  TableNotFoundError,
  ConnectorErrorUtils
} from '../types/errors';
import { DataConnectorCredentialsService } from '../../dataConnectorCredentialsService';

/**
 * SQL-specific connector configuration
 */
export interface SQLConnectorConfig extends ConnectorConfig {
  // SQL-specific connection options
  connectionString?: string;
  schema?: string;
  searchPath?: string[];
  timezone?: string;
  
  // Query configuration
  queryTimeout?: number;
  statementTimeout?: number;
  commandTimeout?: number;
  
  // Connection pool configuration (more detailed for SQL)
  poolConfig?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    acquireTimeoutMillis?: number;
    evictionRunIntervalMillis?: number;
    numTestsPerEvictionRun?: number;
    softIdleTimeoutMillis?: number;
    testOnBorrow?: boolean;
    testOnReturn?: boolean;
    testWhileIdle?: boolean;
  };
  
  // Connection retry configuration
  retryConfig?: {
    retries?: number;
    retryDelayMs?: number;
    maxRetryDelayMs?: number;
    backoffMultiplier?: number;
    retryOnFailure?: boolean;
  };
}

/**
 * SQL connection pool implementation
 */
export abstract class SQLConnectionPool implements IConnectionPool {
  protected config: SQLConnectorConfig;
  protected pool: any;
  protected isInitialized = false;
  
  constructor(config: SQLConnectorConfig) {
    this.config = config;
  }
  
  abstract initialize(): Promise<void>;
  abstract acquire(): Promise<any>;
  abstract release(connection: any): Promise<void>;
  abstract destroy(connection: any): Promise<void>;
  abstract clear(): Promise<void>;
  
  getStats() {
    return {
      total: 0,
      idle: 0,
      active: 0,
      pending: 0,
      max: this.config.poolConfig?.max || 10,
      min: this.config.poolConfig?.min || 1,
    };
  }
}

/**
 * SQL transaction implementation
 */
export abstract class SQLTransaction implements ITransaction {
  public readonly id: string;
  public status: 'active' | 'committed' | 'aborted' = 'active';
  
  protected connection: any;
  protected connector: SQLBaseConnector;
  
  constructor(id: string, connection: any, connector: SQLBaseConnector) {
    this.id = id;
    this.connection = connection;
    this.connector = connector;
  }
  
  abstract execute<T = any>(query: string, parameters?: any[]): Promise<QueryResult<T>>;
  abstract commit(): Promise<void>;
  abstract rollback(): Promise<void>;
  abstract savepoint(name: string): Promise<void>;
  abstract rollbackToSavepoint(name: string): Promise<void>;
  abstract releaseSavepoint(name: string): Promise<void>;
}

/**
 * Abstract base class for SQL database connectors
 * Provides common functionality for all SQL databases
 */
export abstract class SQLBaseConnector implements IConnector<SQLConnectorConfig> {
  public abstract readonly type: string;
  public readonly version = '1.0.0';
  public readonly capabilities = [
    'read', 'write', 'schema_introspection', 'transactions', 
    'bulk_operations', 'query_building', 'connection_pooling'
  ];
  public readonly supportedOperations = [
    'connect', 'disconnect', 'validateConnection', 'introspectSchema',
    'listTables', 'getTableData', 'insertRecord', 'updateRecord', 'deleteRecord',
    'executeQuery', 'executeTransaction'
  ];
  
  protected config!: SQLConnectorConfig;
  protected pool!: SQLConnectionPool;
  protected credentialsService: DataConnectorCredentialsService;
  protected connectionEvents?: ConnectionEvents;
  protected isConnectedFlag = false;
  protected credentials?: Record<string, any>;
  
  // Query execution metrics
  protected metrics = {
    queriesExecuted: 0,
    totalQueryTime: 0,
    lastActivity: new Date(),
    connectionCount: 0
  };
  
  constructor() {
    this.credentialsService = DataConnectorCredentialsService.getInstance();
  }
  
  /**
   * Abstract methods that specific SQL implementations must provide
   */
  protected abstract createConnectionPool(config: SQLConnectorConfig): SQLConnectionPool;
  protected abstract createConnection(credentials: Record<string, any>): Promise<any>;
  protected abstract executeRawQuery<T = any>(
    connection: any, 
    query: string, 
    parameters?: any[], 
    context?: QueryContext
  ): Promise<QueryResult<T>>;
  protected abstract getInformationSchemaQueries(): {
    listSchemas: string;
    listTables: string;
    getTableColumns: string;
    getTableConstraints: string;
    getTableIndexes: string;
    getTableForeignKeys: string;
  };
  
  /**
   * Connection management
   */
  async connect(config: SQLConnectorConfig, events?: ConnectionEvents): Promise<void> {
    try {
      this.config = config;
      this.connectionEvents = events;
      
      // Retrieve credentials securely
      const credentialsResult = await this.credentialsService.getCredentials(
        config.credentialsSecretId,
        'system', // TODO: Pass actual user ID
        { requestId: `connect-${Date.now()}` }
      );
      
      if (!credentialsResult.success || !credentialsResult.credentials) {
        throw new AuthenticationError('Failed to retrieve database credentials', {
          metadata: { credentialsSecretId: config.credentialsSecretId }
        });
      }
      
      this.credentials = credentialsResult.credentials;
      
      // Initialize connection pool
      this.pool = this.createConnectionPool(config);
      await this.pool.initialize();
      
      // Test connection
      const validation = await this.validateConnection(config);
      if (!validation.isValid) {
        throw validation.error || new ConnectionError('Connection validation failed');
      }
      
      this.isConnectedFlag = true;
      this.metrics.connectionCount++;
      
      if (this.connectionEvents?.onConnect) {
        await this.connectionEvents.onConnect();
      }
      
      console.log(`Connected to ${this.type} database: ${config.name}`);
    } catch (error) {
      if (this.connectionEvents?.onError) {
        const connectorError = error instanceof ConnectorError 
          ? error 
          : ConnectorErrorUtils.wrapDatabaseError(error as Error);
        await this.connectionEvents.onError(connectorError);
      }
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.clear();
      }
      
      this.isConnectedFlag = false;
      
      if (this.connectionEvents?.onDisconnect) {
        await this.connectionEvents.onDisconnect();
      }
      
      console.log(`Disconnected from ${this.type} database: ${this.config?.name}`);
    } catch (error) {
      if (this.connectionEvents?.onError) {
        const connectorError = error instanceof ConnectorError 
          ? error 
          : ConnectorErrorUtils.wrapDatabaseError(error as Error);
        await this.connectionEvents.onError(connectorError);
      }
      throw error;
    }
  }
  
  isConnected(): boolean {
    return this.isConnectedFlag;
  }
  
  async getConnectionStatus(): Promise<ConnectionValidationResult> {
    if (!this.isConnected()) {
      return {
        isValid: false,
        error: new ConnectionError('Not connected to database')
      };
    }
    
    return await this.validateConnection(this.config);
  }
  
  /**
   * Connection validation
   */
  async validateConnection(config: SQLConnectorConfig): Promise<ConnectionValidationResult> {
    const startTime = Date.now();
    
    try {
      // Retrieve credentials for validation
      const credentialsResult = await this.credentialsService.getCredentials(
        config.credentialsSecretId,
        'system', // TODO: Pass actual user ID
        { requestId: `validate-${Date.now()}` }
      );
      
      if (!credentialsResult.success || !credentialsResult.credentials) {
        return {
          isValid: false,
          error: new AuthenticationError('Failed to retrieve database credentials')
        };
      }
      
      // Create test connection
      const connection = await this.createConnection(credentialsResult.credentials);
      
      // Execute simple test query
      const testResult = await this.executeRawQuery(
        connection, 
        'SELECT 1 as test', 
        [], 
        { timeoutMs: 5000 }
      );
      
      if (!testResult.success) {
        return {
          isValid: false,
          error: testResult.error || new ConnectionError('Test query failed')
        };
      }
      
      const latencyMs = Date.now() - startTime;
      
      return {
        isValid: true,
        latencyMs,
        serverVersion: await this.getServerVersion(connection),
        capabilities: this.capabilities,
        metadata: {
          connectionTime: latencyMs,
          testQuery: 'SELECT 1 as test'
        }
      };
    } catch (error) {
      return {
        isValid: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof ConnectorError 
          ? error 
          : ConnectorErrorUtils.wrapDatabaseError(error as Error)
      };
    }
  }
  
  async validateConfiguration(config: SQLConnectorConfig): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (!config.credentialsSecretId) {
      errors.push('credentialsSecretId is required');
    }
    
    if (!config.type) {
      errors.push('type is required');
    }
    
    if (!config.name) {
      errors.push('name is required');
    }
    
    // Validate pool configuration
    if (config.poolConfig) {
      if (config.poolConfig.min && config.poolConfig.max && config.poolConfig.min > config.poolConfig.max) {
        errors.push('Pool min size cannot be greater than max size');
      }
      
      if (config.poolConfig.connectionTimeoutMillis && config.poolConfig.connectionTimeoutMillis < 1000) {
        errors.push('Connection timeout must be at least 1000ms');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  async testQuery(query: string, context?: QueryContext): Promise<QueryResult> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected to database');
    }
    
    const connection = await this.pool.acquire();
    try {
      return await this.executeRawQuery(connection, query, [], context);
    } finally {
      await this.pool.release(connection);
    }
  }
  
  /**
   * Schema introspection using standard information_schema queries
   */
  async introspectSchema(options: IntrospectionOptions = {}): Promise<DatabaseSchema> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected to database');
    }
    
    try {
      const schemas = await this.listSchemas();
      const targetSchemas = options.schemaFilter || schemas;
      
      const schema: DatabaseSchema = {
        name: this.config.database || 'default',
        tables: [],
        views: [],
        functions: [],
        procedures: [],
        triggers: [],
        sequences: [],
        metadata: {
          introspectionDate: new Date().toISOString(),
          connectorType: this.type,
          options
        }
      };
      
      // Get tables for each schema
      for (const schemaName of targetSchemas) {
        const tables = await this.listTables(schemaName);
        
        for (const tableName of tables) {
          if (options.includeTables && !options.includeTables.includes(tableName)) {
            continue;
          }
          
          if (options.excludeTables && options.excludeTables.includes(tableName)) {
            continue;
          }
          
          const tableDefinition = await this.getTableDefinition(tableName, schemaName);
          schema.tables.push(tableDefinition);
        }
      }
      
      return schema;
    } catch (error) {
      throw error instanceof ConnectorError 
        ? error 
        : new SchemaError(`Failed to introspect schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async listSchemas(): Promise<string[]> {
    const queries = this.getInformationSchemaQueries();
    const result = await this.executeQuery<{ schema_name: string }>(queries.listSchemas);
    
    if (!result.success || !result.data) {
      throw new SchemaError('Failed to list schemas');
    }
    
    return result.data.map(row => row.schema_name);
  }
  
  async listTables(schemaName?: string): Promise<string[]> {
    const queries = this.getInformationSchemaQueries();
    const parameters = schemaName ? [schemaName] : [];
    const query = schemaName 
      ? `${queries.listTables} WHERE table_schema = $1`
      : queries.listTables;
    
    const result = await this.executeQuery<{ table_name: string }>(query, parameters);
    
    if (!result.success || !result.data) {
      throw new SchemaError(`Failed to list tables${schemaName ? ` in schema ${schemaName}` : ''}`);
    }
    
    return result.data.map(row => row.table_name);
  }
  
  async getTableDefinition(tableName: string, schemaName?: string): Promise<TableDefinition> {
    const [columns, indexes, foreignKeys] = await Promise.all([
      this.getTableColumns(tableName, schemaName),
      this.getTableIndexes(tableName, schemaName),
      this.getTableForeignKeys(tableName, schemaName)
    ]);
    
    const primaryKey = await this.getTablePrimaryKey(tableName, schemaName);
    
    return {
      name: tableName,
      schema: schemaName || 'public',
      columns,
      indexes: indexes.map(idx => ({
        name: idx.name,
        tableName,
        columns: idx.columns,
        type: IndexType.BTREE, // Default, should be determined from actual index type
        isUnique: idx.unique,
        isPrimaryKey: idx.name.includes('pkey') || idx.name.includes('pk'),
        metadata: { originalType: idx.type }
      })),
      constraints: [], // TODO: Implement constraint introspection
      primaryKey,
      foreignKeys,
      comment: undefined, // TODO: Add comment retrieval
      metadata: {
        introspectionDate: new Date().toISOString()
      }
    };
  }
  
  async getTableColumns(tableName: string, schemaName?: string): Promise<ColumnDefinition[]> {
    const queries = this.getInformationSchemaQueries();
    const parameters = [tableName];
    if (schemaName) {
      parameters.unshift(schemaName);
    }
    
    const query = schemaName 
      ? `${queries.getTableColumns} WHERE table_schema = $1 AND table_name = $2`
      : `${queries.getTableColumns} WHERE table_name = $1`;
    
    const result = await this.executeQuery<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: any;
      character_maximum_length?: number;
      numeric_precision?: number;
      numeric_scale?: number;
    }>(query, parameters);
    
    if (!result.success || !result.data) {
      throw new SchemaError(`Failed to get columns for table ${tableName}`);
    }
    
    return result.data.map(row => ({
      name: row.column_name,
      type: this.mapDataType(row.data_type),
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      maxLength: row.character_maximum_length,
      precision: row.numeric_precision,
      scale: row.numeric_scale,
      isPrimaryKey: false, // Will be set by getTablePrimaryKey
      isUnique: false, // Will be determined from indexes
      isAutoIncrement: row.column_default?.includes('nextval') || false,
      originalType: row.data_type,
      metadata: {
        isNullable: row.is_nullable,
        hasDefault: row.column_default !== null
      }
    }));
  }
  
  async getTablePrimaryKey(tableName: string, schemaName?: string): Promise<string[]> {
    // This is a simplified implementation - should be overridden by specific connectors
    const query = `
      SELECT column_name 
      FROM information_schema.key_column_usage 
      WHERE table_name = $1 
        AND constraint_name LIKE '%pkey%'
        ${schemaName ? 'AND table_schema = $2' : ''}
      ORDER BY ordinal_position
    `;
    
    const parameters = [tableName];
    if (schemaName) {
      parameters.push(schemaName);
    }
    
    const result = await this.executeQuery<{ column_name: string }>(query, parameters);
    
    if (!result.success || !result.data) {
      return [];
    }
    
    return result.data.map(row => row.column_name);
  }
  
  async getTableForeignKeys(tableName: string, schemaName?: string): Promise<{
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
    constraintName: string;
  }[]> {
    const queries = this.getInformationSchemaQueries();
    const parameters = [tableName];
    if (schemaName) {
      parameters.unshift(schemaName);
    }
    
    const query = schemaName 
      ? `${queries.getTableForeignKeys} WHERE tc.table_schema = $1 AND tc.table_name = $2`
      : `${queries.getTableForeignKeys} WHERE tc.table_name = $1`;
    
    const result = await this.executeQuery<{
      constraint_name: string;
      column_name: string;
      referenced_table: string;
      referenced_column: string;
    }>(query, parameters);
    
    if (!result.success || !result.data) {
      return [];
    }
    
    return result.data.map(row => ({
      columnName: row.column_name,
      referencedTable: row.referenced_table,
      referencedColumn: row.referenced_column,
      constraintName: row.constraint_name
    }));
  }
  
  async getTableIndexes(tableName: string, schemaName?: string): Promise<{
    name: string;
    columns: string[];
    unique: boolean;
    type: string;
  }[]> {
    const queries = this.getInformationSchemaQueries();
    const parameters = [tableName];
    if (schemaName) {
      parameters.unshift(schemaName);
    }
    
    const query = schemaName 
      ? `${queries.getTableIndexes} WHERE schemaname = $1 AND tablename = $2`
      : `${queries.getTableIndexes} WHERE tablename = $1`;
    
    const result = await this.executeQuery<{
      indexname: string;
      indexdef: string;
    }>(query, parameters);
    
    if (!result.success || !result.data) {
      return [];
    }
    
    // Parse index definitions - this is simplified and should be improved
    return result.data.map(row => ({
      name: row.indexname,
      columns: [tableName], // Simplified - should parse from indexdef
      unique: row.indexdef.includes('UNIQUE'),
      type: 'btree' // Default - should be parsed from indexdef
    }));
  }
  
  /**
   * Schema comparison - basic implementation
   */
  async compareSchemas(source: DatabaseSchema, target: DatabaseSchema): Promise<SchemaComparison> {
    const comparison: SchemaComparison = {
      hasChanges: false,
      addedTables: [],
      removedTables: [],
      modifiedTables: [],
      addedViews: [],
      removedViews: [],
      modifiedViews: []
    };
    
    const sourceTableMap = new Map(source.tables.map(t => [t.name, t]));
    const targetTableMap = new Map(target.tables.map(t => [t.name, t]));
    
    // Find added tables
    for (const table of target.tables) {
      if (!sourceTableMap.has(table.name)) {
        comparison.addedTables.push(table);
        comparison.hasChanges = true;
      }
    }
    
    // Find removed tables
    for (const table of source.tables) {
      if (!targetTableMap.has(table.name)) {
        comparison.removedTables.push(table);
        comparison.hasChanges = true;
      }
    }
    
    // Find modified tables (simplified comparison)
    for (const table of source.tables) {
      const targetTable = targetTableMap.get(table.name);
      if (targetTable) {
        const sourceColumns = new Set(table.columns.map(c => c.name));
        const targetColumns = new Set(targetTable.columns.map(c => c.name));
        
        if (sourceColumns.size !== targetColumns.size || 
            !Array.from(sourceColumns).every(c => targetColumns.has(c))) {
          comparison.modifiedTables.push({
            table: targetTable,
            changes: {
              addedColumns: [],
              removedColumns: [],
              modifiedColumns: [],
              addedIndexes: [],
              removedIndexes: [],
              addedConstraints: [],
              removedConstraints: []
            }
          });
          comparison.hasChanges = true;
        }
      }
    }
    
    return comparison;
  }
  
  async generateSchemaDiff(comparison: SchemaComparison): Promise<string[]> {
    const statements: string[] = [];
    
    // Generate CREATE TABLE statements for added tables
    for (const table of comparison.addedTables) {
      statements.push(`-- Add table: ${table.name}`);
      statements.push(this.generateCreateTableStatement(table));
    }
    
    // Generate DROP TABLE statements for removed tables
    for (const table of comparison.removedTables) {
      statements.push(`-- Remove table: ${table.name}`);
      statements.push(`DROP TABLE IF EXISTS ${this.escapeIdentifier(table.name)};`);
    }
    
    // Generate ALTER TABLE statements for modified tables
    for (const modified of comparison.modifiedTables) {
      statements.push(`-- Modify table: ${modified.table.name}`);
      // Add specific column/index/constraint modifications
      // This is a simplified implementation
    }
    
    return statements;
  }
  
  /**
   * Data operations with error handling and retries
   */
  async getTableData<T = any>(
    tableName: string, 
    options: DataOperationOptions = {}
  ): Promise<QueryResult<T>> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected to database');
    }
    
    try {
      const query = this.buildSelectQuery(tableName, {
        where: options.filters?.where,
        orderBy: options.pagination?.orderBy,
        limit: options.pagination?.limit,
        offset: options.pagination?.offset
      });
      
      return await this.executeQuery<T>(query, [], options.context);
    } catch (error) {
      throw error instanceof ConnectorError 
        ? error 
        : ConnectorErrorUtils.wrapDatabaseError(error as Error, { table: tableName, operation: 'select' });
    }
  }
  
  async insertRecord<T = any>(
    tableName: string, 
    data: Record<string, any>, 
    options: { returning?: string[]; context?: QueryContext } = {}
  ): Promise<QueryResult<T>> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected to database');
    }
    
    try {
      const { query, parameters } = this.buildInsertQuery(tableName, data, {
        returning: options.returning
      });
      
      return await this.executeQuery<T>(query, parameters, options.context);
    } catch (error) {
      throw error instanceof ConnectorError 
        ? error 
        : ConnectorErrorUtils.wrapDatabaseError(error as Error, { table: tableName, operation: 'insert' });
    }
  }
  
  async insertRecords<T = any>(
    tableName: string, 
    data: Record<string, any>[], 
    options: BulkOperationOptions = {}
  ): Promise<QueryResult<T>> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected to database');
    }
    
    try {
      const { query, parameters } = this.buildInsertQuery(tableName, data, {
        returning: options.returning
      });
      
      return await this.executeQuery<T>(query, parameters, options.context);
    } catch (error) {
      throw error instanceof ConnectorError 
        ? error 
        : ConnectorErrorUtils.wrapDatabaseError(error as Error, { table: tableName, operation: 'bulk_insert' });
    }
  }
  
  async updateRecord<T = any>(
    tableName: string, 
    id: any, 
    data: Record<string, any>, 
    options: { returning?: string[]; context?: QueryContext; idColumn?: string } = {}
  ): Promise<QueryResult<T>> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected to database');
    }
    
    try {
      const idColumn = options.idColumn || 'id';
      const { query, parameters } = this.buildUpdateQuery(
        tableName, 
        data, 
        { [idColumn]: id }, 
        { returning: options.returning }
      );
      
      return await this.executeQuery<T>(query, parameters, options.context);
    } catch (error) {
      throw error instanceof ConnectorError 
        ? error 
        : ConnectorErrorUtils.wrapDatabaseError(error as Error, { table: tableName, operation: 'update' });
    }
  }
  
  async updateRecords<T = any>(
    tableName: string, 
    criteria: Record<string, any>, 
    data: Record<string, any>, 
    options: { returning?: string[]; context?: QueryContext } = {}
  ): Promise<QueryResult<T>> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected to database');
    }
    
    try {
      const { query, parameters } = this.buildUpdateQuery(
        tableName, 
        data, 
        criteria, 
        { returning: options.returning }
      );
      
      return await this.executeQuery<T>(query, parameters, options.context);
    } catch (error) {
      throw error instanceof ConnectorError 
        ? error 
        : ConnectorErrorUtils.wrapDatabaseError(error as Error, { table: tableName, operation: 'bulk_update' });
    }
  }
  
  async deleteRecord(
    tableName: string, 
    id: any, 
    options: { context?: QueryContext; idColumn?: string } = {}
  ): Promise<QueryResult> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected to database');
    }
    
    try {
      const idColumn = options.idColumn || 'id';
      const { query, parameters } = this.buildDeleteQuery(tableName, { [idColumn]: id });
      
      return await this.executeQuery(query, parameters, options.context);
    } catch (error) {
      throw error instanceof ConnectorError 
        ? error 
        : ConnectorErrorUtils.wrapDatabaseError(error as Error, { table: tableName, operation: 'delete' });
    }
  }
  
  async deleteRecords(
    tableName: string, 
    criteria: Record<string, any>, 
    options: { context?: QueryContext } = {}
  ): Promise<QueryResult> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected to database');
    }
    
    try {
      const { query, parameters } = this.buildDeleteQuery(tableName, criteria);
      
      return await this.executeQuery(query, parameters, options.context);
    } catch (error) {
      throw error instanceof ConnectorError 
        ? error 
        : ConnectorErrorUtils.wrapDatabaseError(error as Error, { table: tableName, operation: 'bulk_delete' });
    }
  }
  
  /**
   * Query execution with connection management
   */
  async executeQuery<T = any>(query: string, parameters: any[] = [], context?: QueryContext): Promise<QueryResult<T>> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected to database');
    }
    
    const startTime = Date.now();
    const connection = await this.pool.acquire();
    
    try {
      const result = await this.executeRawQuery<T>(connection, query, parameters, context);
      
      const executionTime = Date.now() - startTime;
      this.metrics.queriesExecuted++;
      this.metrics.totalQueryTime += executionTime;
      this.metrics.lastActivity = new Date();
      
      if (this.connectionEvents?.onQuery) {
        await this.connectionEvents.onQuery(query, executionTime);
      }
      
      return {
        ...result,
        executionTimeMs: executionTime
      };
    } finally {
      await this.pool.release(connection);
    }
  }
  
  async executeTransaction<T = any>(
    operations: Array<{
      query: string;
      parameters?: any[];
    }>,
    context?: QueryContext
  ): Promise<QueryResult<T>> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected to database');
    }
    
    const connection = await this.pool.acquire();
    let result: QueryResult<T> = { success: false };
    
    try {
      // Begin transaction
      await this.executeRawQuery(connection, 'BEGIN', [], context);
      
      const results: any[] = [];
      
      for (const operation of operations) {
        const operationResult = await this.executeRawQuery(
          connection, 
          operation.query, 
          operation.parameters || [], 
          context
        );
        
        if (!operationResult.success) {
          throw operationResult.error || new QueryError('Transaction operation failed');
        }
        
        if (operationResult.data) {
          results.push(...operationResult.data);
        }
      }
      
      // Commit transaction
      await this.executeRawQuery(connection, 'COMMIT', [], context);
      
      result = {
        success: true,
        data: results as T[],
        affectedRows: results.length
      };
    } catch (error) {
      // Rollback transaction
      try {
        await this.executeRawQuery(connection, 'ROLLBACK', [], context);
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }
      
      result = {
        success: false,
        error: error instanceof ConnectorError 
          ? error 
          : ConnectorErrorUtils.wrapDatabaseError(error as Error, { operation: 'transaction' })
      };
    } finally {
      await this.pool.release(connection);
    }
    
    return result;
  }
  
  // Additional abstract and utility methods would continue here...
  // This includes methods like:
  // - upsertRecord, bulkUpsert, countRecords
  // - buildSelectQuery, buildInsertQuery, buildUpdateQuery, buildDeleteQuery
  // - getQueryExecutionPlan, getConnectionMetrics
  // - serializeValue, deserializeValue, convertToNativeType, getTypeMapping
  // - escapeIdentifier, escapeLiteral, getQuoteCharacter, getParameterPlaceholder
  // - healthCheck, cleanup
  // - Helper methods like getServerVersion, mapDataType, generateCreateTableStatement
  
  /**
   * Utility methods that specific implementations can override
   */
  protected abstract getServerVersion(connection: any): Promise<string>;
  
  protected mapDataType(dbType: string): DatabaseType {
    const typeMap: Record<string, DatabaseType> = {
      'integer': DatabaseType.INTEGER,
      'int': DatabaseType.INTEGER,
      'bigint': DatabaseType.BIGINT,
      'decimal': DatabaseType.DECIMAL,
      'numeric': DatabaseType.NUMERIC,
      'real': DatabaseType.REAL,
      'double': DatabaseType.DOUBLE,
      'float': DatabaseType.FLOAT,
      'serial': DatabaseType.SERIAL,
      'bigserial': DatabaseType.BIGSERIAL,
      'text': DatabaseType.TEXT,
      'varchar': DatabaseType.VARCHAR,
      'char': DatabaseType.CHAR,
      'uuid': DatabaseType.UUID,
      'date': DatabaseType.DATE,
      'time': DatabaseType.TIME,
      'timestamp': DatabaseType.TIMESTAMP,
      'timestamptz': DatabaseType.TIMESTAMPTZ,
      'interval': DatabaseType.INTERVAL,
      'boolean': DatabaseType.BOOLEAN,
      'bool': DatabaseType.BOOLEAN,
      'json': DatabaseType.JSON,
      'jsonb': DatabaseType.JSONB,
      'bytea': DatabaseType.BYTEA,
      'blob': DatabaseType.BLOB
    };
    
    return typeMap[dbType.toLowerCase()] || DatabaseType.UNKNOWN;
  }
  
  protected generateCreateTableStatement(table: TableDefinition): string {
    const columns = table.columns.map(col => {
      let def = `${this.escapeIdentifier(col.name)} ${col.originalType}`;
      
      if (!col.nullable) {
        def += ' NOT NULL';
      }
      
      if (col.defaultValue !== undefined) {
        def += ` DEFAULT ${col.defaultValue}`;
      }
      
      return def;
    }).join(',\n  ');
    
    let statement = `CREATE TABLE ${this.escapeIdentifier(table.name)} (\n  ${columns}`;
    
    if (table.primaryKey.length > 0) {
      const pkColumns = table.primaryKey.map(col => this.escapeIdentifier(col)).join(', ');
      statement += `,\n  PRIMARY KEY (${pkColumns})`;
    }
    
    statement += '\n);';
    
    return statement;
  }
  
  /**
   * Placeholder implementations for required interface methods
   * These should be implemented by specific SQL connector implementations
   */
  buildSelectQuery(tableName: string, options?: any): string {
    // Basic implementation - should be overridden
    return `SELECT * FROM ${this.escapeIdentifier(tableName)}`;
  }
  
  buildInsertQuery(tableName: string, data: any, options?: any): { query: string; parameters: any[] } {
    // Basic implementation - should be overridden
    return { query: '', parameters: [] };
  }
  
  buildUpdateQuery(tableName: string, data: any, criteria: any, options?: any): { query: string; parameters: any[] } {
    // Basic implementation - should be overridden
    return { query: '', parameters: [] };
  }
  
  buildDeleteQuery(tableName: string, criteria: any): { query: string; parameters: any[] } {
    // Basic implementation - should be overridden
    return { query: '', parameters: [] };
  }
  
  escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
  
  escapeLiteral(literal: string): string {
    return `'${literal.replace(/'/g, "''")}'`;
  }
  
  getQuoteCharacter(): string {
    return '"';
  }
  
  getParameterPlaceholder(index: number): string {
    return `$${index + 1}`;
  }
  
  async healthCheck() {
    return {
      healthy: this.isConnected(),
      status: this.isConnected() ? 'connected' : 'disconnected',
      checks: [],
      timestamp: new Date()
    };
  }
  
  async cleanup(): Promise<void> {
    await this.disconnect();
  }
  
  // Placeholder methods that must be implemented by subclasses
  async upsertRecord(): Promise<any> { throw new Error('Not implemented'); }
  async bulkUpsert(): Promise<any> { throw new Error('Not implemented'); }
  async countRecords(): Promise<any> { throw new Error('Not implemented'); }
  async getQueryExecutionPlan(): Promise<any> { throw new Error('Not implemented'); }
  async getConnectionMetrics(): Promise<any> { return this.metrics; }
  serializeValue(value: any, columnType: string): any { return value; }
  deserializeValue(value: any, columnType: string): any { return value; }
  convertToNativeType(value: any, targetType: string): any { return value; }
  getTypeMapping(): Record<string, string> { return {}; }
}
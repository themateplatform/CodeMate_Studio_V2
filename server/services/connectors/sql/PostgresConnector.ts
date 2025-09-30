import pg, { Pool, PoolClient, QueryResult } from 'pg';
import { z } from 'zod';
import { 
  SQLBaseConnector, 
  SQLConnectionPool, 
  SQLTransaction, 
  SQLConnectorConfig 
} from './SQLBaseConnector';
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
 * Postgres-specific connection configuration
 */
export interface PostgresConnectorConfig extends SQLConnectorConfig {
  // Postgres-specific connection options
  applicationName?: string;
  connectionString?: string;
  
  // Postgres connection pool configuration
  poolConfig?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    acquireTimeoutMillis?: number;
    maxUses?: number;
    allowExitOnIdle?: boolean;
    keepAlive?: boolean;
    keepAliveInitialDelayMillis?: number;
  };
  
  // SSL configuration for Postgres
  sslConfig?: {
    enabled: boolean;
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
    mode?: 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';
  };
  
  // Query configuration
  queryTimeout?: number;
  statementTimeout?: number;
  
  // Schema configuration
  searchPath?: string[];
  defaultSchema?: string;
}

/**
 * Postgres-specific connection pool implementation
 */
export class PostgresConnectionPool extends SQLConnectionPool {
  private pgPool!: Pool;
  
  constructor(config: PostgresConnectorConfig) {
    super(config);
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Build connection configuration
      const poolConfig = this.buildPoolConfig();
      
      // Create pg.Pool instance
      this.pgPool = new Pool(poolConfig);
      
      // Set up error handling
      this.pgPool.on('error', (err) => {
        console.error('Postgres pool error:', err);
      });
      
      // Test initial connection
      const client = await this.pgPool.connect();
      await client.query('SELECT 1');
      client.release();
      
      this.isInitialized = true;
    } catch (error) {
      throw new ConnectionError(`Failed to initialize Postgres connection pool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private buildPoolConfig(): any {
    const config = this.config as PostgresConnectorConfig;
    
    return {
      // Connection parameters will be set via credentials
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      
      // Pool configuration
      min: config.poolConfig?.min || 1,
      max: config.poolConfig?.max || 10,
      idleTimeoutMillis: config.poolConfig?.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.poolConfig?.connectionTimeoutMillis || 5000,
      acquireTimeoutMillis: config.poolConfig?.acquireTimeoutMillis || 60000,
      maxUses: config.poolConfig?.maxUses || Infinity,
      allowExitOnIdle: config.poolConfig?.allowExitOnIdle || false,
      keepAlive: config.poolConfig?.keepAlive || true,
      keepAliveInitialDelayMillis: config.poolConfig?.keepAliveInitialDelayMillis || 10000,
      
      // SSL configuration
      ssl: config.sslConfig?.enabled ? {
        rejectUnauthorized: config.sslConfig.rejectUnauthorized ?? true,
        ca: config.sslConfig.ca,
        cert: config.sslConfig.cert,
        key: config.sslConfig.key
      } : false,
      
      // Query configuration
      query_timeout: config.queryTimeout || 30000,
      statement_timeout: config.statementTimeout || 30000,
      
      // Application name for monitoring
      application_name: config.applicationName || 'codevibe-connector'
    };
  }
  
  async acquire(): Promise<PoolClient> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      return await this.pgPool.connect();
    } catch (error) {
      throw new ConnectionError(`Failed to acquire connection from pool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async release(connection: PoolClient): Promise<void> {
    try {
      connection.release();
    } catch (error) {
      console.warn('Error releasing connection:', error);
    }
  }
  
  async destroy(connection: PoolClient): Promise<void> {
    try {
      connection.release(true); // Release with error flag to destroy
    } catch (error) {
      console.warn('Error destroying connection:', error);
    }
  }
  
  async clear(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    this.isInitialized = false;
  }
  
  getStats() {
    if (!this.pgPool) {
      return super.getStats();
    }
    
    return {
      total: this.pgPool.totalCount,
      idle: this.pgPool.idleCount,
      active: this.pgPool.totalCount - this.pgPool.idleCount,
      pending: this.pgPool.waitingCount,
      max: this.config.poolConfig?.max || 10,
      min: this.config.poolConfig?.min || 1,
    };
  }
}

/**
 * Postgres transaction implementation
 */
export class PostgresTransaction extends SQLTransaction {
  private client: PoolClient;
  private inTransaction = false;
  
  constructor(id: string, client: PoolClient, connector: PostgresConnector) {
    super(id, client, connector);
    this.client = client;
  }
  
  async execute<T = any>(query: string, parameters?: any[]): Promise<ConnectorQueryResult<T>> {
    const startTime = Date.now();
    
    try {
      if (!this.inTransaction) {
        await this.client.query('BEGIN');
        this.inTransaction = true;
      }
      
      const result = await this.client.query(query, parameters);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        data: result.rows,
        affectedRows: result.rowCount,
        executionTimeMs: executionTime,
        metadata: {
          command: result.command,
          oid: result.oid,
          fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID }))
        }
      };
    } catch (error) {
      return {
        success: false,
        executionTimeMs: Date.now() - startTime,
        error: ConnectorErrorUtils.wrapDatabaseError(error as Error)
      };
    }
  }
  
  async commit(): Promise<void> {
    try {
      if (this.inTransaction) {
        await this.client.query('COMMIT');
        this.inTransaction = false;
        this.status = 'committed';
      }
    } catch (error) {
      this.status = 'aborted';
      throw new QueryError(`Transaction commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async rollback(): Promise<void> {
    try {
      if (this.inTransaction) {
        await this.client.query('ROLLBACK');
        this.inTransaction = false;
        this.status = 'aborted';
      }
    } catch (error) {
      this.status = 'aborted';
      throw new QueryError(`Transaction rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async savepoint(name: string): Promise<void> {
    try {
      if (!this.inTransaction) {
        throw new QueryError('Cannot create savepoint outside transaction');
      }
      await this.client.query(`SAVEPOINT ${this.escapeIdentifier(name)}`);
    } catch (error) {
      throw new QueryError(`Savepoint creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async rollbackToSavepoint(name: string): Promise<void> {
    try {
      await this.client.query(`ROLLBACK TO SAVEPOINT ${this.escapeIdentifier(name)}`);
    } catch (error) {
      throw new QueryError(`Rollback to savepoint failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async releaseSavepoint(name: string): Promise<void> {
    try {
      await this.client.query(`RELEASE SAVEPOINT ${this.escapeIdentifier(name)}`);
    } catch (error) {
      throw new QueryError(`Release savepoint failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}

/**
 * PostgreSQL database connector implementation
 */
export class PostgresConnector extends SQLBaseConnector {
  public readonly type = 'postgres';
  private connectionCredentials?: {
    user: string;
    password: string;
    host?: string;
    port?: number;
    database?: string;
    connectionString?: string;
  };
  
  protected createConnectionPool(config: PostgresConnectorConfig): PostgresConnectionPool {
    return new PostgresConnectionPool(config);
  }
  
  protected async createConnection(credentials: Record<string, any>): Promise<PoolClient> {
    this.connectionCredentials = credentials;
    
    // Update pool configuration with credentials
    const poolConfig = (this.pool as PostgresConnectionPool);
    const pgPool = (poolConfig as any).pgPool as Pool;
    
    if (!pgPool) {
      // If pool not yet created, store credentials for later use
      return await this.pool.acquire();
    }
    
    return await this.pool.acquire();
  }
  
  protected async executeRawQuery<T = any>(
    connection: PoolClient,
    query: string,
    parameters?: any[],
    context?: QueryContext
  ): Promise<ConnectorQueryResult<T>> {
    const startTime = Date.now();
    
    try {
      // Set query timeout if specified
      if (context?.timeoutMs) {
        await connection.query(`SET statement_timeout = ${context.timeoutMs}`);
      }
      
      const result: QueryResult = await connection.query(query, parameters);
      const executionTime = Date.now() - startTime;
      
      this.metrics.queriesExecuted++;
      this.metrics.totalQueryTime += executionTime;
      this.metrics.lastActivity = new Date();
      
      return {
        success: true,
        data: result.rows as T[],
        totalCount: result.rowCount,
        affectedRows: result.rowCount,
        executionTimeMs: executionTime,
        metadata: {
          command: result.command,
          oid: result.oid,
          fields: result.fields?.map(f => ({ 
            name: f.name, 
            dataTypeID: f.dataTypeID,
            format: f.format,
            modifier: f.modifier
          }))
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const pgError = error as any;
      
      return {
        success: false,
        executionTimeMs: executionTime,
        error: new QueryError(
          `Postgres query failed: ${pgError.message}`,
          {
            query,
            parameters,
            code: pgError.code,
            detail: pgError.detail,
            hint: pgError.hint,
            position: pgError.position,
            where: pgError.where,
            schema: pgError.schema_name,
            table: pgError.table_name,
            column: pgError.column_name,
            dataType: pgError.data_type_name,
            constraint: pgError.constraint_name
          }
        )
      };
    } finally {
      // Reset statement timeout
      if (context?.timeoutMs) {
        try {
          await connection.query('SET statement_timeout = DEFAULT');
        } catch {
          // Ignore timeout reset errors
        }
      }
    }
  }
  
  protected getInformationSchemaQueries() {
    return {
      listSchemas: `
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schema_name
      `,
      
      listTables: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY table_name
      `,
      
      getTableColumns: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
          ordinal_position,
          udt_name,
          array_dimensions
        FROM information_schema.columns
        WHERE table_name = $1
          AND table_schema = COALESCE($2, 'public')
        ORDER BY ordinal_position
      `,
      
      getTableConstraints: `
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          tc.table_schema,
          tc.table_name,
          kcu.column_name,
          ccu.table_schema AS foreign_table_schema,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.update_rule,
          rc.delete_rule
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        LEFT JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = $1
          AND tc.table_schema = COALESCE($2, 'public')
        ORDER BY tc.constraint_type, kcu.ordinal_position
      `,
      
      getTableIndexes: `
        SELECT
          indexname,
          indexdef,
          schemaname,
          tablename
        FROM pg_indexes
        WHERE tablename = $1
          AND schemaname = COALESCE($2, 'public')
        ORDER BY indexname
      `,
      
      getTableForeignKeys: `
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.update_rule,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
          AND tc.table_schema = COALESCE($2, 'public')
        ORDER BY kcu.ordinal_position
      `
    };
  }
  
  /**
   * Map PostgreSQL data types to our standard DatabaseType enum
   */
  protected mapDataType(postgresType: string): DatabaseType {
    const typeMap: Record<string, DatabaseType> = {
      // Numeric types
      'integer': DatabaseType.INTEGER,
      'int4': DatabaseType.INTEGER,
      'bigint': DatabaseType.BIGINT,
      'int8': DatabaseType.BIGINT,
      'smallint': DatabaseType.INTEGER,
      'int2': DatabaseType.INTEGER,
      'decimal': DatabaseType.DECIMAL,
      'numeric': DatabaseType.NUMERIC,
      'real': DatabaseType.REAL,
      'float4': DatabaseType.REAL,
      'double precision': DatabaseType.DOUBLE,
      'float8': DatabaseType.DOUBLE,
      'serial': DatabaseType.SERIAL,
      'serial4': DatabaseType.SERIAL,
      'bigserial': DatabaseType.BIGSERIAL,
      'serial8': DatabaseType.BIGSERIAL,
      
      // String types
      'text': DatabaseType.TEXT,
      'varchar': DatabaseType.VARCHAR,
      'character varying': DatabaseType.VARCHAR,
      'char': DatabaseType.CHAR,
      'character': DatabaseType.CHAR,
      'uuid': DatabaseType.UUID,
      
      // Date/Time types
      'date': DatabaseType.DATE,
      'time': DatabaseType.TIME,
      'timestamp': DatabaseType.TIMESTAMP,
      'timestamptz': DatabaseType.TIMESTAMPTZ,
      'timestamp with time zone': DatabaseType.TIMESTAMPTZ,
      'timestamp without time zone': DatabaseType.TIMESTAMP,
      'interval': DatabaseType.INTERVAL,
      
      // Boolean
      'boolean': DatabaseType.BOOLEAN,
      'bool': DatabaseType.BOOLEAN,
      
      // JSON types
      'json': DatabaseType.JSON,
      'jsonb': DatabaseType.JSONB,
      
      // Binary types
      'bytea': DatabaseType.BYTEA,
      
      // Array types
      'ARRAY': DatabaseType.ARRAY,
    };
    
    // Handle array types
    if (postgresType.includes('[]')) {
      return DatabaseType.ARRAY;
    }
    
    // Handle enum types
    if (postgresType.startsWith('USER-DEFINED')) {
      return DatabaseType.ENUM;
    }
    
    return typeMap[postgresType.toLowerCase()] || DatabaseType.UNKNOWN;
  }
  
  async getServerVersion(connection?: PoolClient): Promise<string> {
    const client = connection || await this.pool.acquire();
    
    try {
      const result = await this.executeRawQuery(client, 'SELECT version() as version');
      if (result.success && result.data?.[0]) {
        return result.data[0].version;
      }
      return 'Unknown';
    } catch (error) {
      return 'Unknown';
    } finally {
      if (!connection) {
        await this.pool.release(client);
      }
    }
  }
  
  async createTransaction(options?: { isolationLevel?: string }): Promise<PostgresTransaction> {
    const client = await this.pool.acquire();
    const transactionId = `pg_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const transaction = new PostgresTransaction(transactionId, client, this);
    
    try {
      await client.query('BEGIN');
      
      if (options?.isolationLevel) {
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
      }
      
      return transaction;
    } catch (error) {
      await this.pool.release(client);
      throw new QueryError(`Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Postgres-specific utility methods
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
  
  getTypeMapping(): Record<string, string> {
    return {
      [DatabaseType.INTEGER]: 'integer',
      [DatabaseType.BIGINT]: 'bigint',
      [DatabaseType.DECIMAL]: 'decimal',
      [DatabaseType.NUMERIC]: 'numeric',
      [DatabaseType.REAL]: 'real',
      [DatabaseType.DOUBLE]: 'double precision',
      [DatabaseType.FLOAT]: 'real',
      [DatabaseType.SERIAL]: 'serial',
      [DatabaseType.BIGSERIAL]: 'bigserial',
      [DatabaseType.TEXT]: 'text',
      [DatabaseType.VARCHAR]: 'varchar',
      [DatabaseType.CHAR]: 'char',
      [DatabaseType.UUID]: 'uuid',
      [DatabaseType.DATE]: 'date',
      [DatabaseType.TIME]: 'time',
      [DatabaseType.TIMESTAMP]: 'timestamp',
      [DatabaseType.TIMESTAMPTZ]: 'timestamptz',
      [DatabaseType.INTERVAL]: 'interval',
      [DatabaseType.BOOLEAN]: 'boolean',
      [DatabaseType.JSON]: 'json',
      [DatabaseType.JSONB]: 'jsonb',
      [DatabaseType.BYTEA]: 'bytea',
      [DatabaseType.ARRAY]: 'text[]',
    };
  }
}
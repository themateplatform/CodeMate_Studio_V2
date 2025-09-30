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
  ConnectionEvents
} from '../interfaces/IConnector';
import {
  DocumentSchema,
  CollectionDefinition,
  DocumentFieldDefinition,
  DatabaseType,
  DatabaseSchema,
  SchemaComparison
} from '../types/schema';
import {
  ConnectorError,
  ConnectionError,
  ConnectionTimeoutError,
  AuthenticationError,
  QueryError,
  ValidationError,
  SchemaError,
  ConnectorErrorUtils
} from '../types/errors';
import { TypeConversionUtils, TypeConversionConfig, DEFAULT_TYPE_CONVERSION_CONFIG } from '../utils/typeConversion';
import { DataConnectorCredentialsService } from '../../dataConnectorCredentialsService';

/**
 * Document-specific connector configuration
 */
export interface DocumentConnectorConfig extends ConnectorConfig {
  // Database configuration
  databaseId: string;
  projectId?: string;
  region?: string;
  
  // Authentication configuration
  authentication: {
    type: 'service_account' | 'api_key' | 'oauth2' | 'admin_sdk' | 'custom';
    serviceAccountPath?: string;
    apiKey?: string;
    projectId?: string;
    
    // OAuth2 specific
    scopes?: string[];
    
    // Custom auth function
    customAuthFunction?: (credentials: any) => Promise<any>;
  };
  
  // Schema sampling configuration
  schemaSampling: {
    enabled: boolean;
    sampleSize: number; // Number of documents to sample per collection
    maxDepth: number; // Maximum nesting depth to analyze
    minFieldPrevalence: number; // Minimum percentage of docs that must contain a field
    autoRefresh: boolean; // Whether to automatically refresh schema
    refreshIntervalMs: number; // How often to refresh schema
    cacheSchema: boolean; // Whether to cache materialized schema
  };
  
  // Query configuration
  queryConfig?: {
    defaultLimit: number;
    maxLimit: number;
    timeout: number;
    enableRealTimeUpdates: boolean;
    enableAggregation: boolean;
    enableTransactions: boolean;
  };
  
  // Real-time configuration
  realTime?: {
    enabled: boolean;
    maxListeners: number;
    heartbeatIntervalMs: number;
    connectionTimeoutMs: number;
    reconnectDelayMs: number;
    maxReconnectAttempts: number;
  };
  
  // Indexing configuration
  indexing?: {
    autoCreateIndexes: boolean;
    suggestIndexes: boolean;
    maxCompoundIndexFields: number;
  };
  
  // Type conversion configuration
  typeConversion?: TypeConversionConfig;
}

/**
 * Document query context for NoSQL operations
 */
export interface DocumentQueryContext extends QueryContext {
  collection?: string;
  documentId?: string;
  subcollection?: string;
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  where?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
    value: any;
  }>;
  realTimeListener?: boolean;
  aggregationType?: 'count' | 'sum' | 'avg' | 'min' | 'max';
}

/**
 * Schema sampling result
 */
export interface SchemaSamplingResult {
  collection: string;
  sampleSize: number;
  sampledDocuments: number;
  fields: DocumentFieldDefinition[];
  nestedCollections: string[];
  samplingDate: Date;
  confidence: number; // Confidence level of the schema (0-1)
  inconsistencies: Array<{
    field: string;
    types: DatabaseType[];
    prevalence: Record<DatabaseType, number>;
  }>;
}

/**
 * Real-time subscription management
 */
export interface RealTimeSubscription {
  id: string;
  collection: string;
  query?: any;
  callback: (change: DocumentChange) => void;
  errorCallback?: (error: Error) => void;
  active: boolean;
  createdAt: Date;
}

export interface DocumentChange {
  type: 'added' | 'modified' | 'removed';
  document: any;
  documentId: string;
  oldDocument?: any;
  path: string;
  timestamp: Date;
}

/**
 * Document field analyzer for schema sampling
 */
export class DocumentFieldAnalyzer {
  private config: DocumentConnectorConfig['schemaSampling'];
  
  constructor(config: DocumentConnectorConfig['schemaSampling']) {
    this.config = config;
  }
  
  /**
   * Analyze a set of documents to extract field definitions
   */
  analyzeDocuments(documents: any[]): DocumentFieldDefinition[] {
    if (!documents.length) return [];
    
    const fieldMap = new Map<string, {
      types: Set<DatabaseType>;
      nullable: boolean;
      prevalence: number;
      samples: any[];
      maxLength?: number;
      nested?: boolean;
      arrayElementTypes?: Set<DatabaseType>;
      nestedFields?: Map<string, any>;
    }>();
    
    // Analyze each document
    documents.forEach(doc => {
      this.analyzeDocument(doc, fieldMap, '', 0);
    });
    
    // Convert to field definitions
    const fields: DocumentFieldDefinition[] = [];
    const totalDocs = documents.length;
    
    fieldMap.forEach((analysis, fieldPath) => {
      const prevalence = analysis.prevalence / totalDocs;
      
      // Only include fields that meet the minimum prevalence threshold
      if (prevalence >= this.config.minFieldPrevalence) {
        const types = Array.from(analysis.types);
        const primaryType = this.determinePrimaryType(types, analysis.samples);
        
        const field: DocumentFieldDefinition = {
          name: fieldPath.split('.').pop() || fieldPath,
          type: primaryType,
          nullable: analysis.nullable,
          fieldPath,
          prevalence,
          isOptional: prevalence < 1.0,
          sampleValues: analysis.samples.slice(0, 5), // Keep first 5 samples
          originalType: types.join(' | '),
          metadata: {
            types,
            totalOccurrences: analysis.prevalence,
            maxLength: analysis.maxLength
          }
        };
        
        // Handle nested objects
        if (analysis.nested && analysis.nestedFields) {
          field.nested = true;
          field.nestedFields = this.convertNestedFieldsToDefinitions(analysis.nestedFields, totalDocs);
        }
        
        // Handle arrays
        if (analysis.arrayElementTypes && analysis.arrayElementTypes.size > 0) {
          field.arrayElement = true;
          field.arrayElementType = this.determinePrimaryType(
            Array.from(analysis.arrayElementTypes), 
            analysis.samples.filter(Array.isArray).flat()
          );
        }
        
        fields.push(field);
      }
    });
    
    return fields;
  }
  
  private analyzeDocument(
    doc: any, 
    fieldMap: Map<string, any>, 
    prefix: string = '', 
    depth: number = 0
  ): void {
    if (depth >= this.config.maxDepth || !doc || typeof doc !== 'object') {
      return;
    }
    
    Object.entries(doc).forEach(([key, value]) => {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      
      if (!fieldMap.has(fieldPath)) {
        fieldMap.set(fieldPath, {
          types: new Set<DatabaseType>(),
          nullable: false,
          prevalence: 0,
          samples: [],
          nested: false,
          arrayElementTypes: new Set<DatabaseType>(),
          nestedFields: new Map()
        });
      }
      
      const analysis = fieldMap.get(fieldPath)!;
      analysis.prevalence++;
      
      if (value === null || value === undefined) {
        analysis.nullable = true;
        analysis.types.add(DatabaseType.UNKNOWN);
      } else {
        const type = this.inferDatabaseType(value);
        analysis.types.add(type);
        analysis.samples.push(value);
        
        // Track string lengths
        if (typeof value === 'string') {
          analysis.maxLength = Math.max(analysis.maxLength || 0, value.length);
        }
        
        // Handle arrays
        if (Array.isArray(value)) {
          value.forEach(item => {
            const itemType = this.inferDatabaseType(item);
            analysis.arrayElementTypes!.add(itemType);
          });
        }
        
        // Handle nested objects
        if (type === DatabaseType.NESTED_OBJECT && typeof value === 'object') {
          analysis.nested = true;
          if (!analysis.nestedFields) {
            analysis.nestedFields = new Map();
          }
          this.analyzeDocument(value, analysis.nestedFields, '', depth + 1);
        }
      }
    });
  }
  
  private inferDatabaseType(value: any): DatabaseType {
    if (value === null || value === undefined) {
      return DatabaseType.UNKNOWN;
    }
    
    if (typeof value === 'string') {
      // Check for special string formats
      if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        return DatabaseType.TIMESTAMP;
      }
      if (value.match(/^https?:\/\//)) {
        return DatabaseType.URL;
      }
      if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        return DatabaseType.UUID;
      }
      return DatabaseType.TEXT;
    }
    
    if (typeof value === 'number') {
      return Number.isInteger(value) ? DatabaseType.INTEGER : DatabaseType.FLOAT;
    }
    
    if (typeof value === 'boolean') {
      return DatabaseType.BOOLEAN;
    }
    
    if (Array.isArray(value)) {
      return DatabaseType.ARRAY;
    }
    
    if (value instanceof Date) {
      return DatabaseType.TIMESTAMP;
    }
    
    if (typeof value === 'object') {
      // Check for special Firebase types
      if (value._latitude !== undefined && value._longitude !== undefined) {
        return DatabaseType.GEOPOINT;
      }
      if (value._path || value.path) {
        return DatabaseType.REFERENCE;
      }
      return DatabaseType.NESTED_OBJECT;
    }
    
    return DatabaseType.UNKNOWN;
  }
  
  private determinePrimaryType(types: DatabaseType[], samples: any[]): DatabaseType {
    if (types.length === 1) {
      return types[0];
    }
    
    // Count occurrences of each type
    const typeCounts = new Map<DatabaseType, number>();
    samples.forEach(sample => {
      const type = this.inferDatabaseType(sample);
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });
    
    // Return the most common type
    let maxCount = 0;
    let primaryType = DatabaseType.UNKNOWN;
    
    typeCounts.forEach((count, type) => {
      if (count > maxCount) {
        maxCount = count;
        primaryType = type;
      }
    });
    
    return primaryType;
  }
  
  private convertNestedFieldsToDefinitions(
    nestedFields: Map<string, any>, 
    totalDocs: number
  ): DocumentFieldDefinition[] {
    const fields: DocumentFieldDefinition[] = [];
    
    nestedFields.forEach((analysis, fieldName) => {
      const prevalence = analysis.prevalence / totalDocs;
      
      if (prevalence >= this.config.minFieldPrevalence) {
        const types = Array.from(analysis.types);
        const primaryType = this.determinePrimaryType(types, analysis.samples);
        
        fields.push({
          name: fieldName,
          type: primaryType,
          nullable: analysis.nullable,
          prevalence,
          isOptional: prevalence < 1.0,
          sampleValues: analysis.samples.slice(0, 3),
          originalType: types.join(' | ')
        });
      }
    });
    
    return fields;
  }
}

/**
 * Abstract base class for document/NoSQL database connectors
 */
export abstract class DocumentBaseConnector implements IConnector<DocumentConnectorConfig> {
  readonly type: string = 'document';
  readonly version: string = '1.0.0';
  readonly capabilities: string[] = [
    'read',
    'write',
    'real_time',
    'schema_sampling',
    'nested_queries',
    'aggregation',
    'transactions',
    'subcollections'
  ];
  readonly supportedOperations: string[] = [
    'introspectSchema',
    'sampleSchema',
    'getCollectionData',
    'insertDocument',
    'updateDocument',
    'deleteDocument',
    'subscribeToChanges',
    'executeAggregation'
  ];
  
  protected config!: DocumentConnectorConfig;
  protected _isConnected = false;
  protected credentials: any = null;
  protected credentialsService = DataConnectorCredentialsService.getInstance();
  protected events?: ConnectionEvents;
  protected fieldAnalyzer!: DocumentFieldAnalyzer;
  protected realTimeSubscriptions = new Map<string, RealTimeSubscription>();
  protected schemaCache = new Map<string, SchemaSamplingResult>();
  
  /**
   * Connection management
   */
  async connect(config: DocumentConnectorConfig, events?: ConnectionEvents): Promise<void> {
    this.config = config;
    this.events = events;
    
    try {
      // Initialize field analyzer
      this.fieldAnalyzer = new DocumentFieldAnalyzer(config.schemaSampling);
      
      // Retrieve credentials
      this.credentials = await this.credentialsService.getCredentials(config.credentialsSecretId, 'connector-system');
      
      // Initialize connection to document database
      await this.initializeConnection();
      
      // Validate connection
      const validation = await this.validateConnection(config);
      if (!validation.isValid) {
        throw new ConnectionError(
          `Failed to connect to document database: ${validation.error?.message}`,
          { originalError: validation.error }
        );
      }
      
      this._isConnected = true;
      
      if (this.events?.onConnect) {
        await this.events.onConnect();
      }
    } catch (error) {
      this._isConnected = false;
      const connectorError = error instanceof ConnectorError ? error : new ConnectionError('Connection failed', { originalError: error as Error });
      
      if (this.events?.onError) {
        await this.events.onError(connectorError);
      }
      
      throw connectorError;
    }
  }
  
  async disconnect(): Promise<void> {
    // Clean up real-time subscriptions
    const subscriptions = Array.from(this.realTimeSubscriptions.values());
    for (const subscription of subscriptions) {
      await this.unsubscribeFromChanges(subscription.id);
    }
    this.realTimeSubscriptions.clear();
    
    // Clear schema cache
    this.schemaCache.clear();
    
    this._isConnected = false;
    this.credentials = null;
    
    if (this.events?.onDisconnect) {
      await this.events.onDisconnect();
    }
  }
  
  isConnected(): boolean {
    return this._isConnected;
  }
  
  async getConnectionStatus(): Promise<ConnectionValidationResult> {
    if (!this.isConnected) {
      return {
        isValid: false,
        error: new ConnectionError('Not connected')
      };
    }
    
    return this.validateConnection(this.config);
  }
  
  /**
   * Schema introspection and sampling
   */
  async introspectSchema(options?: IntrospectionOptions): Promise<DatabaseSchema> {
    if (!this.isConnected) {
      throw new ConnectionError('Not connected to database');
    }
    
    try {
      const collections = await this.listCollections(options?.includeTables);
      const schema: DatabaseSchema = {
        name: this.config.databaseId,
        tables: [],
        views: [],
        functions: [],
        procedures: [],
        triggers: [],
        sequences: [],
        metadata: {
          type: 'document',
          collections: [],
          materializationStrategy: this.config.schemaSampling.enabled ? 'sample' : 'manual',
          lastMaterialized: new Date(),
          sampleDocumentCount: 0
        }
      };
      
      for (const collectionName of collections) {
        const collectionDef = await this.getCollectionDefinition(collectionName);
        (schema.metadata as any).collections.push(collectionDef);
        (schema.metadata as any).sampleDocumentCount = ((schema.metadata as any).sampleDocumentCount || 0) + (collectionDef.sampleSize || 0);
      }
      
      return schema;
    } catch (error) {
      throw error instanceof ConnectorError ? error : new SchemaError('Schema introspection failed', { originalError: error as Error });
    }
  }
  
  async sampleCollectionSchema(collectionName: string): Promise<SchemaSamplingResult> {
    if (!this.isConnected) {
      throw new ConnectionError('Not connected to database');
    }
    
    // Check cache first
    if (this.config.schemaSampling.cacheSchema && this.schemaCache.has(collectionName)) {
      const cached = this.schemaCache.get(collectionName)!;
      const age = Date.now() - cached.samplingDate.getTime();
      if (age < this.config.schemaSampling.refreshIntervalMs) {
        return cached;
      }
    }
    
    try {
      const documents = await this.sampleDocuments(collectionName, this.config.schemaSampling.sampleSize);
      const fields = this.fieldAnalyzer.analyzeDocuments(documents);
      
      const result: SchemaSamplingResult = {
        collection: collectionName,
        sampleSize: this.config.schemaSampling.sampleSize,
        sampledDocuments: documents.length,
        fields,
        nestedCollections: await this.getSubcollections(collectionName),
        samplingDate: new Date(),
        confidence: documents.length / this.config.schemaSampling.sampleSize,
        inconsistencies: this.detectTypeInconsistencies(fields)
      };
      
      // Cache the result
      if (this.config.schemaSampling.cacheSchema) {
        this.schemaCache.set(collectionName, result);
      }
      
      return result;
    } catch (error) {
      throw error instanceof ConnectorError ? error : new SchemaError('Schema sampling failed', { originalError: error as Error });
    }
  }
  
  private detectTypeInconsistencies(fields: DocumentFieldDefinition[]): Array<{
    field: string;
    types: DatabaseType[];
    prevalence: Record<DatabaseType, number>;
  }> {
    const inconsistencies: Array<{
      field: string;
      types: DatabaseType[];
      prevalence: Record<DatabaseType, number>;
    }> = [];
    
    fields.forEach(field => {
      if (field.metadata?.types && Array.isArray(field.metadata.types) && field.metadata.types.length > 1) {
        inconsistencies.push({
          field: field.fieldPath || field.name,
          types: field.metadata.types as DatabaseType[],
          prevalence: {} as Record<DatabaseType, number> // Would need to track this during analysis
        });
      }
    });
    
    return inconsistencies;
  }
  
  /**
   * Real-time operations
   */
  async subscribeToChanges(
    collectionName: string,
    callback: (change: DocumentChange) => void,
    options?: {
      query?: any;
      errorCallback?: (error: Error) => void;
    }
  ): Promise<string> {
    if (!this.config.realTime?.enabled) {
      throw new ValidationError('Real-time updates are not enabled');
    }
    
    const subscriptionId = `${collectionName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: RealTimeSubscription = {
      id: subscriptionId,
      collection: collectionName,
      query: options?.query,
      callback,
      errorCallback: options?.errorCallback,
      active: true,
      createdAt: new Date()
    };
    
    this.realTimeSubscriptions.set(subscriptionId, subscription);
    
    try {
      await this.setupRealTimeListener(subscription);
      return subscriptionId;
    } catch (error) {
      this.realTimeSubscriptions.delete(subscriptionId);
      throw error instanceof ConnectorError ? error : new ValidationError('Failed to setup real-time subscription', { originalError: error as Error });
    }
  }
  
  async unsubscribeFromChanges(subscriptionId: string): Promise<void> {
    const subscription = this.realTimeSubscriptions.get(subscriptionId);
    if (!subscription) {
      return; // Already unsubscribed
    }
    
    subscription.active = false;
    this.realTimeSubscriptions.delete(subscriptionId);
    
    await this.teardownRealTimeListener(subscription);
  }
  
  /**
   * Enhanced validation with document-specific features
   */
  async validateDocumentData(
    collectionName: string,
    data: Record<string, any>,
    operation: 'insert' | 'update' = 'insert'
  ): Promise<{ valid: boolean; errors: any[] | null; validatedData?: any }> {
    try {
      const collectionDef = await this.getCollectionDefinition(collectionName);
      const config = this.config.typeConversion || DEFAULT_TYPE_CONVERSION_CONFIG;
      
      return TypeConversionUtils.validateDocumentData(collectionDef, data, operation, config);
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: `Validation failed: ${(error as Error).message}` }]
      };
    }
  }
  
  /**
   * Abstract methods that must be implemented by concrete document connectors
   */
  abstract initializeConnection(): Promise<void>;
  abstract validateConnection(config: DocumentConnectorConfig): Promise<ConnectionValidationResult>;
  abstract validateConfiguration(config: DocumentConnectorConfig): Promise<{ valid: boolean; errors: string[] }>;
  abstract listCollections(includeCollections?: string[]): Promise<string[]>;
  abstract getCollectionDefinition(collectionName: string): Promise<CollectionDefinition>;
  abstract sampleDocuments(collectionName: string, sampleSize: number): Promise<any[]>;
  abstract getSubcollections(collectionName: string): Promise<string[]>;
  abstract setupRealTimeListener(subscription: RealTimeSubscription): Promise<void>;
  abstract teardownRealTimeListener(subscription: RealTimeSubscription): Promise<void>;
  
  /**
   * Default implementations for IConnector interface
   */
  async testQuery(query: string, context?: QueryContext): Promise<QueryResult> {
    try {
      // For document databases, treat query as collection name
      const documents = await this.sampleDocuments(query, 1);
      
      return {
        success: true,
        data: documents,
        totalCount: documents.length,
        executionTimeMs: 0 // Would need to track this properly
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof ConnectorError ? error : new QueryError('Test query failed', 'TEST_QUERY_ERROR', { originalError: error as Error })
      };
    }
  }
  
  // Abstract methods that concrete implementations must provide
  abstract listTables(schemaName?: string): Promise<string[]>;
  abstract listSchemas(): Promise<string[]>;
  abstract getTableDefinition(tableName: string, schemaName?: string): Promise<any>;
  abstract getTableColumns(tableName: string, schemaName?: string): Promise<any[]>;
  abstract getTablePrimaryKey(tableName: string, schemaName?: string): Promise<string[]>;
  abstract getTableForeignKeys(tableName: string, schemaName?: string): Promise<any[]>;
  abstract getTableIndexes(tableName: string, schemaName?: string): Promise<any[]>;
  abstract compareSchemas(source: any, target: any): Promise<SchemaComparison>;
  abstract generateSchemaDiff(comparison: SchemaComparison): Promise<string[]>;
  abstract getTableData<T = any>(tableName: string, options?: DataOperationOptions): Promise<QueryResult<T>>;
  abstract insertRecord<T = any>(tableName: string, data: Record<string, any>, options?: any): Promise<QueryResult<T>>;
  abstract insertRecords<T = any>(tableName: string, data: Record<string, any>[], options?: BulkOperationOptions): Promise<QueryResult<T>>;
  abstract updateRecord<T = any>(tableName: string, id: any, data: Record<string, any>, options?: any): Promise<QueryResult<T>>;
  abstract updateRecords<T = any>(tableName: string, criteria: Record<string, any>, data: Record<string, any>, options?: any): Promise<QueryResult<T>>;
  abstract deleteRecord(tableName: string, id: any, options?: any): Promise<QueryResult>;
  abstract deleteRecords(tableName: string, criteria: Record<string, any>, options?: any): Promise<QueryResult>;
  abstract executeQuery<T = any>(query: string, parameters?: any[], context?: QueryContext): Promise<QueryResult<T>>;
  abstract executeTransaction<T = any>(operations: Array<{ query: string; parameters?: any[] }>, context?: QueryContext): Promise<QueryResult<T>>;
  abstract upsertRecord<T = any>(tableName: string, data: Record<string, any>, conflictColumns: string[], options?: any): Promise<QueryResult<T>>;
  abstract bulkUpsert<T = any>(tableName: string, data: Record<string, any>[], conflictColumns: string[], options?: BulkOperationOptions): Promise<QueryResult<T>>;
  abstract countRecords(tableName: string, criteria?: Record<string, any>, options?: any): Promise<QueryResult<{ count: number }>>;
  abstract buildSelectQuery(tableName: string, options?: any): string;
  abstract buildInsertQuery(tableName: string, data: Record<string, any> | Record<string, any>[], options?: any): { query: string; parameters: any[] };
  abstract buildUpdateQuery(tableName: string, data: Record<string, any>, criteria: Record<string, any>, options?: any): { query: string; parameters: any[] };
  abstract buildDeleteQuery(tableName: string, criteria: Record<string, any>): { query: string; parameters: any[] };
  abstract getQueryExecutionPlan(query: string, parameters?: any[]): Promise<any>;
  abstract getConnectionMetrics(): Promise<any>;
}
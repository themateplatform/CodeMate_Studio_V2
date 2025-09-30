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
  RESTSchema,
  RESTResourceDefinition,
  RESTFieldDefinition,
  DatabaseType,
  SchemaComparison
} from '../types/schema';
import {
  ConnectorError,
  ConnectionError,
  ConnectionTimeoutError,
  AuthenticationError,
  QueryError,
  RateLimitError,
  ValidationError,
  ConnectorErrorUtils
} from '../types/errors';
import { TypeConversionUtils, TypeConversionConfig, DEFAULT_TYPE_CONVERSION_CONFIG } from '../utils/typeConversion';
import { DataConnectorCredentialsService } from '../../dataConnectorCredentialsService';

/**
 * REST-specific connector configuration
 */
export interface RESTConnectorConfig extends ConnectorConfig {
  // API configuration
  baseUrl: string;
  apiVersion?: string;
  
  // Authentication configuration
  authentication: {
    type: 'api_key' | 'oauth2' | 'bearer' | 'basic' | 'custom';
    location?: 'header' | 'query' | 'body';
    paramName?: string;
    headerPrefix?: string; // e.g., 'Bearer ', 'Token '
    
    // OAuth2 specific
    scopes?: string[];
    authUrl?: string;
    tokenUrl?: string;
    refreshUrl?: string;
    
    // Custom auth function
    customAuthFunction?: (credentials: any) => Record<string, string>;
  };
  
  // Rate limiting configuration
  rateLimiting?: {
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
    burstLimit?: number;
    backoffStrategy: 'linear' | 'exponential' | 'fibonacci';
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    jitter: boolean;
  };
  
  // Request configuration
  requestConfig?: {
    timeout: number;
    maxRetries: number;
    retryableStatusCodes: number[];
    contentType: string;
    userAgent?: string;
    customHeaders?: Record<string, string>;
  };
  
  // Pagination configuration
  pagination?: {
    defaultStrategy: 'offset' | 'cursor' | 'page' | 'token';
    defaultLimit: number;
    maxLimit: number;
    paramNames: {
      limit?: string;
      offset?: string;
      cursor?: string;
      page?: string;
      pageSize?: string;
      nextToken?: string;
    };
  };
  
  // Response transformation
  responseTransform?: {
    dataPath?: string; // JSONPath to extract data array
    metaPath?: string; // JSONPath to extract metadata
    errorPath?: string; // JSONPath to extract error information
    totalCountPath?: string; // JSONPath to extract total count
    nextCursorPath?: string; // JSONPath to extract next cursor
  };
  
  // Type conversion configuration
  typeConversion?: TypeConversionConfig;
}

/**
 * HTTP request context for REST operations
 */
export interface RESTRequestContext extends QueryContext {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, any>;
  retryCount?: number;
  rateLimitAttempt?: number;
}

/**
 * Pagination state for REST API requests
 */
export interface PaginationState {
  hasMore: boolean;
  nextCursor?: string;
  nextOffset?: number;
  nextPage?: number;
  nextToken?: string;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
}

/**
 * Rate limiter implementation for REST APIs
 */
export class RESTRateLimiter {
  private requestTimestamps: number[] = [];
  private config: RESTConnectorConfig['rateLimiting'];
  
  constructor(config: RESTConnectorConfig['rateLimiting']) {
    this.config = config || {
      requestsPerSecond: 10,
      backoffStrategy: 'exponential',
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      jitter: true
    };
  }
  
  async waitForRateLimit(): Promise<void> {
    if (!this.config) return;
    
    const now = Date.now();
    const secondAgo = now - 1000;
    const minuteAgo = now - 60000;
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;
    
    // Clean old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > dayAgo);
    
    // Check rate limits
    const recentRequests = {
      second: this.requestTimestamps.filter(ts => ts > secondAgo).length,
      minute: this.requestTimestamps.filter(ts => ts > minuteAgo).length,
      hour: this.requestTimestamps.filter(ts => ts > hourAgo).length,
      day: this.requestTimestamps.length
    };
    
    let waitTime = 0;
    
    if (this.config.requestsPerSecond && recentRequests.second >= this.config.requestsPerSecond) {
      waitTime = Math.max(waitTime, 1000 - (now - Math.max(...this.requestTimestamps.filter(ts => ts > secondAgo))));
    }
    
    if (this.config.requestsPerMinute && recentRequests.minute >= this.config.requestsPerMinute) {
      waitTime = Math.max(waitTime, 60000 - (now - Math.max(...this.requestTimestamps.filter(ts => ts > minuteAgo))));
    }
    
    if (this.config.requestsPerHour && recentRequests.hour >= this.config.requestsPerHour) {
      waitTime = Math.max(waitTime, 3600000 - (now - Math.max(...this.requestTimestamps.filter(ts => ts > hourAgo))));
    }
    
    if (this.config.requestsPerDay && recentRequests.day >= this.config.requestsPerDay) {
      waitTime = Math.max(waitTime, 86400000 - (now - Math.max(...this.requestTimestamps)));
    }
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requestTimestamps.push(Date.now());
  }
  
  calculateBackoffDelay(attempt: number): number {
    if (!this.config) return 1000;
    
    let delay: number;
    
    switch (this.config.backoffStrategy) {
      case 'linear':
        delay = this.config.initialDelayMs * attempt;
        break;
      case 'fibonacci':
        delay = this.config.initialDelayMs * this.fibonacci(attempt);
        break;
      case 'exponential':
      default:
        delay = this.config.initialDelayMs * Math.pow(2, attempt - 1);
        break;
    }
    
    // Apply jitter if enabled
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.min(delay, this.config.maxDelayMs);
  }
  
  private fibonacci(n: number): number {
    if (n <= 1) return 1;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }
}

/**
 * Abstract base class for REST API connectors
 */
export abstract class RESTBaseConnector implements IConnector<RESTConnectorConfig> {
  readonly type: string = 'rest';
  readonly version: string = '1.0.0';
  readonly capabilities: string[] = [
    'read',
    'write',
    'pagination',
    'filtering', 
    'sorting',
    'rate_limiting',
    'authentication'
  ];
  readonly supportedOperations: string[] = [
    'introspectSchema',
    'getResourceData',
    'insertRecord',
    'updateRecord',
    'deleteRecord',
    'executeRequest'
  ];
  
  protected config!: RESTConnectorConfig;
  protected _isConnected = false;
  protected credentials: any = null;
  protected rateLimiter!: RESTRateLimiter;
  protected credentialsService = DataConnectorCredentialsService.getInstance();
  protected events?: ConnectionEvents;
  
  /**
   * Connection management
   */
  async connect(config: RESTConnectorConfig, events?: ConnectionEvents): Promise<void> {
    this.config = config;
    this.events = events;
    
    try {
      // Initialize rate limiter
      this.rateLimiter = new RESTRateLimiter(config.rateLimiting);
      
      // Retrieve credentials
      this.credentials = await this.credentialsService.getCredentials(config.credentialsSecretId);
      
      // Validate connection
      const validation = await this.validateConnection(config);
      if (!validation.isValid) {
        throw new ConnectionError(
          `Failed to connect to REST API: ${validation.error?.message}`,
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
   * Abstract methods that must be implemented by concrete REST connectors
   */
  abstract validateConnection(config: RESTConnectorConfig): Promise<ConnectionValidationResult>;
  abstract validateConfiguration(config: RESTConnectorConfig): Promise<{ valid: boolean; errors: string[] }>;
  abstract introspectSchema(options?: IntrospectionOptions): Promise<DatabaseSchema>;
  abstract listResources(): Promise<string[]>;
  abstract getResourceDefinition(resourceName: string): Promise<RESTResourceDefinition>;
  
  /**
   * HTTP request utilities
   */
  protected async makeRequest<T = any>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      data?: any;
      queryParams?: Record<string, any>;
      headers?: Record<string, string>;
      context?: RESTRequestContext;
    } = {}
  ): Promise<{ data: T; headers: Record<string, string>; status: number }> {
    const {
      method = 'GET',
      data,
      queryParams = {},
      headers = {},
      context
    } = options;
    
    // Wait for rate limiting
    await this.rateLimiter.waitForRateLimit();
    
    // Build URL
    const url = new URL(endpoint, this.config.baseUrl);
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    
    // Prepare headers
    const requestHeaders = {
      'Content-Type': this.config.requestConfig?.contentType || 'application/json',
      'User-Agent': this.config.requestConfig?.userAgent || 'CodeVibe-Connector/1.0',
      ...this.config.requestConfig?.customHeaders,
      ...this.buildAuthHeaders(),
      ...headers
    };
    
    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: context?.timeoutMs 
        ? AbortSignal.timeout(context.timeoutMs)
        : this.config.requestConfig?.timeout 
          ? AbortSignal.timeout(this.config.requestConfig.timeout)
          : undefined
    };
    
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestOptions.body = typeof data === 'string' ? data : JSON.stringify(data);
    }
    
    try {
      const startTime = Date.now();
      const response = await fetch(url.toString(), requestOptions);
      const executionTime = Date.now() - startTime;
      
      // Log query execution
      if (this.events?.onQuery) {
        await this.events.onQuery(`${method} ${url.toString()}`, executionTime);
      }
      
      // Handle HTTP errors
      if (!response.ok) {
        await this.handleHttpError(response, context);
      }
      
      // Parse response
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      let responseData: T;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text() as T;
      }
      
      // Transform response if configured
      if (this.config.responseTransform?.dataPath) {
        responseData = this.extractFromJsonPath(responseData, this.config.responseTransform.dataPath);
      }
      
      return {
        data: responseData,
        headers: responseHeaders,
        status: response.status
      };
      
    } catch (error) {
      // Handle specific error types
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ConnectionTimeoutError(
          context?.timeoutMs || this.config.requestConfig?.timeout || 30000,
          { originalError: error }
        );
      }
      
      throw error instanceof ConnectorError ? error : new ConnectionError('HTTP request failed', { originalError: error as Error });
    }
  }
  
  /**
   * Authentication helpers
   */
  protected buildAuthHeaders(): Record<string, string> {
    if (!this.credentials) return {};
    
    const auth = this.config.authentication;
    const headers: Record<string, string> = {};
    
    switch (auth.type) {
      case 'api_key':
        if (auth.location === 'header') {
          const headerName = auth.paramName || 'X-API-Key';
          const prefix = auth.headerPrefix || '';
          headers[headerName] = `${prefix}${this.credentials.apiKey || this.credentials.key}`;
        }
        break;
        
      case 'bearer':
        headers['Authorization'] = `Bearer ${this.credentials.token || this.credentials.accessToken}`;
        break;
        
      case 'basic':
        const credentials = Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
        break;
        
      case 'custom':
        if (auth.customAuthFunction) {
          Object.assign(headers, auth.customAuthFunction(this.credentials));
        }
        break;
    }
    
    return headers;
  }
  
  /**
   * Error handling
   */
  protected async handleHttpError(response: Response, context?: RESTRequestContext): Promise<never> {
    const status = response.status;
    const statusText = response.statusText;
    
    let errorMessage = `HTTP ${status}: ${statusText}`;
    let errorData: any = null;
    
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        errorData = await response.json();
        
        // Extract error message using configured path
        if (this.config.responseTransform?.errorPath && errorData) {
          const extractedError = this.extractFromJsonPath(errorData, this.config.responseTransform.errorPath);
          if (extractedError) {
            errorMessage = `${errorMessage}: ${extractedError}`;
          }
        }
      } else {
        const textData = await response.text();
        if (textData) {
          errorMessage = `${errorMessage}: ${textData}`;
        }
      }
    } catch {
      // Ignore response parsing errors
    }
    
    // Map HTTP status codes to appropriate error types
    switch (status) {
      case 401:
        throw new AuthenticationError(errorMessage, { 
          metadata: { status, errorData },
          retryable: false 
        });
        
      case 403:
        throw new AuthenticationError('Access forbidden', { 
          metadata: { status, errorData },
          retryable: false 
        });
        
      case 404:
        throw new QueryError('Resource not found', 'RESOURCE_NOT_FOUND', { 
          metadata: { status, errorData },
          retryable: false 
        });
        
      case 429:
        const retryAfter = response.headers.get('Retry-After');
        throw new QueryError(
          'Rate limit exceeded',
          'RATE_LIMIT_ERROR',
          { 
            metadata: { status, errorData, retryAfter },
            retryable: true
          }
        );
        
      case 500:
      case 502:
      case 503:
      case 504:
        throw new ConnectionError(errorMessage, { 
          metadata: { status, errorData }
        });
        
      default:
        throw new QueryError(errorMessage, 'HTTP_ERROR', { 
          metadata: { status, errorData }
        });
    }
  }
  
  /**
   * Pagination utilities
   */
  protected buildPaginationParams(options?: PaginationOptions): Record<string, any> {
    if (!options || !this.config.pagination) return {};
    
    const params: Record<string, any> = {};
    const paramNames = this.config.pagination.paramNames;
    
    if (options.limit) {
      const limitParam = paramNames.limit || 'limit';
      params[limitParam] = Math.min(options.limit, this.config.pagination.maxLimit);
    }
    
    if (options.offset !== undefined) {
      const offsetParam = paramNames.offset || 'offset';
      params[offsetParam] = options.offset;
    }
    
    if (options.cursor) {
      const cursorParam = paramNames.cursor || 'cursor';
      params[cursorParam] = options.cursor;
    }
    
    return params;
  }
  
  protected extractPaginationState(response: any, headers: Record<string, string>): PaginationState {
    const state: PaginationState = { hasMore: false };
    
    if (!this.config.responseTransform) return state;
    
    // Extract next cursor
    if (this.config.responseTransform.nextCursorPath) {
      state.nextCursor = this.extractFromJsonPath(response, this.config.responseTransform.nextCursorPath);
      state.hasMore = !!state.nextCursor;
    }
    
    // Extract total count
    if (this.config.responseTransform.totalCountPath) {
      state.totalCount = this.extractFromJsonPath(response, this.config.responseTransform.totalCountPath);
    }
    
    return state;
  }
  
  /**
   * Utility methods
   */
  protected extractFromJsonPath(data: any, path: string): any {
    const parts = path.split('.');
    let current = data;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  /**
   * Default implementations for IConnector interface
   */
  async testQuery(query: string, context?: QueryContext): Promise<QueryResult> {
    try {
      const response = await this.makeRequest(query, {
        method: 'GET',
        context: context as RESTRequestContext
      });
      
      return {
        success: true,
        data: [response.data],
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
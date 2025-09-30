/**
 * Base connector error class that all connector errors should extend
 */
export abstract class ConnectorError extends Error {
  public readonly code: string;
  public readonly originalError?: Error;
  public readonly metadata?: Record<string, any>;
  public readonly retryable: boolean;
  public readonly statusCode: number;

  constructor(
    message: string,
    code: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
      retryable?: boolean;
      statusCode?: number;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.originalError = options.originalError;
    this.metadata = options.metadata;
    this.retryable = options.retryable ?? false;
    this.statusCode = options.statusCode ?? 500;

    // Maintain proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to a JSON-serializable object
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      stack: this.stack,
      retryable: this.retryable,
      statusCode: this.statusCode,
      metadata: this.metadata,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack,
      } : undefined,
    };
  }
}

/**
 * Connection-related errors
 */
export class ConnectionError extends ConnectorError {
  constructor(
    message: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
      retryable?: boolean;
    } = {}
  ) {
    super(message, 'CONNECTION_ERROR', {
      ...options,
      statusCode: 503,
      retryable: options.retryable ?? true,
    });
  }
}

export class ConnectionTimeoutError extends ConnectionError {
  constructor(
    timeoutMs: number,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(`Connection timed out after ${timeoutMs}ms`, {
      ...options,
      metadata: { timeoutMs, ...options.metadata },
      retryable: true,
    });
  }
}

export class ConnectionRefusedError extends ConnectionError {
  constructor(
    host: string,
    port: number,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(`Connection refused to ${host}:${port}`, {
      ...options,
      metadata: { host, port, ...options.metadata },
      retryable: true,
    });
  }
}

export class ConnectionPoolExhaustedError extends ConnectionError {
  constructor(
    maxConnections: number,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(`Connection pool exhausted (max: ${maxConnections})`, {
      ...options,
      metadata: { maxConnections, ...options.metadata },
      retryable: true,
    });
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthenticationError extends ConnectorError {
  constructor(
    message: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(message, 'AUTHENTICATION_ERROR', {
      ...options,
      statusCode: 401,
      retryable: false,
    });
  }
}

export class CredentialsInvalidError extends AuthenticationError {
  constructor(
    credentialType: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(`Invalid ${credentialType} credentials`, {
      ...options,
      metadata: { credentialType, ...options.metadata },
    });
  }
}

export class PermissionDeniedError extends ConnectorError {
  constructor(
    operation: string,
    resource?: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    const resourceMsg = resource ? ` on ${resource}` : '';
    super(`Permission denied for operation: ${operation}${resourceMsg}`, 'PERMISSION_DENIED', {
      ...options,
      statusCode: 403,
      retryable: false,
      metadata: { operation, resource, ...options.metadata },
    });
  }
}

/**
 * Configuration and validation errors
 */
export class ConfigurationError extends ConnectorError {
  constructor(
    message: string,
    field?: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(message, 'CONFIGURATION_ERROR', {
      ...options,
      statusCode: 400,
      retryable: false,
      metadata: { field, ...options.metadata },
    });
  }
}

export class ValidationError extends ConnectorError {
  constructor(
    message: string,
    field?: string,
    value?: any,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(message, 'VALIDATION_ERROR', {
      ...options,
      statusCode: 400,
      retryable: false,
      metadata: { field, value, ...options.metadata },
    });
  }
}

/**
 * Schema and query-related errors
 */
export class SchemaError extends ConnectorError {
  constructor(
    message: string,
    schemaName?: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(message, 'SCHEMA_ERROR', {
      ...options,
      statusCode: 400,
      retryable: false,
      metadata: { schemaName, ...options.metadata },
    });
  }
}

export class TableNotFoundError extends SchemaError {
  constructor(
    tableName: string,
    schemaName?: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    const fullName = schemaName ? `${schemaName}.${tableName}` : tableName;
    super(`Table not found: ${fullName}`, schemaName, {
      ...options,
      metadata: { tableName, schemaName, ...options.metadata },
    });
  }
}

export class ColumnNotFoundError extends SchemaError {
  constructor(
    columnName: string,
    tableName: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(`Column not found: ${columnName} in table ${tableName}`, undefined, {
      ...options,
      metadata: { columnName, tableName, ...options.metadata },
    });
  }
}

export class QueryError extends ConnectorError {
  constructor(
    message: string,
    query?: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
      retryable?: boolean;
    } = {}
  ) {
    super(message, 'QUERY_ERROR', {
      ...options,
      statusCode: 400,
      retryable: false,
      metadata: { query, ...options.metadata },
    });
  }
}

export class QueryTimeoutError extends QueryError {
  constructor(
    timeoutMs: number,
    query?: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(`Query timed out after ${timeoutMs}ms`, query, {
      ...options,
      metadata: { timeoutMs, query, ...options.metadata },
      retryable: true,
    });
  }
}

export class QuerySyntaxError extends QueryError {
  constructor(
    syntaxError: string,
    query?: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(`Query syntax error: ${syntaxError}`, query, {
      ...options,
      metadata: { syntaxError, query, ...options.metadata },
    });
  }
}

/**
 * Data operation errors
 */
export class DataError extends ConnectorError {
  constructor(
    message: string,
    operation: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
      retryable?: boolean;
    } = {}
  ) {
    super(message, 'DATA_ERROR', {
      ...options,
      statusCode: 400,
      retryable: options.retryable ?? false,
      metadata: { operation, ...options.metadata },
    });
  }
}

export class ConstraintViolationError extends DataError {
  constructor(
    constraintName: string,
    constraintType: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(`Constraint violation: ${constraintName} (${constraintType})`, 'constraint_violation', {
      ...options,
      metadata: { constraintName, constraintType, ...options.metadata },
    });
  }
}

export class DuplicateKeyError extends DataError {
  constructor(
    keyName: string,
    value: any,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(`Duplicate key violation: ${keyName}`, 'duplicate_key', {
      ...options,
      metadata: { keyName, value, ...options.metadata },
    });
  }
}

export class ForeignKeyViolationError extends DataError {
  constructor(
    constraintName: string,
    referencedTable: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(`Foreign key violation: ${constraintName} references ${referencedTable}`, 'foreign_key_violation', {
      ...options,
      metadata: { constraintName, referencedTable, ...options.metadata },
    });
  }
}

/**
 * Feature and capability errors
 */
export class FeatureNotSupportedError extends ConnectorError {
  constructor(
    feature: string,
    connectorType: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(`Feature not supported: ${feature} in ${connectorType} connector`, 'FEATURE_NOT_SUPPORTED', {
      ...options,
      statusCode: 501,
      retryable: false,
      metadata: { feature, connectorType, ...options.metadata },
    });
  }
}

export class OperationNotSupportedError extends ConnectorError {
  constructor(
    operation: string,
    reason?: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    const reasonMsg = reason ? `: ${reason}` : '';
    super(`Operation not supported: ${operation}${reasonMsg}`, 'OPERATION_NOT_SUPPORTED', {
      ...options,
      statusCode: 501,
      retryable: false,
      metadata: { operation, reason, ...options.metadata },
    });
  }
}

/**
 * Rate limiting and throttling errors
 */
export class RateLimitError extends ConnectorError {
  constructor(
    limitType: string,
    retryAfterMs?: number,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    const retryMsg = retryAfterMs ? ` Retry after ${retryAfterMs}ms` : '';
    super(`Rate limit exceeded: ${limitType}.${retryMsg}`, 'RATE_LIMIT_EXCEEDED', {
      ...options,
      statusCode: 429,
      retryable: true,
      metadata: { limitType, retryAfterMs, ...options.metadata },
    });
  }
}

/**
 * Generic system errors
 */
export class InternalConnectorError extends ConnectorError {
  constructor(
    message: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(message, 'INTERNAL_ERROR', {
      ...options,
      statusCode: 500,
      retryable: true,
    });
  }
}

export class ConnectorNotFoundError extends ConnectorError {
  constructor(
    connectorType: string,
    options: {
      originalError?: Error;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(`Connector not found: ${connectorType}`, 'CONNECTOR_NOT_FOUND', {
      ...options,
      statusCode: 404,
      retryable: false,
      metadata: { connectorType, ...options.metadata },
    });
  }
}

/**
 * Error utility functions
 */
export class ConnectorErrorUtils {
  /**
   * Wrap a native database error in appropriate connector error
   */
  static wrapDatabaseError(error: Error, context?: { query?: string; table?: string; operation?: string }): ConnectorError {
    const message = error.message.toLowerCase();
    
    // Connection errors
    if (message.includes('connection refused') || message.includes('econnrefused')) {
      return new ConnectionRefusedError('localhost', 5432, { originalError: error });
    }
    
    if (message.includes('timeout') || message.includes('timed out')) {
      if (context?.query) {
        return new QueryTimeoutError(30000, context.query, { originalError: error });
      }
      return new ConnectionTimeoutError(30000, { originalError: error });
    }
    
    if (message.includes('too many connections') || message.includes('pool exhausted')) {
      return new ConnectionPoolExhaustedError(10, { originalError: error });
    }
    
    // Authentication errors
    if (message.includes('authentication') || message.includes('password') || message.includes('login')) {
      return new AuthenticationError('Authentication failed', { originalError: error });
    }
    
    if (message.includes('permission denied') || message.includes('access denied')) {
      return new PermissionDeniedError(context?.operation || 'unknown', context?.table, { originalError: error });
    }
    
    // Schema errors
    if (message.includes('table') && (message.includes('not found') || message.includes('does not exist'))) {
      return new TableNotFoundError(context?.table || 'unknown', undefined, { originalError: error });
    }
    
    if (message.includes('column') && (message.includes('not found') || message.includes('does not exist'))) {
      return new ColumnNotFoundError('unknown', context?.table || 'unknown', { originalError: error });
    }
    
    // Data errors
    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      return new DuplicateKeyError('unknown', undefined, { originalError: error });
    }
    
    if (message.includes('foreign key') || message.includes('violates foreign key constraint')) {
      return new ForeignKeyViolationError('unknown', 'unknown', { originalError: error });
    }
    
    if (message.includes('syntax error') || message.includes('sql syntax')) {
      return new QuerySyntaxError(error.message, context?.query, { originalError: error });
    }
    
    // Default to internal error
    return new InternalConnectorError(`Database error: ${error.message}`, { originalError: error });
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(error: Error): boolean {
    if (error instanceof ConnectorError) {
      return error.retryable;
    }
    
    // Check common retryable patterns in native errors
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('connection refused') ||
      message.includes('network') ||
      message.includes('pool exhausted') ||
      message.includes('rate limit')
    );
  }

  /**
   * Get HTTP status code from error
   */
  static getStatusCode(error: Error): number {
    if (error instanceof ConnectorError) {
      return error.statusCode;
    }
    return 500;
  }

  /**
   * Create a formatted error response for API endpoints
   */
  static formatErrorResponse(error: Error) {
    if (error instanceof ConnectorError) {
      return {
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          retryable: error.retryable,
          metadata: error.metadata,
        },
        statusCode: error.statusCode,
      };
    }
    
    return {
      error: {
        name: 'InternalError',
        message: error.message,
        code: 'INTERNAL_ERROR',
        retryable: false,
      },
      statusCode: 500,
    };
  }
}

/**
 * Error code constants for easy reference
 */
export const ErrorCodes = {
  // Connection
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  CONNECTION_POOL_EXHAUSTED: 'CONNECTION_POOL_EXHAUSTED',
  
  // Authentication
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  CREDENTIALS_INVALID: 'CREDENTIALS_INVALID',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Configuration
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Schema
  SCHEMA_ERROR: 'SCHEMA_ERROR',
  TABLE_NOT_FOUND: 'TABLE_NOT_FOUND',
  COLUMN_NOT_FOUND: 'COLUMN_NOT_FOUND',
  
  // Query
  QUERY_ERROR: 'QUERY_ERROR',
  QUERY_TIMEOUT: 'QUERY_TIMEOUT',
  QUERY_SYNTAX_ERROR: 'QUERY_SYNTAX_ERROR',
  
  // Data
  DATA_ERROR: 'DATA_ERROR',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  FOREIGN_KEY_VIOLATION: 'FOREIGN_KEY_VIOLATION',
  
  // Features
  FEATURE_NOT_SUPPORTED: 'FEATURE_NOT_SUPPORTED',
  OPERATION_NOT_SUPPORTED: 'OPERATION_NOT_SUPPORTED',
  
  // System
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONNECTOR_NOT_FOUND: 'CONNECTOR_NOT_FOUND',
} as const;
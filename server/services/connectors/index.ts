/**
 * Phase 2: Connector SDK Architecture
 * 
 * This module provides a comprehensive connector SDK for integrating with various data sources.
 * It includes core interfaces, abstract base classes, type systems, error handling, and
 * a registry system for dynamic connector loading.
 * 
 * Key Components:
 * - IConnector interface: Standard operations for all connectors
 * - SQLBaseConnector: Abstract base class for SQL databases
 * - ConnectorRegistry: Factory and plugin system for dynamic loading
 * - Schema type system: TypeScript interfaces for database schemas
 * - Error handling: Comprehensive error types and utilities
 * - Integration helpers: Connect with existing CodeVibe services
 */

// Import types and instances needed for local use
import type {
  ConnectorConfig,
  QueryResult,
  QueryContext,
  DataOperationOptions
} from './interfaces/IConnector';
import type {
  DatabaseSchema,
  TableDefinition,
  ColumnDefinition
} from './types/schema';
import type {
  ConnectorRegistry,
  ConnectorRegistryConfig,
  ConnectorMetadata,
  PluginLoadResult
} from './registry/ConnectorRegistry';
import type { SQLConnectorConfig } from './sql/SQLBaseConnector';
// Import the singleton instance for local use
import { connectorRegistry } from './registry/ConnectorRegistry';

// Core interfaces and types
export {
  IConnector,
  IConnectorFactory,
  IConnectorPlugin,
  IConnectionPool,
  ITransaction,
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
  isConnector,
  isConnectorFactory,
  isConnectorPlugin
} from './interfaces/IConnector';

// Schema type system
export {
  DatabaseSchema,
  TableDefinition,
  ColumnDefinition,
  IndexDefinition,
  ConstraintDefinition,
  ViewDefinition,
  FunctionDefinition,
  ProcedureDefinition,
  TriggerDefinition,
  SequenceDefinition,
  SchemaComparison,
  DatabaseType,
  ConstraintType,
  ReferenceAction,
  IndexType,
  DatabaseTypeSchema,
  ConstraintTypeSchema,
  ReferenceActionSchema,
  IndexTypeSchema,
  ColumnDefinitionSchema,
  TableDefinitionSchema,
  DatabaseSchemaSchema,
  DatabaseSchemaType,
  TableDefinitionType,
  ColumnDefinitionType
} from './types/schema';

// Error handling system
export {
  ConnectorError,
  ConnectionError,
  ConnectionTimeoutError,
  ConnectionRefusedError,
  ConnectionPoolExhaustedError,
  AuthenticationError,
  CredentialsInvalidError,
  PermissionDeniedError,
  ConfigurationError,
  ValidationError,
  SchemaError,
  TableNotFoundError,
  ColumnNotFoundError,
  QueryError,
  QueryTimeoutError,
  QuerySyntaxError,
  DataError,
  ConstraintViolationError,
  DuplicateKeyError,
  ForeignKeyViolationError,
  FeatureNotSupportedError,
  OperationNotSupportedError,
  RateLimitError,
  InternalConnectorError,
  ConnectorNotFoundError,
  ConnectorErrorUtils,
  ErrorCodes
} from './types/errors';

// SQL base connector
export {
  SQLBaseConnector,
  SQLConnectorConfig,
  SQLConnectionPool,
  SQLTransaction
} from './sql/SQLBaseConnector';

// Registry system
export {
  ConnectorRegistry,
  ConnectorRegistryConfig,
  ConnectorMetadata,
  PluginLoadResult,
  RegistryEvents,
  ConnectorRegistryUtils,
  connectorRegistry
} from './registry/ConnectorRegistry';

// Utility functions
export { TypeConversionUtils } from './utils/typeConversion';
export { ConnectorIntegrationHelpers } from './utils/integrationHelpers';

/**
 * Version information
 */
export const SDK_VERSION = '2.0.0';
export const SDK_NAME = 'CodeVibe Connector SDK';

/**
 * Default configuration for the connector SDK
 */
export const DEFAULT_SDK_CONFIG = {
  registry: {
    enableLogging: true,
    enableMetrics: true,
    autoDiscovery: false,
    defaultTimeout: 30000,
    maxConnectors: 100
  },
  connection: {
    defaultPoolSize: 10,
    connectionTimeout: 30000,
    queryTimeout: 60000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  introspection: {
    includeViews: true,
    includeIndexes: true,
    includeConstraints: true,
    includeFunctions: false,
    includeProcedures: false,
    includeTriggers: false,
    includeSequences: false
  }
};

/**
 * Initialize the connector SDK with default configuration
 */
export async function initializeConnectorSDK(config?: {
  enableLogging?: boolean;
  autoRegisterBuiltins?: boolean;
  registryConfig?: Partial<ConnectorRegistryConfig>;
}): Promise<{
  registry: ConnectorRegistry;
  availableConnectors: string[];
  version: string;
}> {
  const { ConnectorIntegrationHelpers } = await import('./utils/integrationHelpers');
  
  try {
    // Initialize the registry
    await ConnectorIntegrationHelpers.initializeConnectorRegistry();
    
    const availableConnectors = connectorRegistry.getAvailableConnectors();
    
    if (config?.enableLogging !== false) {
      console.log(`CodeVibe Connector SDK v${SDK_VERSION} initialized`);
      console.log(`Available connectors: ${availableConnectors.length > 0 ? availableConnectors.join(', ') : 'None'}`);
    }
    
    return {
      registry: connectorRegistry,
      availableConnectors,
      version: SDK_VERSION
    };
  } catch (error) {
    console.error('Failed to initialize Connector SDK:', error);
    throw error;
  }
}

/**
 * Quick start utilities for common operations
 */
export class ConnectorSDKQuickStart {
  /**
   * Create and test a database connection
   */
  static async createAndTestConnection(
    connectionData: {
      type: string;
      name: string;
      host?: string;
      port?: number;
      database?: string;
      organizationId: string;
      userId: string;
    },
    credentials: Record<string, any>
  ) {
    const { ConnectorIntegrationHelpers } = await import('./utils/integrationHelpers');
    
    return await ConnectorIntegrationHelpers.createDataConnectionWithConnector(
      connectionData,
      credentials,
      connectionData.userId,
      { requestId: `quickstart-${Date.now()}` }
    );
  }
  
  /**
   * Introspect schema for existing connection
   */
  static async introspectSchema(connectionId: string, userId: string) {
    const { ConnectorIntegrationHelpers } = await import('./utils/integrationHelpers');
    
    return await ConnectorIntegrationHelpers.introspectAndSaveSchema(connectionId, userId);
  }
  
  /**
   * Get available connector types
   */
  static async getAvailableConnectors() {
    const { ConnectorIntegrationHelpers } = await import('./utils/integrationHelpers');
    
    return ConnectorIntegrationHelpers.getAvailableConnectorTypes();
  }
  
  /**
   * Validate connector configuration
   */
  static async validateConfiguration(type: string, config: any) {
    const { ConnectorIntegrationHelpers } = await import('./utils/integrationHelpers');
    
    return await ConnectorIntegrationHelpers.validateConnectorConfiguration(type, config);
  }
}

/**
 * Export commonly used instances and utilities
 */
export {
  // Singleton instances
  connectorRegistry as defaultConnectorRegistry
};

/**
 * Type definitions for external consumption
 */
export type {
  // Configuration types
  ConnectorConfig as IConnectorConfig,
  SQLConnectorConfig as ISQLConnectorConfig,
  ConnectorRegistryConfig as IConnectorRegistryConfig,
  
  // Data operation types
  QueryResult as IQueryResult,
  QueryContext as IQueryContext,
  DataOperationOptions as IDataOperationOptions,
  
  // Schema types
  DatabaseSchema as IDatabaseSchema,
  TableDefinition as ITableDefinition,
  ColumnDefinition as IColumnDefinition,
  
  // Registry types
  ConnectorMetadata as IConnectorMetadata,
  PluginLoadResult as IPluginLoadResult
};
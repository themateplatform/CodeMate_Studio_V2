import { DataConnectorCredentialsService } from '../../dataConnectorCredentialsService';
import { storage } from '../../../storage';
import { connectorRegistry, ConnectorRegistry } from '../registry/ConnectorRegistry';
import { IConnector, ConnectorConfig } from '../interfaces/IConnector';
import { DatabaseSchema, TableDefinition } from '../types/schema';
import { ConnectorError, ValidationError } from '../types/errors';
import { 
  type DataConnection,
  type InsertDataConnection,
  type SchemaSnapshot,
  type InsertSchemaSnapshot
} from '@shared/schema';

/**
 * Integration helpers for connecting the connector SDK with existing CodeVibe services
 */
export class ConnectorIntegrationHelpers {
  private static credentialsService = DataConnectorCredentialsService.getInstance();
  
  /**
   * Create a data connection with connector integration
   */
  static async createDataConnectionWithConnector(
    connectionData: Omit<InsertDataConnection, 'credentialsSecretId'>,
    credentials: Record<string, any>,
    createdBy: string,
    context: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<{
    success: boolean;
    connection?: DataConnection;
    connector?: IConnector;
    error?: string;
  }> {
    try {
      // Create the data connection with credentials
      const connectionResult = await this.credentialsService.createDataConnectionWithCredentials(
        connectionData,
        credentials,
        createdBy,
        context
      );
      
      if (!connectionResult.success || !connectionResult.connection) {
        return {
          success: false,
          error: connectionResult.error
        };
      }
      
      // Create connector instance
      const connectorConfig: ConnectorConfig = {
        type: connectionData.type,
        name: connectionData.name,
        host: connectionData.host || undefined,
        port: connectionData.port || undefined,
        database: connectionData.database || undefined,
        credentialsSecretId: connectionResult.connection.credentialsSecretId,
        poolConfig: connectionData.poolConfig as any,
        sslConfig: connectionData.sslConfig as any,
        options: connectionData.connectionConfig as any,
        metadata: connectionData.metadata as any
      };
      
      // Check if connector type is available
      if (!connectorRegistry.hasConnector(connectionData.type)) {
        return {
          success: false,
          error: `Connector type '${connectionData.type}' is not registered. Available types: ${connectorRegistry.getAvailableConnectors().join(', ')}`
        };
      }
      
      const connector = await connectorRegistry.createConnector(connectionData.type, connectorConfig);
      
      // Test the connection
      await connector.connect(connectorConfig);
      const validation = await connector.validateConnection(connectorConfig);
      
      if (!validation.isValid) {
        await connector.cleanup();
        return {
          success: false,
          error: validation.error?.message || 'Connection validation failed'
        };
      }
      
      return {
        success: true,
        connection: connectionResult.connection,
        connector
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get connector for existing data connection
   */
  static async getConnectorForDataConnection(
    connectionId: string
  ): Promise<{
    success: boolean;
    connector?: IConnector;
    connection?: DataConnection;
    error?: string;
  }> {
    try {
      // Get connection details
      const connection = await storage.getDataConnection(connectionId);
      if (!connection) {
        return {
          success: false,
          error: 'Data connection not found'
        };
      }
      
      // Create connector config
      const connectorConfig: ConnectorConfig = {
        type: connection.type,
        name: connection.name,
        host: connection.host || undefined,
        port: connection.port || undefined,
        database: connection.database || undefined,
        credentialsSecretId: connection.credentialsSecretId,
        poolConfig: connection.poolConfig as any,
        sslConfig: connection.sslConfig as any,
        options: connection.connectionConfig as any,
        metadata: connection.metadata as any
      };
      
      // Create and connect
      const connector = await connectorRegistry.createConnector(connection.type, connectorConfig);
      await connector.connect(connectorConfig);
      
      return {
        success: true,
        connector,
        connection
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Introspect and save schema snapshot
   */
  static async introspectAndSaveSchema(
    connectionId: string,
    userId: string
  ): Promise<{
    success: boolean;
    schema?: DatabaseSchema;
    snapshot?: SchemaSnapshot;
    error?: string;
  }> {
    try {
      const connectorResult = await this.getConnectorForDataConnection(connectionId);
      
      if (!connectorResult.success || !connectorResult.connector) {
        return {
          success: false,
          error: connectorResult.error
        };
      }
      
      const { connector, connection } = connectorResult;
      
      // Introspect schema
      const schema = await connector.introspectSchema({
        includeViews: true,
        includeIndexes: true,
        includeConstraints: true
      });
      
      // Create schema snapshot
      const snapshotData: InsertSchemaSnapshot = {
        connectionId,
        version: this.generateSchemaVersion(schema),
        snapshotType: 'full',
        triggerType: 'manual',
        triggeredBy: userId,
        schemaData: JSON.stringify(schema),
        tableCount: schema.tables.length,
        viewCount: schema.views.length
      };
      
      const snapshot = await storage.createSchemaSnapshot(snapshotData);
      
      // Update connection with last introspection info
      await storage.updateDataConnection(connectionId, {
        lastSyncAt: new Date(),
        status: 'active'
      });
      
      // Cleanup connector
      await connector.disconnect();
      await connector.cleanup();
      
      return {
        success: true,
        schema,
        snapshot
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test data connection and update status
   */
  static async testDataConnectionAndUpdateStatus(
    connectionId: string,
    testedBy: string,
    context: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<{
    success: boolean;
    testResult?: any;
    error?: string;
  }> {
    try {
      const connectorResult = await this.getConnectorForDataConnection(connectionId);
      
      if (!connectorResult.success || !connectorResult.connector) {
        // Update connection status to error
        await storage.updateDataConnection(connectionId, {
          status: 'error',
          lastTestAt: new Date(),
          lastErrorAt: new Date(),
          lastError: connectorResult.error || 'Failed to create connector'
        });
        
        return {
          success: false,
          error: connectorResult.error
        };
      }
      
      const { connector } = connectorResult;
      
      // Run health check
      const healthCheck = await connector.healthCheck();
      
      // Test with simple query
      const testQuery = 'SELECT 1 as test';
      const queryResult = await connector.testQuery(testQuery);
      
      const testResult = {
        healthy: healthCheck.healthy,
        queryTest: queryResult.success,
        latency: queryResult.executionTimeMs,
        serverInfo: healthCheck.status,
        timestamp: new Date().toISOString()
      };
      
      // Update connection status
      await storage.updateDataConnection(connectionId, {
        status: healthCheck.healthy && queryResult.success ? 'active' : 'error',
        lastTestAt: new Date(),
        lastTestResult: testResult,
        lastErrorAt: healthCheck.healthy && queryResult.success ? undefined : new Date(),
        lastError: healthCheck.healthy && queryResult.success ? undefined : (queryResult.error?.message || 'Test failed')
      });
      
      // Cleanup connector
      await connector.disconnect();
      await connector.cleanup();
      
      return {
        success: true,
        testResult
      };
    } catch (error) {
      // Update connection status to error
      await storage.updateDataConnection(connectionId, {
        status: 'error',
        lastTestAt: new Date(),
        lastErrorAt: new Date(),
        lastError: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * List available connector types with metadata
   */
  static getAvailableConnectorTypes(): Array<{
    type: string;
    name: string;
    version: string;
    description: string;
    capabilities: string[];
    configSchema: any;
    defaultConfig: any;
  }> {
    return connectorRegistry.getAllConnectorMetadata().map(metadata => ({
      type: metadata.type,
      name: metadata.name,
      version: metadata.version,
      description: metadata.description,
      capabilities: metadata.capabilities,
      configSchema: metadata.configSchema,
      defaultConfig: metadata.defaultConfig
    }));
  }
  
  /**
   * Validate connector configuration
   */
  static async validateConnectorConfiguration(
    type: string,
    config: any
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings?: string[];
  }> {
    try {
      if (!connectorRegistry.hasConnector(type)) {
        return {
          valid: false,
          errors: [`Unknown connector type: ${type}`]
        };
      }
      
      const validation = await connectorRegistry.validateConfig(type, config);
      
      return {
        valid: validation.valid,
        errors: validation.errors,
        warnings: []
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed']
      };
    }
  }
  
  /**
   * Generate unique schema version based on schema content
   */
  private static generateSchemaVersion(schema: DatabaseSchema): number {
    // Create a deterministic hash based on schema structure
    const content = JSON.stringify({
      tables: schema.tables.map(t => ({
        name: t.name,
        columns: t.columns.map(c => ({
          name: c.name,
          type: c.type,
          nullable: c.nullable
        }))
      }))
    });
    
    // Simple hash function - in production, use a proper hash like SHA-256
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash);
  }
  
  /**
   * Get connector registry status for monitoring
   */
  static getConnectorRegistryStatus() {
    return connectorRegistry.getStatus();
  }
  
  /**
   * Cleanup inactive connectors (utility for maintenance)
   */
  static async cleanupInactiveConnectors(maxIdleTimeMs: number = 30 * 60 * 1000): Promise<number> {
    return await connectorRegistry.cleanupInactiveConnectors(maxIdleTimeMs);
  }
  
  /**
   * Initialize connector registry with built-in connectors
   */
  static async initializeConnectorRegistry(): Promise<void> {
    await connectorRegistry.initialize({
      onConnectorRegistered: (metadata) => {
        console.log(`Connector registered: ${metadata.type} v${metadata.version}`);
      },
      onConnectorError: (type, error) => {
        console.error(`Connector error for ${type}:`, error.message);
      },
      onConnectorCreated: (type, config) => {
        console.log(`Connector created: ${type} (${config.name})`);
      }
    });
  }
}
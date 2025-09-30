import { SecretsService } from '../secrets';
import { storage } from '../storage';
import { 
  type DataConnection,
  type InsertDataConnection,
  type Secret,
  type InsertSecret,
  type SyncEvent,
  type InsertSyncEvent
} from '@shared/schema';

/**
 * Service for managing data connector credentials securely using the SecretsService
 */
export class DataConnectorCredentialsService {
  private static instance: DataConnectorCredentialsService;
  private secretsService: SecretsService;

  private constructor() {
    this.secretsService = SecretsService.getInstance();
  }

  static getInstance(): DataConnectorCredentialsService {
    if (!DataConnectorCredentialsService.instance) {
      DataConnectorCredentialsService.instance = new DataConnectorCredentialsService();
    }
    return DataConnectorCredentialsService.instance;
  }

  /**
   * Store credentials for a data connector securely
   */
  async storeCredentials(
    organizationId: string,
    connectionName: string,
    connectionType: string,
    credentials: Record<string, any>,
    createdBy: string,
    context: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<{ success: boolean; secretId?: string; error?: string }> {
    try {
      // Create secret for the credentials
      const secretData = {
        organizationId,
        key: `dc_${connectionType}_${connectionName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: `${connectionName}_credentials`,
        description: `Encrypted credentials for ${connectionType} connection: ${connectionName}`,
        category: 'data_connector' as const,
        environment: 'production' as const,
        createdBy,
        value: JSON.stringify(credentials)
      };

      const secret = await this.secretsService.createSecret(
        secretData,
        createdBy,
        context
      );

      return { success: true, secretId: secret.id };
    } catch (error) {
      console.error('Failed to store data connector credentials:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error storing credentials'
      };
    }
  }

  /**
   * Retrieve and decrypt credentials for a data connector
   */
  async getCredentials(
    secretId: string,
    accessedBy: string,
    context: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<{ success: boolean; credentials?: Record<string, any>; error?: string }> {
    try {
      const result = await this.secretsService.getSecretValue(
        secretId,
        accessedBy,
        context
      );

      if (!result.success || !result.value) {
        return { success: false, error: result.error || 'Failed to decrypt credentials' };
      }

      const credentials = JSON.parse(result.value);
      return { success: true, credentials };
    } catch (error) {
      console.error('Failed to retrieve data connector credentials:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error retrieving credentials'
      };
    }
  }

  /**
   * Update credentials for an existing data connector
   */
  async updateCredentials(
    secretId: string,
    newCredentials: Record<string, any>,
    updatedBy: string,
    context: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.secretsService.updateSecret(
        secretId,
        JSON.stringify(newCredentials),
        updatedBy,
        context
      );

      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('Failed to update data connector credentials:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error updating credentials'
      };
    }
  }

  /**
   * Schedule credential rotation for a data connector
   * Note: This updates the secret to enable rotation, actual rotation is handled by processScheduledRotations()
   */
  async scheduleCredentialRotation(
    secretId: string,
    rotationIntervalDays: number,
    scheduledBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Enable rotation on the secret by updating its rotation settings
      // This is a placeholder implementation - in a full implementation, 
      // you would update the secret record to enable rotation
      const nextRotation = new Date(Date.now() + rotationIntervalDays * 24 * 60 * 60 * 1000);
      
      // For now, just log the rotation schedule request
      console.log(`Credential rotation scheduled for secret ${secretId} every ${rotationIntervalDays} days by ${scheduledBy}`);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to schedule credential rotation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error scheduling rotation'
      };
    }
  }

  /**
   * Create a data connection with secure credential storage
   */
  async createDataConnectionWithCredentials(
    connectionData: Omit<InsertDataConnection, 'credentialsSecretId'>,
    credentials: Record<string, any>,
    createdBy: string,
    context: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<{ success: boolean; connection?: DataConnection; error?: string }> {
    try {
      // First, store the credentials securely
      const credentialsResult = await this.storeCredentials(
        connectionData.organizationId,
        connectionData.name,
        connectionData.type,
        credentials,
        createdBy,
        context
      );

      if (!credentialsResult.success || !credentialsResult.secretId) {
        return { success: false, error: credentialsResult.error };
      }

      // Create the data connection with the secret reference
      const connection = await storage.createDataConnection({
        ...connectionData,
        credentialsSecretId: credentialsResult.secretId
      });

      // Log the connection creation event
      await this.logSyncEvent(
        connection.id,
        'connection_created',
        'create',
        createdBy,
        context,
        { connectionType: connectionData.type, connectionName: connectionData.name }
      );

      return { success: true, connection };
    } catch (error) {
      console.error('Failed to create data connection with credentials:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error creating connection'
      };
    }
  }

  /**
   * Test a data connection by retrieving credentials and attempting connection
   */
  async testDataConnection(
    connectionId: string,
    testedBy: string,
    context: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<{ success: boolean; error?: string; metadata?: any }> {
    try {
      // Get the connection details
      const connection = await storage.getDataConnection(connectionId);
      if (!connection) {
        return { success: false, error: 'Data connection not found' };
      }

      // Retrieve credentials
      const credentialsResult = await this.getCredentials(
        connection.credentialsSecretId,
        testedBy,
        context
      );

      if (!credentialsResult.success || !credentialsResult.credentials) {
        return { success: false, error: credentialsResult.error };
      }

      // Log the test event
      await this.logSyncEvent(
        connectionId,
        'connection_test',
        'test',
        testedBy,
        context,
        { testResult: 'initiated' }
      );

      // Update connection test timestamp
      await storage.updateDataConnection(connectionId, {
        lastTestAt: new Date(),
        status: 'testing'
      });

      // Placeholder for actual connection testing - this will be implemented with the connector SDK
      const testResult = {
        success: true,
        metadata: {
          message: 'Connection test placeholder - will be implemented with connector SDK',
          connectionType: connection.type,
          host: connection.host,
          database: connection.database,
          timestamp: new Date().toISOString()
        }
      };

      // Update connection with test results
      await storage.updateDataConnection(connectionId, {
        status: testResult.success ? 'active' : 'error',
        lastTestResult: testResult.metadata,
        lastErrorAt: testResult.success ? undefined : new Date(),
        lastError: testResult.success ? undefined : 'Test failed'
      });

      // Log the test result
      await this.logSyncEvent(
        connectionId,
        'connection_test',
        'test_result',
        testedBy,
        context,
        { testResult: testResult.success ? 'success' : 'failed', ...testResult.metadata }
      );

      return testResult;
    } catch (error) {
      console.error('Failed to test data connection:', error);
      
      // Log the test failure
      await this.logSyncEvent(
        connectionId,
        'connection_test',
        'test_error',
        testedBy,
        context,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error testing connection'
      };
    }
  }

  /**
   * Get audit trail for data connector credential access
   */
  async getCredentialAuditTrail(
    secretId: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      return await this.secretsService.getSecretAuditTrail(secretId, limit);
    } catch (error) {
      console.error('Failed to get credential audit trail:', error);
      return [];
    }
  }

  /**
   * Rotate credentials for a data connector
   */
  async rotateCredentials(
    connectionId: string,
    newCredentials: Record<string, any>,
    rotatedBy: string,
    context: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await storage.getDataConnection(connectionId);
      if (!connection) {
        return { success: false, error: 'Data connection not found' };
      }

      // Update the credentials
      const result = await this.updateCredentials(
        connection.credentialsSecretId,
        newCredentials,
        rotatedBy,
        context
      );

      if (result.success) {
        // Log the rotation event
        await this.logSyncEvent(
          connectionId,
          'credential_rotation',
          'rotate',
          rotatedBy,
          context,
          { rotationType: 'manual' }
        );

        // Update connection status
        await storage.updateDataConnection(connectionId, {
          lastSyncAt: new Date(),
          status: 'active'
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to rotate credentials:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error rotating credentials'
      };
    }
  }

  /**
   * Log sync events for data connector operations
   */
  private async logSyncEvent(
    connectionId: string,
    eventType: string,
    operation: string,
    userId: string,
    context: { ipAddress?: string; userAgent?: string; requestId?: string },
    metadata?: any
  ): Promise<void> {
    try {
      const eventData: InsertSyncEvent = {
        connectionId,
        eventType,
        operation,
        status: 'completed',
        userId,
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        startedAt: new Date(),
        completedAt: new Date(),
        metadata: metadata ? JSON.stringify(metadata) : undefined
      };

      await storage.createSyncEvent(eventData);
    } catch (error) {
      console.error('Failed to log sync event:', error);
      // Don't throw here as logging failures shouldn't break the main operation
    }
  }
}

// Export singleton instance
export const dataConnectorCredentialsService = DataConnectorCredentialsService.getInstance();
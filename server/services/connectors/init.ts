/**
 * Connector initialization and registration
 * Registers all built-in connectors with the ConnectorRegistry
 */

import { ConnectorRegistry, ConnectorRegistryUtils } from './registry/ConnectorRegistry';
import { PostgresConnectorFactory } from './sql/PostgresConnectorFactory';
import { SupabaseConnectorFactory } from './sql/SupabaseConnectorFactory';
import { DataConnectorCredentialsService } from '../dataConnectorCredentialsService';
import type { ConnectorMetadata } from './registry/ConnectorRegistry';

/**
 * Initialize and register all built-in connectors
 */
export async function initializeConnectors(): Promise<ConnectorRegistry> {
  // Get registry instance
  const registry = ConnectorRegistry.getInstance({
    enableLogging: true,
    enableMetrics: true,
    autoDiscovery: false,
    defaultTimeout: 60000,
    maxConnectors: 200,
  });

  // Initialize the registry
  await registry.initialize({
    onConnectorRegistered: async (metadata: ConnectorMetadata) => {
      console.log(`✅ Registered connector: ${metadata.name} v${metadata.version}`);
    },
    onConnectorError: async (type: string, error: Error) => {
      console.error(`❌ Connector error (${type}):`, error.message);
    },
    onConnectorCreated: async (type: string, config: any) => {
      console.log(`🔧 Created connector instance: ${type}`);
    },
  });

  // Get credentials service
  const credentialsService = DataConnectorCredentialsService.getInstance();

  // Register PostgreSQL connector
  const postgresFactory = new PostgresConnectorFactory(credentialsService);
  await registry.registerConnector(postgresFactory, {
    name: 'PostgreSQL Database',
    version: '1.0.0',
    description: 'Connect to PostgreSQL databases with full schema introspection and CRUD operations',
    author: 'CodeVibe',
    capabilities: [
      'read', 'write', 'schema_introspection', 'transactions',
      'bulk_operations', 'query_building', 'connection_pooling',
      'indexes', 'constraints', 'foreign_keys', 'sequences'
    ],
    dependencies: ['pg', '@types/pg'],
    metadata: {
      databaseType: 'postgres',
      supportsRealtime: false,
      supportsStreaming: false,
      maxConnections: 200,
      defaultPort: 5432,
      features: {
        jsonb: true,
        uuid: true,
        arrays: true,
        enums: true,
        fullTextSearch: true,
        partitioning: true,
        extensions: true,
      }
    }
  });

  // Register Supabase connector
  const supabaseFactory = new SupabaseConnectorFactory(credentialsService);
  await registry.registerConnector(supabaseFactory, {
    name: 'Supabase Database',
    version: '1.0.0',
    description: 'Connect to Supabase PostgreSQL databases with real-time features, RLS, and REST API support',
    author: 'CodeVibe',
    capabilities: [
      'read', 'write', 'schema_introspection', 'transactions',
      'bulk_operations', 'query_building', 'connection_pooling',
      'realtime', 'row_level_security', 'rest_api', 'auth'
    ],
    dependencies: ['@supabase/supabase-js', 'pg', '@types/pg'],
    metadata: {
      databaseType: 'supabase',
      supportsRealtime: true,
      supportsStreaming: false,
      maxConnections: 100, // Supabase has connection limits
      defaultPort: 5432,
      features: {
        jsonb: true,
        uuid: true,
        arrays: true,
        enums: true,
        realtimeSubscriptions: true,
        rowLevelSecurity: true,
        restApi: true,
        auth: true,
        storage: true,
        edgeFunctions: true,
      }
    }
  });

  console.log(`🚀 Connector registry initialized with ${registry.getAvailableConnectors().length} connectors`);
  
  // Log available connectors
  const connectors = registry.getAllConnectorMetadata();
  for (const connector of connectors) {
    console.log(`   - ${connector.name} (${connector.type}) - ${connector.capabilities.join(', ')}`);
  }

  return registry;
}

/**
 * Get connector registry instance (singleton)
 */
export function getConnectorRegistry(): ConnectorRegistry {
  return ConnectorRegistry.getInstance();
}

/**
 * Get supported connector types
 */
export function getSupportedConnectorTypes(): Array<{
  type: string;
  name: string;
  description: string;
  features: string[];
}> {
  const registry = getConnectorRegistry();
  const metadata = registry.getAllConnectorMetadata();
  
  return metadata.map(meta => ({
    type: meta.type,
    name: meta.name,
    description: meta.description,
    features: meta.capabilities
  }));
}

/**
 * Validate connector configuration before creation
 */
export async function validateConnectorConfig(
  type: string, 
  config: any, 
  credentials: any
): Promise<{ valid: boolean; errors?: string[]; warnings?: string[] }> {
  const registry = getConnectorRegistry();
  const factory = registry.getConnectorFactory(type);
  
  if (!factory) {
    return { valid: false, errors: [`Unknown connector type: ${type}`] };
  }

  try {
    // Validate configuration
    const configValidation = await registry.validateConfig(type, config);
    if (!configValidation.valid) {
      return configValidation;
    }

    // Validate credentials if factory supports it
    if ('validateCredentials' in factory && typeof factory.validateCredentials === 'function') {
      try {
        factory.validateCredentials(credentials);
      } catch (error) {
        return {
          valid: false,
          errors: [`Credentials validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        };
      }
    }

    // Test configuration if factory supports it
    if ('testConfig' in factory && typeof factory.testConfig === 'function') {
      return await factory.testConfig(config, credentials);
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      errors: [`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Get connector example configurations
 */
export function getConnectorExamples(type: string): Record<string, any> | undefined {
  const registry = getConnectorRegistry();
  const factory = registry.getConnectorFactory(type);
  
  if (!factory || !('getExampleConfigs' in factory)) {
    return undefined;
  }

  try {
    return (factory as any).getExampleConfigs();
  } catch {
    return undefined;
  }
}

/**
 * Get connector supported features
 */
export function getConnectorFeatures(type: string): Record<string, boolean> | undefined {
  const registry = getConnectorRegistry();
  const factory = registry.getConnectorFactory(type);
  
  if (!factory || !('getSupportedFeatures' in factory)) {
    return undefined;
  }

  try {
    return (factory as any).getSupportedFeatures();
  } catch {
    return undefined;
  }
}
import {
  IConnector,
  IConnectorFactory,
  IConnectorPlugin,
  ConnectorConfig,
  isConnectorFactory,
  isConnectorPlugin
} from '../interfaces/IConnector';
import {
  ConnectorError,
  ConnectorNotFoundError,
  ConfigurationError,
  ValidationError,
  InternalConnectorError
} from '../types/errors';

/**
 * Registry configuration options
 */
export interface ConnectorRegistryConfig {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  pluginPaths?: string[];
  autoDiscovery?: boolean;
  defaultTimeout?: number;
  maxConnectors?: number;
}

/**
 * Connector metadata for registry management
 */
export interface ConnectorMetadata {
  type: string;
  name: string;
  version: string;
  description: string;
  author: string;
  capabilities: string[];
  supportedVersions: string[];
  dependencies: string[];
  
  // Runtime information
  registeredAt: Date;
  lastUsed?: Date;
  usageCount: number;
  isActive: boolean;
  
  // Configuration schema
  configSchema: any;
  defaultConfig: any;
  
  // Plugin information
  pluginPath?: string;
  isPlugin: boolean;
  
  metadata?: Record<string, any>;
}

/**
 * Plugin loading result
 */
export interface PluginLoadResult {
  success: boolean;
  plugin?: IConnectorPlugin;
  error?: Error;
  metadata?: ConnectorMetadata;
}

/**
 * Registry events for monitoring and logging
 */
export interface RegistryEvents {
  onConnectorRegistered?: (metadata: ConnectorMetadata) => void | Promise<void>;
  onConnectorUnregistered?: (type: string) => void | Promise<void>;
  onConnectorCreated?: (type: string, config: ConnectorConfig) => void | Promise<void>;
  onConnectorError?: (type: string, error: ConnectorError) => void | Promise<void>;
  onPluginLoaded?: (plugin: IConnectorPlugin) => void | Promise<void>;
  onPluginUnloaded?: (pluginName: string) => void | Promise<void>;
}

/**
 * Central registry for managing connector types and instances
 */
export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  
  private factories = new Map<string, IConnectorFactory>();
  private plugins = new Map<string, IConnectorPlugin>();
  private metadata = new Map<string, ConnectorMetadata>();
  private activeConnectors = new Map<string, IConnector>();
  
  private config: ConnectorRegistryConfig;
  private events?: RegistryEvents;
  private isInitialized = false;
  
  // Metrics
  private metrics = {
    totalRegistered: 0,
    totalCreated: 0,
    totalErrors: 0,
    connectorsActive: 0,
    pluginsLoaded: 0,
    lastActivity: new Date()
  };
  
  private constructor(config: ConnectorRegistryConfig = {}) {
    this.config = {
      enableLogging: true,
      enableMetrics: true,
      autoDiscovery: false,
      defaultTimeout: 30000,
      maxConnectors: 100,
      ...config
    };
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(config?: ConnectorRegistryConfig): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry(config);
    }
    return ConnectorRegistry.instance;
  }
  
  /**
   * Initialize the registry
   */
  async initialize(events?: RegistryEvents): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    this.events = events;
    
    try {
      // Auto-discover built-in connectors if enabled
      if (this.config.autoDiscovery) {
        await this.discoverBuiltInConnectors();
      }
      
      // Load plugins from configured paths
      if (this.config.pluginPaths) {
        for (const pluginPath of this.config.pluginPaths) {
          await this.loadPluginsFromPath(pluginPath);
        }
      }
      
      this.isInitialized = true;
      
      if (this.config.enableLogging) {
        console.log(`ConnectorRegistry initialized with ${this.factories.size} connectors and ${this.plugins.size} plugins`);
      }
    } catch (error) {
      throw new InternalConnectorError(`Failed to initialize ConnectorRegistry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Register a connector factory
   */
  async registerConnector(factory: IConnectorFactory, metadata?: Partial<ConnectorMetadata>): Promise<void> {
    if (!isConnectorFactory(factory)) {
      throw new ValidationError('Invalid connector factory provided');
    }
    
    const type = factory.type;
    
    if (this.factories.has(type)) {
      throw new ValidationError(`Connector type '${type}' is already registered`);
    }
    
    // Create metadata
    const connectorMetadata: ConnectorMetadata = {
      type,
      name: metadata?.name || type,
      version: metadata?.version || '1.0.0',
      description: metadata?.description || `${type} connector`,
      author: metadata?.author || 'Unknown',
      capabilities: metadata?.capabilities || [],
      supportedVersions: factory.supportedVersions,
      dependencies: metadata?.dependencies || [],
      registeredAt: new Date(),
      usageCount: 0,
      isActive: true,
      configSchema: factory.getConfigSchema(),
      defaultConfig: factory.getDefaultConfig(),
      isPlugin: false,
      ...metadata
    };
    
    // Validate the factory
    const testConfig = factory.getDefaultConfig() as ConnectorConfig;
    try {
      // Try to validate the default config - if it throws, the factory is invalid
      if (typeof factory.validateConfig === 'function') {
        if (factory.validateConfig.constructor.name === 'AsyncFunction') {
          await factory.validateConfig(testConfig);
        } else {
          factory.validateConfig(testConfig);
        }
      }
    } catch (error) {
      throw new ValidationError(`Factory validation failed: ${error instanceof Error ? error.message : 'Unknown validation error'}`);
    }
    
    // Register the factory and metadata
    this.factories.set(type, factory);
    this.metadata.set(type, connectorMetadata);
    
    this.metrics.totalRegistered++;
    this.metrics.lastActivity = new Date();
    
    // Emit event
    if (this.events?.onConnectorRegistered) {
      await this.events.onConnectorRegistered(connectorMetadata);
    }
    
    if (this.config.enableLogging) {
      console.log(`Registered connector: ${type} (${connectorMetadata.version})`);
    }
  }
  
  /**
   * Unregister a connector
   */
  async unregisterConnector(type: string): Promise<void> {
    if (!this.factories.has(type)) {
      throw new ConnectorNotFoundError(type);
    }
    
    // Close any active connectors of this type
    const activeConnectors = Array.from(this.activeConnectors.entries())
      .filter(([id]) => id.startsWith(`${type}:`));
    
    for (const [id, connector] of activeConnectors) {
      try {
        await connector.disconnect();
        await connector.cleanup();
        this.activeConnectors.delete(id);
      } catch (error) {
        console.error(`Error cleaning up connector ${id}:`, error);
      }
    }
    
    // Remove from registry
    this.factories.delete(type);
    this.metadata.delete(type);
    
    // If it's a plugin, dispose of it
    if (this.plugins.has(type)) {
      const plugin = this.plugins.get(type)!;
      try {
        await plugin.dispose();
      } catch (error) {
        console.error(`Error disposing plugin ${type}:`, error);
      }
      this.plugins.delete(type);
    }
    
    // Emit event
    if (this.events?.onConnectorUnregistered) {
      await this.events.onConnectorUnregistered(type);
    }
    
    if (this.config.enableLogging) {
      console.log(`Unregistered connector: ${type}`);
    }
  }
  
  /**
   * Load and register a plugin
   */
  async loadPlugin(plugin: IConnectorPlugin): Promise<PluginLoadResult> {
    try {
      if (!isConnectorPlugin(plugin)) {
        return {
          success: false,
          error: new ValidationError('Invalid connector plugin provided')
        };
      }
      
      // Initialize the plugin
      await plugin.initialize();
      
      // Get the factory from the plugin
      const factory = plugin.getFactory();
      
      // Register the connector
      await this.registerConnector(factory, {
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        capabilities: plugin.capabilities,
        dependencies: plugin.dependencies,
        isPlugin: true
      });
      
      // Store the plugin reference
      this.plugins.set(plugin.type, plugin);
      
      this.metrics.pluginsLoaded++;
      
      // Emit event
      if (this.events?.onPluginLoaded) {
        await this.events.onPluginLoaded(plugin);
      }
      
      const metadata = this.metadata.get(plugin.type)!;
      
      return {
        success: true,
        plugin,
        metadata
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }
  
  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new ConnectorNotFoundError(pluginName);
    }
    
    // Unregister the connector
    await this.unregisterConnector(plugin.type);
    
    // Emit event
    if (this.events?.onPluginUnloaded) {
      await this.events.onPluginUnloaded(pluginName);
    }
  }
  
  /**
   * Create a connector instance
   */
  async createConnector<T extends ConnectorConfig = ConnectorConfig>(
    type: string,
    config: T
  ): Promise<IConnector<T>> {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new ConnectorNotFoundError(type);
    }
    
    const metadata = this.metadata.get(type)!;
    
    try {
      // Validate configuration
      const validation = await factory.validateConfig(config);
      if (!validation.valid) {
        throw new ValidationError(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Create the connector
      const connector = await factory.create(config);
      
      // Generate unique ID for tracking
      const connectorId = `${type}:${config.name || 'unnamed'}:${Date.now()}`;
      
      // Store active connector
      this.activeConnectors.set(connectorId, connector);
      
      // Update metrics and metadata
      this.metrics.totalCreated++;
      this.metrics.connectorsActive = this.activeConnectors.size;
      this.metrics.lastActivity = new Date();
      
      metadata.usageCount++;
      metadata.lastUsed = new Date();
      
      // Emit event
      if (this.events?.onConnectorCreated) {
        await this.events.onConnectorCreated(type, config);
      }
      
      if (this.config.enableLogging) {
        console.log(`Created connector: ${type} (${connectorId})`);
      }
      
      return connector;
    } catch (error) {
      this.metrics.totalErrors++;
      
      const connectorError = error instanceof ConnectorError 
        ? error 
        : new InternalConnectorError(`Failed to create connector: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Emit error event
      if (this.events?.onConnectorError) {
        await this.events.onConnectorError(type, connectorError);
      }
      
      throw connectorError;
    }
  }
  
  /**
   * Get available connector types
   */
  getAvailableConnectors(): string[] {
    return Array.from(this.factories.keys());
  }
  
  /**
   * Get connector metadata
   */
  getConnectorMetadata(type: string): ConnectorMetadata | undefined {
    return this.metadata.get(type);
  }
  
  /**
   * Get all connector metadata
   */
  getAllConnectorMetadata(): ConnectorMetadata[] {
    return Array.from(this.metadata.values());
  }
  
  /**
   * Check if a connector type is registered
   */
  hasConnector(type: string): boolean {
    return this.factories.has(type);
  }
  
  /**
   * Get connector factory
   */
  getConnectorFactory(type: string): IConnectorFactory | undefined {
    return this.factories.get(type);
  }
  
  /**
   * Get default configuration for a connector type
   */
  getDefaultConfig(type: string): any {
    const factory = this.factories.get(type);
    return factory ? factory.getDefaultConfig() : undefined;
  }
  
  /**
   * Get configuration schema for a connector type
   */
  getConfigSchema(type: string): any {
    const factory = this.factories.get(type);
    return factory ? factory.getConfigSchema() : undefined;
  }
  
  /**
   * Validate configuration for a connector type
   */
  async validateConfig(type: string, config: ConnectorConfig): Promise<{ valid: boolean; errors: string[] }> {
    const factory = this.factories.get(type);
    if (!factory) {
      return { valid: false, errors: [`Unknown connector type: ${type}`] };
    }
    
    return await factory.validateConfig(config);
  }
  
  /**
   * Get registry metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      connectorsActive: this.activeConnectors.size,
      connectorsRegistered: this.factories.size,
      pluginsLoaded: this.plugins.size
    };
  }
  
  /**
   * Get registry status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      connectorTypes: this.getAvailableConnectors().length,
      activeConnectors: this.activeConnectors.size,
      pluginsLoaded: this.plugins.size,
      metrics: this.getMetrics(),
      lastActivity: this.metrics.lastActivity
    };
  }
  
  /**
   * Clean up inactive connectors
   */
  async cleanupInactiveConnectors(maxIdleTimeMs: number = 30 * 60 * 1000): Promise<number> {
    const now = Date.now();
    const toCleanup: string[] = [];
    
    for (const [id, connector] of Array.from(this.activeConnectors)) {
      try {
        // Check if connector is still connected
        if (!connector.isConnected()) {
          toCleanup.push(id);
          continue;
        }
        
        // Check connection metrics for last activity
        const metrics = await connector.getConnectionMetrics();
        const idleTime = now - metrics.lastActivity.getTime();
        
        if (idleTime > maxIdleTimeMs) {
          toCleanup.push(id);
        }
      } catch (error) {
        // If we can't get metrics, assume it's inactive
        toCleanup.push(id);
      }
    }
    
    // Clean up inactive connectors
    for (const id of toCleanup) {
      const connector = this.activeConnectors.get(id);
      if (connector) {
        try {
          await connector.disconnect();
          await connector.cleanup();
        } catch (error) {
          console.error(`Error cleaning up connector ${id}:`, error);
        }
        this.activeConnectors.delete(id);
      }
    }
    
    this.metrics.connectorsActive = this.activeConnectors.size;
    
    if (this.config.enableLogging && toCleanup.length > 0) {
      console.log(`Cleaned up ${toCleanup.length} inactive connectors`);
    }
    
    return toCleanup.length;
  }
  
  /**
   * Shutdown the registry and clean up all resources
   */
  async shutdown(): Promise<void> {
    if (this.config.enableLogging) {
      console.log('Shutting down ConnectorRegistry...');
    }
    
    // Disconnect all active connectors
    const disconnectPromises = Array.from(this.activeConnectors.values()).map(async (connector) => {
      try {
        await connector.disconnect();
        await connector.cleanup();
      } catch (error) {
        console.error('Error disconnecting connector during shutdown:', error);
      }
    });
    
    await Promise.allSettled(disconnectPromises);
    
    // Dispose all plugins
    const disposePromises = Array.from(this.plugins.values()).map(async (plugin) => {
      try {
        await plugin.dispose();
      } catch (error) {
        console.error(`Error disposing plugin ${plugin.name} during shutdown:`, error);
      }
    });
    
    await Promise.allSettled(disposePromises);
    
    // Clear all registrations
    this.activeConnectors.clear();
    this.factories.clear();
    this.plugins.clear();
    this.metadata.clear();
    
    this.isInitialized = false;
    
    if (this.config.enableLogging) {
      console.log('ConnectorRegistry shutdown complete');
    }
  }
  
  /**
   * Discover built-in connectors (placeholder for auto-discovery)
   */
  private async discoverBuiltInConnectors(): Promise<void> {
    // This would discover and register built-in connectors
    // Implementation would scan for connector files in specific directories
    if (this.config.enableLogging) {
      console.log('Auto-discovery is not yet implemented');
    }
  }
  
  /**
   * Load plugins from a specific path (placeholder for plugin loading)
   */
  private async loadPluginsFromPath(pluginPath: string): Promise<void> {
    // This would load plugins from the specified path
    // Implementation would scan for plugin files and dynamically load them
    if (this.config.enableLogging) {
      console.log(`Plugin loading from path '${pluginPath}' is not yet implemented`);
    }
  }
}

/**
 * Convenience functions for registry management
 */
export class ConnectorRegistryUtils {
  /**
   * Create a registry with commonly used built-in connectors
   */
  static async createWithBuiltIns(config?: ConnectorRegistryConfig): Promise<ConnectorRegistry> {
    const registry = ConnectorRegistry.getInstance(config);
    
    await registry.initialize();
    
    // Register built-in connectors would go here
    // For now, this is a placeholder
    
    return registry;
  }
  
  /**
   * Register multiple connectors at once
   */
  static async registerConnectors(
    registry: ConnectorRegistry,
    connectors: Array<{
      factory: IConnectorFactory;
      metadata?: Partial<ConnectorMetadata>;
    }>
  ): Promise<void> {
    const registrationPromises = connectors.map(({ factory, metadata }) =>
      registry.registerConnector(factory, metadata)
    );
    
    await Promise.all(registrationPromises);
  }
  
  /**
   * Load multiple plugins at once
   */
  static async loadPlugins(
    registry: ConnectorRegistry,
    plugins: IConnectorPlugin[]
  ): Promise<PluginLoadResult[]> {
    const loadPromises = plugins.map(plugin => registry.loadPlugin(plugin));
    return await Promise.all(loadPromises);
  }
}

/**
 * Export singleton instance for convenience
 */
export const connectorRegistry = ConnectorRegistry.getInstance();
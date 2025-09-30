import { 
  type Deployment,
  type DeploymentRun,
  type DeploymentTarget,
  type DeploymentEnvVar,
  type PreviewMapping,
  type ProviderCredential,
  type InsertDeploymentRun,
  type InsertPreviewMapping
} from "@shared/schema";
import { storage } from "../storage";
import { SecretsService } from "../secrets";
import { FlyIoAdapter } from "./adapters/flyIoAdapter";
import { 
  type IDeploymentAdapter,
  type IDeploymentAdapterFactory,
  type DeploymentStatus,
  type DeploymentResult,
  type DeploymentEvent,
  type DeploymentEventType,
  type BuildConfig,
  type PreviewConfig,
  type EnvVarConfig,
  type ProviderConfig,
  type RollbackOptions
} from "./deploymentAdapter";
import type { WebSocket } from "ws";

/**
 * Configuration for the deployment orchestrator
 */
export interface DeploymentOrchestratorConfig {
  enableRealTimeUpdates?: boolean;
  maxConcurrentDeployments?: number;
  deploymentTimeout?: number; // seconds
  previewTeardownDelay?: number; // minutes
  enableMetrics?: boolean;
  enableLogging?: boolean;
}

/**
 * WebSocket client information for real-time updates
 */
interface WebSocketClient {
  socket: WebSocket;
  userId: string;
  projectId?: string;
  deploymentId?: string;
  subscriptions: Set<string>; // deployment IDs or channels
}

/**
 * Deployment orchestrator metrics
 */
interface DeploymentMetrics {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  activeDeployments: number;
  totalPreviewEnvironments: number;
  activePreviewEnvironments: number;
  averageDeployTime: number;
  lastActivity: Date;
}

/**
 * Adapter registry for managing deployment providers
 */
interface AdapterInfo {
  adapter: IDeploymentAdapter;
  isConfigured: boolean;
  lastHealthCheck: Date;
  isHealthy: boolean;
  credentials?: ProviderCredential;
}

/**
 * Deployment orchestrator service that coordinates all deployment providers
 * This is the central service that manages deployment lifecycle across all providers
 */
export class DeploymentOrchestratorService {
  private static instance: DeploymentOrchestratorService;
  
  private config: DeploymentOrchestratorConfig;
  private secretsService: SecretsService;
  private adapters: Map<string, AdapterInfo> = new Map();
  private adapterFactories: Map<string, IDeploymentAdapterFactory> = new Map();
  private activeDeployments: Map<string, DeploymentRun> = new Map();
  private webSocketClients: Map<string, WebSocketClient> = new Map();
  private isInitialized = false;

  // Metrics tracking
  private metrics: DeploymentMetrics = {
    totalDeployments: 0,
    successfulDeployments: 0,
    failedDeployments: 0,
    activeDeployments: 0,
    totalPreviewEnvironments: 0,
    activePreviewEnvironments: 0,
    averageDeployTime: 0,
    lastActivity: new Date()
  };

  private constructor(config: DeploymentOrchestratorConfig = {}) {
    this.config = {
      enableRealTimeUpdates: true,
      maxConcurrentDeployments: 10,
      deploymentTimeout: 1800, // 30 minutes
      previewTeardownDelay: 60, // 1 hour
      enableMetrics: true,
      enableLogging: true,
      ...config
    };
    
    this.secretsService = SecretsService.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: DeploymentOrchestratorConfig): DeploymentOrchestratorService {
    if (!DeploymentOrchestratorService.instance) {
      DeploymentOrchestratorService.instance = new DeploymentOrchestratorService(config);
    }
    return DeploymentOrchestratorService.instance;
  }

  /**
   * Initialize the orchestrator service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load active deployments from storage
      const activeRuns = await storage.getActiveDeploymentRuns();
      for (const run of activeRuns) {
        this.activeDeployments.set(run.id, run);
      }

      // Start background tasks
      this.startBackgroundTasks();

      this.isInitialized = true;

      if (this.config.enableLogging) {
        console.log('🚀 Deployment Orchestrator Service initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Deployment Orchestrator Service:', error);
      throw error;
    }
  }

  /**
   * Register a deployment adapter factory
   */
  registerAdapterFactory(providerId: string, factory: IDeploymentAdapterFactory): void {
    this.adapterFactories.set(providerId, factory);
    
    if (this.config.enableLogging) {
      console.log(`📦 Registered deployment adapter factory: ${providerId}`);
    }
  }

  /**
   * Configure a deployment provider with credentials
   */
  async configureProvider(
    organizationId: string,
    providerId: string,
    credentials: Record<string, any>,
    config?: ProviderConfig,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get or create adapter
      const adapter = await this.getOrCreateAdapter(providerId);
      if (!adapter) {
        return { success: false, error: `Provider ${providerId} not supported` };
      }

      // Store credentials securely
      const credentialResult = await this.storeProviderCredentials(
        organizationId,
        providerId,
        credentials,
        userId || 'system'
      );

      if (!credentialResult.success) {
        return { success: false, error: credentialResult.error };
      }

      // Configure adapter
      const configResult = await adapter.configure(credentials, config);
      if (!configResult.success) {
        return { success: false, error: configResult.error };
      }

      // Update adapter info
      const adapterInfo = this.adapters.get(providerId)!;
      adapterInfo.isConfigured = true;
      adapterInfo.isHealthy = true;
      adapterInfo.lastHealthCheck = new Date();

      if (this.config.enableLogging) {
        console.log(`✅ Provider ${providerId} configured successfully`);
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to configure provider ${providerId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Deploy to production environment
   */
  async deployProduction(
    deploymentId: string,
    targetId: string,
    buildConfig: BuildConfig,
    gitCommitSha?: string,
    userId?: string
  ): Promise<{ success: boolean; runId?: string; error?: string }> {
    try {
      const deployment = await storage.getDeployment(deploymentId);
      const target = await storage.getDeploymentTarget(targetId);

      if (!deployment || !target) {
        return { success: false, error: 'Deployment or target not found' };
      }

      // Get configured adapter
      const adapter = await this.getConfiguredAdapter(deployment.provider);
      if (!adapter) {
        return { success: false, error: `Provider ${deployment.provider} not configured` };
      }

      // Create deployment run
      const runData: InsertDeploymentRun = {
        deploymentId,
        targetId,
        type: 'production',
        status: 'queued',
        gitCommitSha,
        triggeredBy: userId || 'system',
        pullRequestNumber: null,
        buildConfig: buildConfig as any,
        startedAt: new Date()
      };

      const run = await storage.createDeploymentRun(runData);
      this.activeDeployments.set(run.id, run);

      // Start deployment
      this.executeDeployment(run, deployment, target, adapter, buildConfig);

      return { success: true, runId: run.id };
    } catch (error) {
      console.error('Failed to start production deployment:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Deploy preview environment for pull request
   */
  async deployPreview(
    deploymentId: string,
    pullRequestNumber: number,
    previewConfig: PreviewConfig,
    buildConfig: BuildConfig,
    gitCommitSha?: string,
    userId?: string
  ): Promise<{ success: boolean; runId?: string; previewUrl?: string; error?: string }> {
    try {
      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment) {
        return { success: false, error: 'Deployment not found' };
      }

      // Get configured adapter
      const adapter = await this.getConfiguredAdapter(deployment.provider);
      if (!adapter) {
        return { success: false, error: `Provider ${deployment.provider} not configured` };
      }

      // Check if preview mapping already exists
      let previewMapping = await storage.getPreviewMappingByPR(deploymentId, pullRequestNumber);
      
      // Create deployment run
      const runData: InsertDeploymentRun = {
        deploymentId,
        targetId: null, // Preview environments don't use targets
        type: 'preview',
        status: 'queued',
        gitCommitSha,
        triggeredBy: userId || 'system',
        pullRequestNumber,
        buildConfig: buildConfig as any,
        startedAt: new Date()
      };

      const run = await storage.createDeploymentRun(runData);
      this.activeDeployments.set(run.id, run);

      // Create or update preview mapping
      if (!previewMapping) {
        const mappingData: InsertPreviewMapping = {
          deploymentId,
          pullRequestNumber,
          branchName: `pr-${pullRequestNumber}`,
          isActive: true,
          autoTeardownEnabled: previewConfig.autoTeardown || true,
          teardownAt: previewConfig.autoTeardown ? 
            new Date(Date.now() + (previewConfig.teardownDelay || 60) * 60 * 1000) : null
        };
        previewMapping = await storage.createPreviewMapping(mappingData);
      }

      // Start preview deployment
      this.executePreviewDeployment(run, deployment, adapter, previewConfig, buildConfig, pullRequestNumber);

      return { success: true, runId: run.id };
    } catch (error) {
      console.error('Failed to start preview deployment:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Rollback deployment to previous version
   */
  async rollbackDeployment(
    deploymentId: string,
    targetId: string,
    options?: RollbackOptions,
    userId?: string
  ): Promise<{ success: boolean; rollbackRunId?: string; error?: string }> {
    try {
      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment) {
        return { success: false, error: 'Deployment not found' };
      }

      const adapter = await this.getConfiguredAdapter(deployment.provider);
      if (!adapter) {
        return { success: false, error: `Provider ${deployment.provider} not configured` };
      }

      // Get previous successful deployment
      const previousRuns = await storage.getDeploymentRunsByDeployment(deploymentId, { 
        status: 'success' 
      });
      
      if (previousRuns.length < 2) {
        return { success: false, error: 'No previous deployment found for rollback' };
      }

      const targetRun = options?.targetDeploymentId ? 
        previousRuns.find(r => r.id === options.targetDeploymentId) :
        previousRuns[1]; // Second most recent (first is current)

      if (!targetRun) {
        return { success: false, error: 'Target deployment for rollback not found' };
      }

      // Create rollback deployment run
      const runData: InsertDeploymentRun = {
        deploymentId,
        targetId,
        type: 'rollback',
        status: 'queued',
        gitCommitSha: targetRun.gitCommitSha,
        triggeredBy: userId || 'system',
        pullRequestNumber: null,
        buildConfig: targetRun.buildConfig,
        startedAt: new Date(),
        metadata: { rollbackFromId: targetRun.id }
      };

      const rollbackRun = await storage.createDeploymentRun(runData);
      
      // Execute rollback
      this.executeRollback(rollbackRun, deployment, adapter, targetRun.id, options);

      return { success: true, rollbackRunId: rollbackRun.id };
    } catch (error) {
      console.error('Failed to rollback deployment:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Teardown preview environment
   */
  async teardownPreview(deploymentId: string, pullRequestNumber: number): Promise<{ success: boolean; error?: string }> {
    try {
      const previewMapping = await storage.getPreviewMappingByPR(deploymentId, pullRequestNumber);
      if (!previewMapping || !previewMapping.isActive) {
        return { success: true }; // Already torn down
      }

      const deployment = await storage.getDeployment(deploymentId);
      if (!deployment) {
        return { success: false, error: 'Deployment not found' };
      }

      const adapter = await this.getConfiguredAdapter(deployment.provider);
      if (!adapter) {
        return { success: false, error: `Provider ${deployment.provider} not configured` };
      }

      // Teardown preview environment
      const result = await adapter.teardownPreview(previewMapping.previewUrl || `pr-${pullRequestNumber}`);
      
      if (result.success) {
        // Mark preview as inactive
        await storage.updatePreviewMapping(previewMapping.id, {
          isActive: false,
          teardownAt: new Date()
        });

        this.emitDeploymentEvent('preview_destroyed', deploymentId, {
          pullRequestNumber,
          teardownReason: 'manual'
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to teardown preview:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get deployment status with real-time information
   */
  async getDeploymentStatus(runId: string): Promise<{ 
    run?: DeploymentRun; 
    status?: DeploymentStatus; 
    url?: string; 
    error?: string 
  }> {
    try {
      const run = await storage.getDeploymentRun(runId);
      if (!run) {
        return { error: 'Deployment run not found' };
      }

      const deployment = await storage.getDeployment(run.deploymentId);
      if (!deployment) {
        return { error: 'Deployment not found' };
      }

      const adapter = await this.getConfiguredAdapter(deployment.provider);
      if (!adapter) {
        return { run, status: run.status as DeploymentStatus };
      }

      // Get real-time status from provider
      const providerStatus = await adapter.getStatus(run.providerRunId || run.id);
      
      return {
        run,
        status: providerStatus.status,
        url: providerStatus.url,
        error: providerStatus.error
      };
    } catch (error) {
      console.error('Failed to get deployment status:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Add WebSocket client for real-time updates
   */
  addWebSocketClient(clientId: string, socket: WebSocket, userId: string, projectId?: string): void {
    const client: WebSocketClient = {
      socket,
      userId,
      projectId,
      subscriptions: new Set()
    };

    this.webSocketClients.set(clientId, client);

    socket.on('close', () => {
      this.webSocketClients.delete(clientId);
    });

    if (this.config.enableLogging) {
      console.log(`🔌 WebSocket client connected: ${clientId}`);
    }
  }

  /**
   * Subscribe WebSocket client to deployment updates
   */
  subscribeToDeployment(clientId: string, deploymentId: string): void {
    const client = this.webSocketClients.get(clientId);
    if (client) {
      client.subscriptions.add(deploymentId);
      client.deploymentId = deploymentId;
    }
  }

  /**
   * Get deployment metrics
   */
  getMetrics(): DeploymentMetrics {
    return { ...this.metrics };
  }

  /**
   * Get supported deployment providers
   */
  getSupportedProviders(): Array<{ 
    providerId: string; 
    name: string; 
    isConfigured: boolean; 
    capabilities: any 
  }> {
    const providers: Array<{ providerId: string; name: string; isConfigured: boolean; capabilities: any }> = [];
    
    for (const [providerId, adapterInfo] of this.adapters) {
      providers.push({
        providerId,
        name: adapterInfo.adapter.providerName,
        isConfigured: adapterInfo.isConfigured,
        capabilities: adapterInfo.adapter.capabilities
      });
    }
    
    return providers;
  }

  // Private helper methods

  private async getOrCreateAdapter(providerId: string): Promise<IDeploymentAdapter | null> {
    let adapterInfo = this.adapters.get(providerId);
    
    if (!adapterInfo) {
      const factory = this.adapterFactories.get(providerId);
      if (!factory) {
        return null;
      }

      const adapter = factory.createAdapter(providerId);
      if (!adapter) {
        return null;
      }

      adapterInfo = {
        adapter,
        isConfigured: false,
        lastHealthCheck: new Date(),
        isHealthy: false
      };
      
      this.adapters.set(providerId, adapterInfo);
    }

    return adapterInfo.adapter;
  }

  private async getConfiguredAdapter(providerId: string): Promise<IDeploymentAdapter | null> {
    const adapterInfo = this.adapters.get(providerId);
    return adapterInfo?.isConfigured ? adapterInfo.adapter : null;
  }

  private async storeProviderCredentials(
    organizationId: string,
    providerId: string,
    credentials: Record<string, any>,
    userId: string,
    context?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Create provider credential record
      const credentialData = {
        organizationId,
        userId,
        provider: providerId,
        name: `${providerId}_default`,
        isActive: true
      };

      const providerCredential = await storage.createProviderCredential(credentialData);

      // Store encrypted credentials via SecretsService with full audit context
      const secretResult = await this.secretsService.createSecret(
        {
          organizationId,
          key: `deployment_${providerId}_${providerCredential.id}`,
          name: `${providerId} Deployment Credentials`,
          description: `Encrypted credentials for ${providerId} deployment provider`,
          category: 'deployment',
          environment: 'production',
          createdBy: userId,
          value: JSON.stringify(credentials)
        },
        userId,
        {
          requestId: context?.requestId || `deploy-creds-${Date.now()}`,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent
        }
      );

      if (!secretResult) {
        await storage.deleteProviderCredential(providerCredential.id);
        return { success: false, error: 'Failed to store credentials securely' };
      }

      // Update provider credential with secret reference
      await storage.updateProviderCredential(providerCredential.id, {
        credentialsSecretId: secretResult.id
      });

      // Store reference to credentials in adapter info for quick access
      const adapterInfo = this.adapters.get(providerId);
      if (adapterInfo) {
        adapterInfo.credentials = providerCredential;
      }

      if (this.config.enableLogging) {
        console.log(`🔐 Stored encrypted credentials for ${providerId} provider`);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to store provider credentials:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Retrieve provider credentials from SecretsService
   */
  private async retrieveProviderCredentials(
    organizationId: string,
    providerId: string,
    userId: string,
    context?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<{ success: boolean; credentials?: Record<string, any>; error?: string }> {
    try {
      // Get provider credential record
      const providerCredentials = await storage.getProviderCredentialsByOrganization(
        organizationId,
        providerId
      );

      const activeCredential = providerCredentials.find(cred => cred.isActive);
      if (!activeCredential || !activeCredential.credentialsSecretId) {
        return { success: false, error: `No active credentials found for ${providerId}` };
      }

      // Retrieve and decrypt credentials via SecretsService
      const secretResult = await this.secretsService.getSecretValue(
        activeCredential.credentialsSecretId,
        userId,
        {
          requestId: context?.requestId || `deploy-retrieve-${Date.now()}`,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent
        }
      );

      if (!secretResult.success || !secretResult.value) {
        return { 
          success: false, 
          error: secretResult.error || 'Failed to decrypt credentials' 
        };
      }

      try {
        const credentials = JSON.parse(secretResult.value);
        return { success: true, credentials };
      } catch (parseError) {
        return { 
          success: false, 
          error: 'Invalid credentials format' 
        };
      }
    } catch (error) {
      console.error('Failed to retrieve provider credentials:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Rotate provider credentials
   */
  async rotateProviderCredentials(
    organizationId: string,
    providerId: string,
    newCredentials: Record<string, any>,
    userId: string,
    context?: { ipAddress?: string; userAgent?: string; requestId?: string; reason?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current provider credential record
      const providerCredentials = await storage.getProviderCredentialsByOrganization(
        organizationId,
        providerId
      );

      const activeCredential = providerCredentials.find(cred => cred.isActive);
      if (!activeCredential || !activeCredential.credentialsSecretId) {
        return { success: false, error: `No active credentials found for ${providerId}` };
      }

      // Rotate credentials via SecretsService
      const rotationResult = await this.secretsService.updateSecret(
        activeCredential.credentialsSecretId,
        JSON.stringify(newCredentials),
        userId,
        {
          reason: context?.reason || `Rotated ${providerId} deployment credentials`,
          requestId: context?.requestId || `deploy-rotate-${Date.now()}`,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent
        }
      );

      if (!rotationResult.success) {
        return { 
          success: false, 
          error: rotationResult.error || 'Failed to rotate credentials' 
        };
      }

      // Test new credentials with the adapter
      const adapter = this.adapters.get(providerId)?.adapter;
      if (adapter) {
        const testResult = await adapter.configure(newCredentials);
        if (!testResult.success) {
          // If new credentials don't work, log but don't fail the rotation
          console.warn(`New credentials for ${providerId} failed validation:`, testResult.error);
        } else {
          // Update adapter configuration status
          const adapterInfo = this.adapters.get(providerId);
          if (adapterInfo) {
            adapterInfo.isConfigured = true;
            adapterInfo.isHealthy = true;
            adapterInfo.lastHealthCheck = new Date();
          }
        }
      }

      if (this.config.enableLogging) {
        console.log(`🔄 Rotated credentials for ${providerId} provider`);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to rotate provider credentials:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Enhanced provider configuration with credential retrieval
   */
  private async configureProviderWithStoredCredentials(
    organizationId: string,
    providerId: string,
    userId: string,
    context?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get or create adapter
      const adapter = await this.getOrCreateAdapter(providerId);
      if (!adapter) {
        return { success: false, error: `Provider ${providerId} not supported` };
      }

      // Retrieve stored credentials
      const credentialsResult = await this.retrieveProviderCredentials(
        organizationId,
        providerId,
        userId,
        context
      );

      if (!credentialsResult.success || !credentialsResult.credentials) {
        return { 
          success: false, 
          error: credentialsResult.error || 'No credentials available' 
        };
      }

      // Configure adapter with retrieved credentials
      const configResult = await adapter.configure(credentialsResult.credentials);
      if (!configResult.success) {
        return { success: false, error: configResult.error };
      }

      // Update adapter info
      const adapterInfo = this.adapters.get(providerId)!;
      adapterInfo.isConfigured = true;
      adapterInfo.isHealthy = true;
      adapterInfo.lastHealthCheck = new Date();

      if (this.config.enableLogging) {
        console.log(`✅ Configured ${providerId} provider with stored credentials`);
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to configure provider ${providerId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async executeDeployment(
    run: DeploymentRun,
    deployment: Deployment,
    target: DeploymentTarget,
    adapter: IDeploymentAdapter,
    buildConfig: BuildConfig
  ): Promise<void> {
    try {
      // Update status to building
      await this.updateDeploymentRunStatus(run.id, 'building');

      // Execute deployment
      const result = await adapter.deploy(deployment, target, buildConfig, run.gitCommitSha);

      // Update run with results
      const updateData: Partial<DeploymentRun> = {
        status: result.success ? 'success' : 'failed',
        completedAt: new Date(),
        deploymentUrl: result.url,
        previewUrl: result.previewUrl,
        error: result.error,
        buildDuration: result.buildDuration,
        deployDuration: result.deployDuration,
        providerRunId: result.deploymentId,
        metadata: result.metadata
      };

      await storage.updateDeploymentRun(run.id, updateData);
      this.activeDeployments.delete(run.id);

      // Update metrics
      this.updateMetrics(result.success);

      // Emit completion event
      this.emitDeploymentEvent(
        result.success ? 'deployment_completed' : 'deployment_failed',
        deployment.id,
        { runId: run.id, url: result.url, error: result.error }
      );

    } catch (error) {
      console.error('Deployment execution failed:', error);
      
      await storage.updateDeploymentRun(run.id, {
        status: 'failed',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      this.activeDeployments.delete(run.id);
      this.updateMetrics(false);

      this.emitDeploymentEvent('deployment_failed', deployment.id, {
        runId: run.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async executePreviewDeployment(
    run: DeploymentRun,
    deployment: Deployment,
    adapter: IDeploymentAdapter,
    previewConfig: PreviewConfig,
    buildConfig: BuildConfig,
    pullRequestNumber: number
  ): Promise<void> {
    try {
      await this.updateDeploymentRunStatus(run.id, 'building');

      const result = await adapter.deployPreview(
        deployment,
        previewConfig,
        buildConfig,
        pullRequestNumber,
        run.gitCommitSha
      );

      const updateData: Partial<DeploymentRun> = {
        status: result.success ? 'success' : 'failed',
        completedAt: new Date(),
        previewUrl: result.previewUrl || result.url,
        error: result.error,
        buildDuration: result.buildDuration,
        deployDuration: result.deployDuration,
        providerRunId: result.deploymentId,
        metadata: result.metadata
      };

      await storage.updateDeploymentRun(run.id, updateData);
      this.activeDeployments.delete(run.id);

      if (result.success && result.previewUrl) {
        // Update preview mapping with URL
        const previewMapping = await storage.getPreviewMappingByPR(deployment.id, pullRequestNumber);
        if (previewMapping) {
          await storage.updatePreviewMapping(previewMapping.id, {
            previewUrl: result.previewUrl
          });
        }
      }

      this.updateMetrics(result.success);

      this.emitDeploymentEvent(
        result.success ? 'preview_created' : 'deployment_failed',
        deployment.id,
        { 
          runId: run.id, 
          url: result.previewUrl, 
          pullRequestNumber,
          error: result.error 
        }
      );

    } catch (error) {
      console.error('Preview deployment execution failed:', error);
      
      await storage.updateDeploymentRun(run.id, {
        status: 'failed',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      this.activeDeployments.delete(run.id);
      this.updateMetrics(false);

      this.emitDeploymentEvent('deployment_failed', deployment.id, {
        runId: run.id,
        pullRequestNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async executeRollback(
    run: DeploymentRun,
    deployment: Deployment,
    adapter: IDeploymentAdapter,
    targetDeploymentId: string,
    options?: RollbackOptions
  ): Promise<void> {
    try {
      await this.updateDeploymentRunStatus(run.id, 'deploying');

      this.emitDeploymentEvent('rollback_started', deployment.id, { 
        runId: run.id, 
        targetDeploymentId 
      });

      const result = await adapter.rollback(run.providerRunId || run.id, options);

      const updateData: Partial<DeploymentRun> = {
        status: result.success ? 'success' : 'failed',
        completedAt: new Date(),
        error: result.error,
        metadata: { 
          ...run.metadata, 
          rollbackResult: result.metadata,
          rolledBackToId: result.rolledBackToId
        }
      };

      await storage.updateDeploymentRun(run.id, updateData);
      this.activeDeployments.delete(run.id);

      this.updateMetrics(result.success);

      this.emitDeploymentEvent(
        result.success ? 'rollback_completed' : 'deployment_failed',
        deployment.id,
        { 
          runId: run.id, 
          targetDeploymentId: result.rolledBackToId,
          error: result.error 
        }
      );

    } catch (error) {
      console.error('Rollback execution failed:', error);
      
      await storage.updateDeploymentRun(run.id, {
        status: 'failed',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      this.activeDeployments.delete(run.id);
      this.updateMetrics(false);

      this.emitDeploymentEvent('deployment_failed', deployment.id, {
        runId: run.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async updateDeploymentRunStatus(runId: string, status: DeploymentStatus): Promise<void> {
    await storage.updateDeploymentRun(runId, { status });
    
    const run = this.activeDeployments.get(runId);
    if (run) {
      run.status = status;
      this.emitDeploymentEvent('deployment_progress', run.deploymentId, {
        runId,
        status
      });
    }
  }

  private updateMetrics(success: boolean): void {
    this.metrics.totalDeployments++;
    if (success) {
      this.metrics.successfulDeployments++;
    } else {
      this.metrics.failedDeployments++;
    }
    this.metrics.activeDeployments = this.activeDeployments.size;
    this.metrics.lastActivity = new Date();
  }

  private emitDeploymentEvent(
    eventType: DeploymentEventType,
    deploymentId: string,
    data: Record<string, any>
  ): void {
    if (!this.config.enableRealTimeUpdates) {
      return;
    }

    const event: DeploymentEvent = {
      type: eventType,
      deploymentId,
      deploymentRunId: data.runId,
      timestamp: new Date(),
      data
    };

    // Broadcast to subscribed WebSocket clients via global broadcast function
    if (typeof global.broadcastDeploymentUpdate === 'function') {
      try {
        global.broadcastDeploymentUpdate(deploymentId, {
          type: 'deployment_event',
          event
        });
      } catch (error) {
        console.error('Failed to broadcast deployment event via WebSocket:', error);
      }
    }

    if (this.config.enableLogging) {
      console.log(`📡 Deployment event: ${eventType} for ${deploymentId}`);
    }
  }

  /**
   * CRITICAL: Reconciliation loop to poll provider status for in-flight deployments
   */
  private async reconcileInFlightDeployments(): Promise<void> {
    try {
      const activeRuns = await storage.getActiveDeploymentRuns();
      const inFlightRuns = activeRuns.filter(run => 
        ['queued', 'building', 'deploying', 'pending'].includes(run.status)
      );

      if (this.config.enableLogging && inFlightRuns.length > 0) {
        console.log(`🔄 Reconciling ${inFlightRuns.length} in-flight deployments`);
      }

      for (const run of inFlightRuns) {
        try {
          await this.reconcileSingleDeployment(run);
        } catch (error) {
          console.error(`Failed to reconcile deployment run ${run.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to get active deployment runs for reconciliation:', error);
    }
  }

  /**
   * CRITICAL: Reconcile a single deployment run with provider status
   */
  private async reconcileSingleDeployment(run: DeploymentRun): Promise<void> {
    try {
      const deployment = await storage.getDeployment(run.deploymentId);
      if (!deployment) {
        console.error(`Deployment ${run.deploymentId} not found for run ${run.id}`);
        return;
      }

      const adapter = await this.getConfiguredAdapter(deployment.provider);
      if (!adapter) {
        console.error(`No configured adapter for provider ${deployment.provider}`);
        await this.markDeploymentAsFailed(run.id, 'Provider not configured', 'provider_error');
        return;
      }

      // Poll provider for current status
      const providerStatus = await adapter.getDeploymentStatus(
        run.providerDeploymentId || run.id
      );

      if (providerStatus.success && providerStatus.status) {
        const currentStatus = this.mapProviderStatusToInternal(providerStatus.status);
        
        // Update status if changed
        if (currentStatus !== run.status) {
          await this.updateDeploymentRunStatus(run.id, currentStatus, providerStatus.metadata);
          
          // Handle terminal states
          if (['success', 'failed', 'cancelled'].includes(currentStatus)) {
            await this.handleTerminalState(run, currentStatus, providerStatus);
          }
        }
      } else {
        // Provider query failed - handle gracefully
        console.warn(`Failed to get status for deployment run ${run.id} from provider:`, providerStatus.error);
      }
    } catch (error) {
      console.error(`Error reconciling deployment run ${run.id}:`, error);
    }
  }

  /**
   * CRITICAL: Enforce deployment timeouts and cleanup stuck deployments
   */
  private async enforceDeploymentTimeouts(): Promise<void> {
    try {
      const activeRuns = await storage.getActiveDeploymentRuns();
      const now = new Date();
      const timeoutMs = (this.config.deploymentTimeout || 1800) * 1000; // Default 30 minutes

      for (const run of activeRuns) {
        if (['queued', 'building', 'deploying'].includes(run.status)) {
          const startTime = run.startedAt || run.createdAt;
          const elapsed = now.getTime() - startTime.getTime();

          if (elapsed > timeoutMs) {
            console.warn(`🚨 Deployment run ${run.id} exceeded timeout (${elapsed}ms > ${timeoutMs}ms)`);
            await this.handleTimeoutedDeployment(run);
          }
        }
      }
    } catch (error) {
      console.error('Failed to enforce deployment timeouts:', error);
    }
  }

  /**
   * CRITICAL: Handle timed out deployments with cleanup and rollback
   */
  private async handleTimeoutedDeployment(run: DeploymentRun): Promise<void> {
    try {
      // Mark as failed due to timeout
      await this.markDeploymentAsFailed(
        run.id, 
        `Deployment exceeded timeout of ${this.config.deploymentTimeout} seconds`, 
        'timeout'
      );

      // Attempt cleanup with provider
      const deployment = await storage.getDeployment(run.deploymentId);
      if (deployment) {
        const adapter = await this.getConfiguredAdapter(deployment.provider);
        if (adapter && run.providerDeploymentId) {
          try {
            await adapter.cancelDeployment(run.providerDeploymentId);
            console.log(`✅ Cancelled timed-out deployment ${run.providerDeploymentId} with provider`);
          } catch (cleanupError) {
            console.error(`Failed to cancel deployment with provider:`, cleanupError);
          }
        }
      }

      // Emit WebSocket event for timeout
      this.emitDeploymentEvent(run.deploymentId, {
        type: 'deployment_timeout',
        runId: run.id,
        deploymentId: run.deploymentId,
        timestamp: new Date(),
        metadata: {
          timeoutSeconds: this.config.deploymentTimeout,
          originalStatus: run.status
        }
      });

      // Remove from active deployments
      this.activeDeployments.delete(run.id);
      
    } catch (error) {
      console.error(`Failed to handle timed out deployment ${run.id}:`, error);
    }
  }

  /**
   * CRITICAL: Handle terminal deployment states
   */
  private async handleTerminalState(
    run: DeploymentRun, 
    finalStatus: string, 
    providerStatus: any
  ): Promise<void> {
    try {
      // Remove from active deployments tracking
      this.activeDeployments.delete(run.id);

      // Update metrics
      this.updateMetrics(finalStatus === 'success');

      // Emit terminal state WebSocket event
      this.emitDeploymentEvent(run.deploymentId, {
        type: finalStatus === 'success' ? 'deployment_completed' : 'deployment_failed',
        runId: run.id,
        deploymentId: run.deploymentId,
        timestamp: new Date(),
        metadata: {
          finalStatus,
          providerMetadata: providerStatus.metadata,
          deploymentUrl: providerStatus.deploymentUrl
        }
      });

      // Handle rollback policies for failed deployments
      if (finalStatus === 'failed') {
        await this.handleFailedDeploymentPolicies(run, providerStatus);
      }

      if (this.config.enableLogging) {
        console.log(`✅ Deployment run ${run.id} reached terminal state: ${finalStatus}`);
      }
    } catch (error) {
      console.error(`Failed to handle terminal state for deployment ${run.id}:`, error);
    }
  }

  /**
   * CRITICAL: Handle failed deployment policies including rollback
   */
  private async handleFailedDeploymentPolicies(
    run: DeploymentRun, 
    providerStatus: any
  ): Promise<void> {
    try {
      const deployment = await storage.getDeployment(run.deploymentId);
      if (!deployment) return;

      const target = run.targetId ? await storage.getDeploymentTarget(run.targetId) : null;
      
      // Check if auto-rollback is enabled
      const rollbackPolicy = target?.protectionRules?.autoRollback || deployment.providerConfig?.autoRollback;
      
      if (rollbackPolicy?.enabled && target?.isProduction) {
        console.log(`🔄 Triggering auto-rollback for failed production deployment ${run.id}`);
        
        try {
          // Find last successful deployment to rollback to
          const lastSuccessful = await storage.getLatestDeploymentRun(
            run.deploymentId, 
            run.targetId
          );
          
          if (lastSuccessful && lastSuccessful.status === 'success') {
            await this.rollbackDeployment(
              run.deploymentId,
              lastSuccessful.id,
              {
                reason: 'auto_rollback_on_failure',
                triggeredBy: 'system',
                originalFailedRun: run.id
              }
            );
          }
        } catch (rollbackError) {
          console.error(`Failed to auto-rollback deployment ${run.id}:`, rollbackError);
        }
      }
    } catch (error) {
      console.error(`Failed to handle failed deployment policies:`, error);
    }
  }

  /**
   * Map provider-specific status to internal status
   */
  private mapProviderStatusToInternal(providerStatus: string): string {
    const statusMapping: Record<string, string> = {
      'pending': 'queued',
      'queued': 'queued', 
      'building': 'building',
      'deploying': 'deploying',
      'ready': 'success',
      'success': 'success',
      'completed': 'success',
      'failed': 'failed',
      'error': 'failed',
      'cancelled': 'cancelled',
      'canceled': 'cancelled'
    };
    
    return statusMapping[providerStatus.toLowerCase()] || providerStatus;
  }

  /**
   * Update deployment run status with WebSocket notification
   */
  private async updateDeploymentRunStatus(
    runId: string, 
    status: string, 
    metadata?: any
  ): Promise<void> {
    try {
      const run = await storage.updateDeploymentRun(runId, {
        status,
        updatedAt: new Date(),
        ...(metadata && { providerMetadata: metadata })
      });
      
      if (run) {
        // Emit status change event
        this.emitDeploymentEvent(run.deploymentId, {
          type: 'deployment_status_changed',
          runId,
          deploymentId: run.deploymentId,
          timestamp: new Date(),
          metadata: {
            newStatus: status,
            previousStatus: this.activeDeployments.get(runId)?.status || 'unknown',
            providerMetadata: metadata
          }
        });
        
        // Update active deployments cache
        if (this.activeDeployments.has(runId)) {
          this.activeDeployments.set(runId, run);
        }
      }
    } catch (error) {
      console.error(`Failed to update deployment run status:`, error);
    }
  }

  /**
   * Mark deployment as failed with proper cleanup
   */
  private async markDeploymentAsFailed(
    runId: string, 
    errorMessage: string, 
    errorCode: string
  ): Promise<void> {
    try {
      await storage.updateDeploymentRun(runId, {
        status: 'failed',
        errorMessage,
        errorCode,
        completedAt: new Date(),
        updatedAt: new Date()
      });
      
      // Remove from active tracking
      this.activeDeployments.delete(runId);
      
      // Update failure metrics
      this.metrics.failedDeployments++;
      this.metrics.activeDeployments = Math.max(0, this.metrics.activeDeployments - 1);
      
    } catch (error) {
      console.error(`Failed to mark deployment as failed:`, error);
    }
  }

  /**
   * Update deployment metrics
   */
  private updateMetrics(successful: boolean): void {
    this.metrics.totalDeployments++;
    this.metrics.activeDeployments = Math.max(0, this.metrics.activeDeployments - 1);
    
    if (successful) {
      this.metrics.successfulDeployments++;
    } else {
      this.metrics.failedDeployments++;
    }
    
    this.metrics.lastActivity = new Date();
  }

  private startBackgroundTasks(): void {
    // CRITICAL: Reconciliation loop for in-flight deployments
    setInterval(async () => {
      try {
        await this.reconcileInFlightDeployments();
      } catch (error) {
        console.error('Failed to reconcile in-flight deployments:', error);
      }
    }, 30 * 1000); // Check every 30 seconds

    // CRITICAL: Timeout enforcement and cleanup
    setInterval(async () => {
      try {
        await this.enforceDeploymentTimeouts();
      } catch (error) {
        console.error('Failed to enforce deployment timeouts:', error);
      }
    }, 60 * 1000); // Check every minute

    // Auto-teardown expired preview environments
    setInterval(async () => {
      try {
        const expiredPreviews = await storage.getExpiredPreviewMappings();
        for (const preview of expiredPreviews) {
          await this.teardownPreview(preview.deploymentId, preview.pullRequestNumber);
        }
      } catch (error) {
        console.error('Failed to cleanup expired previews:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Health check all configured adapters
    setInterval(async () => {
      for (const [providerId, adapterInfo] of this.adapters) {
        if (adapterInfo.isConfigured) {
          try {
            const health = await adapterInfo.adapter.healthCheck();
            adapterInfo.isHealthy = health.healthy;
            adapterInfo.lastHealthCheck = new Date();
          } catch (error) {
            adapterInfo.isHealthy = false;
            console.error(`Health check failed for ${providerId}:`, error);
          }
        }
      }
    }, 2 * 60 * 1000); // Check every 2 minutes
  }
}

// Export singleton instance
export const deploymentOrchestrator = DeploymentOrchestratorService.getInstance();
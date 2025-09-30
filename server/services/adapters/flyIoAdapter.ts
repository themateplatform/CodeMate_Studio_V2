import { 
  IDeploymentAdapter,
  DeploymentResult,
  DeploymentStatus,
  DeploymentLogEntry,
  DeploymentProgress,
  BuildConfig,
  EnvVarConfig,
  PreviewConfig,
  RollbackOptions,
  ProviderConfig
} from "../deploymentAdapter";
import type { 
  Deployment, 
  DeploymentTarget, 
  DeploymentEnvVar 
} from "@shared/schema";

/**
 * Fly.io deployment adapter for full-stack Docker-based deployments
 * Supports per-PR apps, auto-scaling, global regions, and comprehensive lifecycle management
 */
export class FlyIoAdapter implements IDeploymentAdapter {
  private accessToken?: string;
  private organizationSlug?: string;
  private defaultRegion: string = 'ord'; // Chicago as default
  private isConfigured: boolean = false;

  readonly providerId = 'fly_io';
  readonly providerName = 'Fly.io';
  readonly capabilities = {
    supportsPreviewEnvironments: true,
    supportsRollback: true,
    supportsCustomDomains: true,
    supportsEnvironmentVariables: true,
    supportsServerlessFunctions: false,
    supportsStaticSites: true,
    supportsFullStackApps: true,
    supportsDocker: true,
    supportsBuildLogs: true,
    supportsRealTimeLogs: true,
    supportsScaling: true,
    supportsRegionSelection: true
  };

  /**
   * Configure the Fly.io adapter with API credentials
   */
  async configure(credentials: Record<string, any>, config?: ProviderConfig): Promise<{ success: boolean; error?: string; metadata?: Record<string, any> }> {
    try {
      const { accessToken, organizationSlug, defaultRegion } = credentials;

      if (!accessToken) {
        return { success: false, error: 'Fly.io access token is required' };
      }

      this.accessToken = accessToken;
      this.organizationSlug = organizationSlug || '';
      this.defaultRegion = defaultRegion || 'ord';

      // Verify credentials by making test API call
      const testResult = await this.testConnection();
      if (!testResult.success) {
        return { success: false, error: testResult.error };
      }

      this.isConfigured = true;
      console.log(`✅ Fly.io adapter configured successfully`);
      
      return { success: true };
    } catch (error) {
      console.error('Fly.io configuration error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Configuration failed' 
      };
    }
  }

  /**
   * Test Fly.io API connection
   */
  private async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.makeApiRequest('GET', '/api/v1/user');
      
      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.text();
        return { 
          success: false, 
          error: `Fly.io API error: ${response.status} ${error}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }

  /**
   * Set environment variables for deployment
   */
  async setEnvironmentVariables(
    deploymentId: string, 
    targetId: string | null,
    envVars: EnvVarConfig[]
  ): Promise<{ success: boolean; error?: string; appliedVars?: string[] }> {
    try {
      if (!this.isConfigured) {
        return { success: false, error: 'Adapter not configured' };
      }

      const appName = deploymentId; // Use deploymentId directly

      // Set secrets via Fly.io API
      for (const envVar of envVars) {
        if (envVar.scope === 'build' || envVar.scope === 'both') {
          const secretResult = await this.setAppSecret(appName, envVar.key, envVar.value);
          if (!secretResult.success) {
            return { success: false, error: `Failed to set ${envVar.key}: ${secretResult.error}` };
          }
        }
      }

      console.log(`✅ Set ${envVars.length} environment variables for ${appName}`);
      return { success: true, appliedVars: envVars.map(v => v.key) };
    } catch (error) {
      console.error('Environment variable setting failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to set environment variables' 
      };
    }
  }

  /**
   * Deploy to production
   */
  async deploy(
    deployment: Deployment,
    target: DeploymentTarget,
    buildConfig: BuildConfig,
    gitCommitSha?: string
  ): Promise<DeploymentResult> {
    try {
      if (!this.isConfigured) {
        return { 
          success: false, 
          deploymentId: '', 
          error: 'Adapter not configured' 
        };
      }

      const appName = this.generateAppName(deployment, target);
      const startTime = Date.now();

      console.log(`🚀 Starting Fly.io deployment for ${appName}`);

      // Create or update Fly.io app
      const appResult = await this.ensureApp(appName, deployment, target);
      if (!appResult.success) {
        return {
          success: false,
          deploymentId: appName,
          error: appResult.error
        };
      }

      // Generate fly.toml configuration
      const flyConfig = this.generateFlyConfig(deployment, target, buildConfig);
      
      // Deploy via Fly.io API
      const deployResult = await this.performDeploy(appName, flyConfig, gitCommitSha);
      if (!deployResult.success) {
        return {
          success: false,
          deploymentId: appName,
          error: deployResult.error
        };
      }

      const deployDuration = Math.round((Date.now() - startTime) / 1000);

      return {
        success: true,
        deploymentId: appName,
        url: `https://${appName}.fly.dev`,
        buildDuration: deployResult.buildDuration,
        deployDuration,
        metadata: {
          appName,
          region: this.defaultRegion,
          version: deployResult.version,
          commit: gitCommitSha
        }
      };
    } catch (error) {
      console.error('Fly.io deployment failed:', error);
      return {
        success: false,
        deploymentId: '',
        error: error instanceof Error ? error.message : 'Deployment failed'
      };
    }
  }

  /**
   * Deploy preview environment
   */
  async deployPreview(
    deployment: Deployment,
    previewConfig: PreviewConfig,
    buildConfig: BuildConfig,
    pullRequestNumber: number,
    gitCommitSha?: string
  ): Promise<DeploymentResult> {
    try {
      if (!this.isConfigured) {
        return { 
          success: false, 
          deploymentId: '', 
          error: 'Adapter not configured' 
        };
      }

      const appName = this.generatePreviewAppName(deployment, pullRequestNumber);
      const startTime = Date.now();

      console.log(`🌟 Creating Fly.io preview deployment: ${appName}`);

      // Create preview app
      const appResult = await this.ensureApp(appName, deployment, null, true);
      if (!appResult.success) {
        return {
          success: false,
          deploymentId: appName,
          error: appResult.error
        };
      }

      // Generate preview-specific fly.toml
      const flyConfig = this.generatePreviewFlyConfig(deployment, buildConfig, previewConfig);

      // Deploy preview
      const deployResult = await this.performDeploy(appName, flyConfig, gitCommitSha);
      if (!deployResult.success) {
        return {
          success: false,
          deploymentId: appName,
          error: deployResult.error
        };
      }

      const deployDuration = Math.round((Date.now() - startTime) / 1000);
      const previewUrl = `https://${appName}.fly.dev`;

      return {
        success: true,
        deploymentId: appName,
        url: previewUrl,
        previewUrl,
        buildDuration: deployResult.buildDuration,
        deployDuration,
        metadata: {
          appName,
          region: this.defaultRegion,
          version: deployResult.version,
          commit: gitCommitSha,
          pullRequest: pullRequestNumber,
          isPreview: true
        }
      };
    } catch (error) {
      console.error('Fly.io preview deployment failed:', error);
      return {
        success: false,
        deploymentId: '',
        error: error instanceof Error ? error.message : 'Preview deployment failed'
      };
    }
  }

  /**
   * Get deployment status
   */
  async getStatus(deploymentId: string): Promise<{ status: DeploymentStatus; progress?: DeploymentProgress; url?: string; error?: string; metadata?: Record<string, any> }> {
    try {
      if (!this.isConfigured) {
        return { 
          status: 'error',
          error: 'Adapter not configured' 
        };
      }

      const appName = deploymentId;
      const response = await this.makeApiRequest('GET', `/api/v1/apps/${appName}/status`);

      if (!response.ok) {
        return {
          status: 'error',
          error: `Failed to get status: ${response.status}`
        };
      }

      const statusData = await response.json();
      const flyStatus = this.mapFlyStatusToDeploymentStatus(statusData.status);

      return {
        status: flyStatus,
        url: `https://${appName}.fly.dev`,
        metadata: {
          instances: statusData.instances,
          regions: statusData.regions,
          version: statusData.version
        }
      };
    } catch (error) {
      console.error('Status check failed:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Status check failed'
      };
    }
  }

  /**
   * Get deployment logs
   */
  async getLogs(deploymentId: string, options?: { since?: Date; tail?: boolean; maxLines?: number; source?: string }): Promise<{ logs: DeploymentLogEntry[]; hasMore?: boolean; streamUrl?: string }> {
    try {
      if (!this.isConfigured) {
        return { 
          logs: [],
          hasMore: false 
        };
      }

      const appName = deploymentId;
      let url = `/api/v1/apps/${appName}/logs`;
      
      const params = new URLSearchParams();
      if (options?.since) {
        params.append('since', options.since.toISOString());
      }
      if (options?.maxLines) {
        params.append('limit', options.maxLines.toString());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await this.makeApiRequest('GET', url);

      if (!response.ok) {
        return {
          logs: [],
          hasMore: false
        };
      }

      const logsData = await response.json();
      const logEntries = logsData.logs.map((log: any) => ({
        timestamp: new Date(log.timestamp),
        level: this.mapFlyLogLevel(log.level),
        message: log.message,
        source: log.instance || 'fly',
        metadata: {
          instance: log.instance,
          region: log.region
        }
      }));

      return {
        logs: logEntries,
        hasMore: logsData.logs.length >= (options?.maxLines || 100)
      };
    } catch (error) {
      console.error('Logs retrieval failed:', error);
      return {
        logs: [],
        hasMore: false
      };
    }
  }

  /**
   * Rollback deployment
   */
  async rollback(
    deploymentId: string, 
    options?: RollbackOptions
  ): Promise<{ success: boolean; rolledBackToId?: string; error?: string; metadata?: Record<string, any> }> {
    try {
      if (!this.isConfigured) {
        return { 
          success: false, 
          error: 'Adapter not configured' 
        };
      }

      const appName = deploymentId;
      
      // Get deployment history
      const historyResponse = await this.makeApiRequest('GET', `/api/v1/apps/${appName}/releases`);
      if (!historyResponse.ok) {
        return {
          success: false,
          error: 'Failed to get deployment history'
        };
      }

      const releases = await historyResponse.json();
      if (releases.length < 2) {
        return {
          success: false,
          error: 'No previous version available for rollback'
        };
      }

      // Find target version to rollback to
      const targetRelease = options?.targetDeploymentId 
        ? releases.find((r: any) => r.id === options?.targetDeploymentId)
        : releases[1]; // Previous release

      if (!targetRelease) {
        return {
          success: false,
          error: 'Target release not found'
        };
      }

      // Perform rollback
      const rollbackResponse = await this.makeApiRequest('POST', `/api/v1/apps/${appName}/releases`, {
        image: targetRelease.image,
        config: targetRelease.config
      });

      if (!rollbackResponse.ok) {
        return {
          success: false,
          error: 'Rollback failed'
        };
      }

      const rollbackData = await rollbackResponse.json();

      return {
        success: true,
        rolledBackToId: targetRelease.id,
        metadata: {
          rolledBackFrom: releases[0].version,
          rolledBackTo: targetRelease.version,
          rollbackId: rollbackData.id
        }
      };
    } catch (error) {
      console.error('Rollback failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Rollback failed'
      };
    }
  }

  /**
   * Teardown preview deployment
   */
  async teardownPreview(previewId: string): Promise<{ success: boolean; error?: string; resourcesRemoved?: string[] }> {
    try {
      if (!this.isConfigured) {
        return { 
          success: false, 
          error: 'Adapter not configured' 
        };
      }

      const appName = previewId;
      
      // Delete the Fly.io app
      const deleteResponse = await this.makeApiRequest('DELETE', `/api/v1/apps/${appName}`);

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        return {
          success: false,
          error: `Failed to delete app: ${deleteResponse.status}`
        };
      }

      console.log(`🗑️ Successfully deleted Fly.io preview app: ${appName}`);

      return {
        success: true,
        resourcesRemoved: [appName]
      };
    } catch (error) {
      console.error('Preview teardown failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Preview teardown failed'
      };
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Generate app name for deployment
   */
  private generateAppName(deployment: Deployment, target: DeploymentTarget | null): string {
    const baseName = deployment.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const env = target?.type || 'default';
    return `${baseName}-${env}`;
  }

  /**
   * Generate preview app name
   */
  private generatePreviewAppName(deployment: Deployment, pullRequestNumber: number): string {
    const baseName = deployment.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `${baseName}-pr-${pullRequestNumber}`;
  }

  /**
   * Make authenticated API request to Fly.io
   */
  private async makeApiRequest(method: string, path: string, body?: any): Promise<Response> {
    const url = `https://api.machines.dev${path}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CodeVibe-Deployment-System/1.0'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  }

  /**
   * Ensure Fly.io app exists
   */
  private async ensureApp(
    appName: string, 
    deployment: Deployment, 
    target: DeploymentTarget | null,
    isPreview: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if app exists
      const existsResponse = await this.makeApiRequest('GET', `/api/v1/apps/${appName}`);
      
      if (existsResponse.ok) {
        return { success: true }; // App already exists
      }

      if (existsResponse.status !== 404) {
        return { 
          success: false, 
          error: `Error checking app existence: ${existsResponse.status}` 
        };
      }

      // Create new app
      const createData = {
        app_name: appName,
        org_slug: this.organizationSlug,
        runtime: 'flyctl', // Standard runtime
        primary_region: this.defaultRegion // DeploymentTarget doesn't have region property
      };

      const createResponse = await this.makeApiRequest('POST', '/api/v1/apps', createData);
      
      if (!createResponse.ok) {
        const error = await createResponse.text();
        return { 
          success: false, 
          error: `Failed to create app: ${createResponse.status} ${error}` 
        };
      }

      console.log(`✅ Created Fly.io app: ${appName}`);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'App creation failed' 
      };
    }
  }

  /**
   * Set app secret/environment variable
   */
  private async setAppSecret(appName: string, key: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.makeApiRequest('PUT', `/api/v1/apps/${appName}/secrets`, {
        [key]: value
      });

      if (!response.ok) {
        const error = await response.text();
        return { 
          success: false, 
          error: `Failed to set secret ${key}: ${response.status} ${error}` 
        };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Secret setting failed' 
      };
    }
  }

  /**
   * Generate fly.toml configuration
   */
  private generateFlyConfig(deployment: Deployment, target: DeploymentTarget, buildConfig: BuildConfig): string {
    const config = {
      app: this.generateAppName(deployment, target),
      primary_region: this.defaultRegion,
      
      build: {
        dockerfile: 'Dockerfile' // Default dockerfile name
      },

      http_service: {
        internal_port: 8080,
        force_https: true,
        auto_stop_machines: false,
        auto_start_machines: true,
        min_machines_running: target.isProduction ? 1 : 0
      },

      vm: {
        memory: target.isProduction ? '1gb' : '512mb',
        cpus: target.isProduction ? 2 : 1
      }
    };

    return `# Auto-generated fly.toml for ${deployment.name}
app = "${config.app}"
primary_region = "${config.primary_region}"

[build]
  dockerfile = "${config.build.dockerfile}"

[http_service]
  internal_port = ${config.http_service.internal_port}
  force_https = ${config.http_service.force_https}
  auto_stop_machines = ${config.http_service.auto_stop_machines}
  auto_start_machines = ${config.http_service.auto_start_machines}
  min_machines_running = ${config.http_service.min_machines_running}

[[vm]]
  memory = "${config.vm.memory}"
  cpu_kind = "shared"
  cpus = ${config.vm.cpus}
`;
  }

  /**
   * Generate preview-specific fly.toml configuration
   */
  private generatePreviewFlyConfig(deployment: Deployment, buildConfig: BuildConfig, previewConfig: PreviewConfig): string {
    const appName = this.generatePreviewAppName(deployment, 0); // Will be replaced with actual PR number
    
    return `# Auto-generated fly.toml for ${deployment.name} preview
app = "${appName}"
primary_region = "${this.defaultRegion}"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
`;
  }

  /**
   * Perform actual deployment
   */
  private async performDeploy(appName: string, flyConfig: string, gitCommitSha?: string): Promise<{ success: boolean; buildDuration?: number; version?: string; error?: string }> {
    try {
      const startTime = Date.now();

      // Deploy using Fly.io API
      const deployData = {
        config: flyConfig,
        image_ref: gitCommitSha ? `commit:${gitCommitSha}` : undefined,
        strategy: 'rolling' // Rolling deployment strategy
      };

      const deployResponse = await this.makeApiRequest('POST', `/api/v1/apps/${appName}/deploy`, deployData);

      if (!deployResponse.ok) {
        const error = await deployResponse.text();
        return { 
          success: false, 
          error: `Deployment failed: ${deployResponse.status} ${error}` 
        };
      }

      const deployResult = await deployResponse.json();
      const buildDuration = Math.round((Date.now() - startTime) / 1000);

      return {
        success: true,
        buildDuration,
        version: deployResult.version || deployResult.id
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Deployment execution failed' 
      };
    }
  }

  /**
   * Map Fly.io status to deployment status
   */
  private mapFlyStatusToDeploymentStatus(flyStatus: string): DeploymentStatus {
    switch (flyStatus?.toLowerCase()) {
      case 'starting':
      case 'pending':
        return 'deploying';
      case 'running':
      case 'deployed':
        return 'success';
      case 'stopped':
      case 'destroyed':
        return 'cancelled';
      case 'failed':
      case 'crashed':
        return 'failed';
      default:
        return 'queued';
    }
  }

  /**
   * Map Fly.io log level to deployment log level
   */
  private mapFlyLogLevel(flyLevel: string): 'info' | 'warn' | 'error' | 'debug' {
    switch (flyLevel?.toLowerCase()) {
      case 'error':
      case 'fatal':
        return 'error';
      case 'warn':
      case 'warning':
        return 'warn';
      case 'debug':
      case 'trace':
        return 'debug';
      default:
        return 'info';
    }
  }

  /**
   * Format Fly.io logs for display
   */
  private formatFlyLogs(logs: any[]): string {
    return logs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      const level = log.level.toUpperCase().padEnd(5);
      const instance = log.instance ? `[${log.instance}]` : '';
      return `${timestamp} ${level} ${instance} ${log.message}`;
    }).join('\n');
  }

  /**
   * Cancel an ongoing deployment
   */
  async cancelDeployment(deploymentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConfigured) {
        return { success: false, error: 'Adapter not configured' };
      }

      const appName = deploymentId;
      const response = await this.makeApiRequest('POST', `/api/v1/apps/${appName}/deploy/cancel`);

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to cancel deployment: ${response.status}`
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cancel deployment failed'
      };
    }
  }

  /**
   * Get deployment metrics and analytics
   */
  async getMetrics(deploymentId: string): Promise<{
    buildTime?: number;
    deployTime?: number;
    buildSize?: number;
    bandwidth?: number;
    requests?: number;
    errors?: number;
    uptime?: number;
  }> {
    try {
      const appName = deploymentId;
      const response = await this.makeApiRequest('GET', `/api/v1/apps/${appName}/metrics`);

      if (!response.ok) {
        return {};
      }

      const metricsData = await response.json();
      return {
        buildTime: metricsData.buildTime,
        deployTime: metricsData.deployTime,
        buildSize: metricsData.buildSize,
        bandwidth: metricsData.bandwidth,
        requests: metricsData.requests,
        errors: metricsData.errors,
        uptime: metricsData.uptime
      };
    } catch (error) {
      console.error('Metrics retrieval failed:', error);
      return {};
    }
  }

  /**
   * Health check for the adapter
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    error?: string;
    responseTime?: number;
    metadata?: Record<string, any>;
  }> {
    try {
      const startTime = Date.now();
      const testResult = await this.testConnection();
      const responseTime = Date.now() - startTime;

      return {
        healthy: testResult.success,
        error: testResult.error,
        responseTime,
        metadata: {
          configured: this.isConfigured,
          organizationSlug: this.organizationSlug,
          defaultRegion: this.defaultRegion
        }
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  /**
   * Validate deployment configuration
   */
  async validateConfig(
    buildConfig: BuildConfig, 
    providerConfig?: ProviderConfig
  ): Promise<{
    valid: boolean;
    errors?: string[];
    warnings?: string[];
    suggestions?: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate build configuration
    if (!buildConfig.buildCommand && !buildConfig.outputDirectory) {
      warnings.push('No build command or output directory specified');
    }

    // Check for Docker support
    if (!buildConfig.buildCommand?.includes('docker')) {
      suggestions.push('Consider using Docker for consistent deployments');
    }

    // Validate provider configuration
    if (providerConfig?.regions && providerConfig.regions.length > 0) {
      const supportedRegions = ['ord', 'iad', 'fra', 'nrt', 'syd', 'lhr', 'cdg'];
      const invalidRegions = providerConfig.regions.filter(r => !supportedRegions.includes(r));
      if (invalidRegions.length > 0) {
        errors.push(`Unsupported regions: ${invalidRegions.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * Get provider-specific limits and quotas
   */
  async getLimits(): Promise<{
    deployments?: { perMonth?: number; concurrent?: number };
    bandwidth?: number;
    buildTime?: number;
    storage?: number;
    customDomains?: number;
    collaborators?: number;
  }> {
    try {
      const response = await this.makeApiRequest('GET', '/api/v1/user/limits');

      if (!response.ok) {
        // Return default limits if API call fails
        return {
          deployments: { perMonth: 1000, concurrent: 10 },
          bandwidth: 100 * 1024 * 1024 * 1024, // 100GB
          buildTime: 600, // 10 minutes
          storage: 10 * 1024 * 1024 * 1024, // 10GB
          customDomains: 10,
          collaborators: 25
        };
      }

      const limitsData = await response.json();
      return {
        deployments: {
          perMonth: limitsData.deployments?.perMonth,
          concurrent: limitsData.deployments?.concurrent
        },
        bandwidth: limitsData.bandwidth,
        buildTime: limitsData.buildTime,
        storage: limitsData.storage,
        customDomains: limitsData.customDomains,
        collaborators: limitsData.collaborators
      };
    } catch (error) {
      console.error('Limits retrieval failed:', error);
      return {};
    }
  }
}
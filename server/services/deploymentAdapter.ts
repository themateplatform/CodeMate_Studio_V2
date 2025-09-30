import { 
  type Deployment, 
  type DeploymentRun, 
  type DeploymentTarget, 
  type DeploymentEnvVar, 
  type PreviewMapping 
} from "@shared/schema";

/**
 * Standard deployment status types across all providers
 */
export type DeploymentStatus = 
  | 'queued'       // Deployment is queued for processing
  | 'building'     // Application is being built
  | 'uploading'    // Build artifacts are being uploaded
  | 'deploying'    // Deployment is in progress
  | 'ready'        // Deployment is live and accessible
  | 'success'      // Deployment completed successfully
  | 'failed'       // Deployment failed
  | 'cancelled'    // Deployment was cancelled
  | 'timeout'      // Deployment timed out
  | 'error';       // Deployment encountered an error

/**
 * Deployment log entry structure
 */
export interface DeploymentLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string; // build, deploy, system, etc.
  metadata?: Record<string, any>;
}

/**
 * Deployment progress information
 */
export interface DeploymentProgress {
  phase: string;           // Current phase: cloning, building, uploading, deploying, ready
  progress: number;        // 0-100 percentage
  message?: string;        // Current operation description
  estimatedTimeRemaining?: number; // Seconds remaining (if available)
}

/**
 * Deployment result information
 */
export interface DeploymentResult {
  success: boolean;
  deploymentId: string;    // Provider's deployment ID
  url?: string;           // Live deployment URL
  previewUrl?: string;    // Preview URL (if different from main URL)
  buildDuration?: number; // Build time in seconds
  deployDuration?: number; // Deploy time in seconds
  buildSize?: number;     // Build artifact size in bytes
  error?: string;         // Error message if failed
  metadata?: Record<string, any>; // Provider-specific metadata
}

/**
 * Environment variable configuration
 */
export interface EnvVarConfig {
  key: string;
  value: string;
  isSecret?: boolean;     // Should be masked in logs
  scope?: 'build' | 'runtime' | 'both'; // When the variable is available
}

/**
 * Build configuration for deployments
 */
export interface BuildConfig {
  buildCommand?: string;    // npm run build, yarn build, etc.
  installCommand?: string;  // npm install, yarn install
  outputDirectory?: string; // dist, build, .next, etc.
  rootDirectory?: string;   // Monorepo support
  nodeVersion?: string;     // Node.js version to use
  framework?: string;       // Framework detection override
  environmentVariables?: EnvVarConfig[];
}

/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
  // Common fields
  regions?: string[];       // Deployment regions
  scale?: {                // Scaling configuration
    minInstances?: number;
    maxInstances?: number;
    autoScale?: boolean;
  };
  
  // Provider-specific settings stored as key-value pairs
  settings?: Record<string, any>;
}

/**
 * Rollback configuration
 */
export interface RollbackOptions {
  targetDeploymentId?: string; // Specific deployment to rollback to
  preserveEnvVars?: boolean;   // Keep current environment variables
  skipHealthCheck?: boolean;   // Skip health checks during rollback
}

/**
 * Preview environment configuration
 */
export interface PreviewConfig {
  autoTeardown?: boolean;      // Auto-destroy when PR closes
  teardownDelay?: number;      // Minutes to wait before auto-teardown
  passwordProtected?: boolean; // Password protect preview environment
  customDomain?: string;       // Custom domain for preview
}

/**
 * Deployment adapter interface that all providers must implement
 * This provides a normalized interface across different deployment platforms
 */
export interface IDeploymentAdapter {
  /** Provider identifier (vercel, fly_io, cloudflare_pages, replit) */
  readonly providerId: string;
  
  /** Provider display name */
  readonly providerName: string;
  
  /** Supported features for this provider */
  readonly capabilities: {
    supportsPreviewEnvironments: boolean;
    supportsRollback: boolean;
    supportsCustomDomains: boolean;
    supportsEnvironmentVariables: boolean;
    supportsServerlessFunctions: boolean;
    supportsStaticSites: boolean;
    supportsFullStackApps: boolean;
    supportsDocker: boolean;
    supportsBuildLogs: boolean;
    supportsRealTimeLogs: boolean;
    supportsScaling: boolean;
    supportsRegionSelection: boolean;
  };

  /**
   * Configure the adapter with provider credentials and settings
   * This should validate credentials and test connectivity
   */
  configure(credentials: Record<string, any>, config?: ProviderConfig): Promise<{
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
  }>;

  /**
   * Set environment variables for a deployment
   * Should handle both build-time and runtime variables
   */
  setEnvironmentVariables(
    deploymentId: string, 
    targetId: string | null,
    envVars: EnvVarConfig[]
  ): Promise<{
    success: boolean;
    error?: string;
    appliedVars?: string[]; // Keys of successfully applied variables
  }>;

  /**
   * Deploy to production environment
   * Main deployment method for production releases
   */
  deploy(
    deployment: Deployment,
    target: DeploymentTarget,
    buildConfig: BuildConfig,
    gitCommitSha?: string
  ): Promise<DeploymentResult>;

  /**
   * Deploy preview environment for pull requests
   * Creates isolated environment for PR testing
   */
  deployPreview(
    deployment: Deployment,
    previewConfig: PreviewConfig,
    buildConfig: BuildConfig,
    pullRequestNumber: number,
    gitCommitSha?: string
  ): Promise<DeploymentResult>;

  /**
   * Get current deployment status
   * Should return real-time status information
   */
  getStatus(deploymentId: string): Promise<{
    status: DeploymentStatus;
    progress?: DeploymentProgress;
    url?: string;
    error?: string;
    metadata?: Record<string, any>;
  }>;

  /**
   * Get deployment logs
   * Should support streaming and historical logs
   */
  getLogs(
    deploymentId: string,
    options?: {
      since?: Date;        // Get logs since this timestamp
      tail?: boolean;      // Stream new logs as they arrive
      maxLines?: number;   // Limit number of log lines
      source?: string;     // Filter by log source (build, runtime, etc.)
    }
  ): Promise<{
    logs: DeploymentLogEntry[];
    hasMore?: boolean;     // More logs available
    streamUrl?: string;    // WebSocket URL for streaming logs
  }>;

  /**
   * Rollback to a previous deployment
   * Should handle graceful rollback with health checks
   */
  rollback(
    deploymentId: string,
    options?: RollbackOptions
  ): Promise<{
    success: boolean;
    rolledBackToId?: string;
    error?: string;
    metadata?: Record<string, any>;
  }>;

  /**
   * Teardown preview environment
   * Clean up resources for closed PRs
   */
  teardownPreview(previewId: string): Promise<{
    success: boolean;
    error?: string;
    resourcesRemoved?: string[]; // List of removed resources
  }>;

  /**
   * Cancel an ongoing deployment
   * Stop deployment process if possible
   */
  cancelDeployment(deploymentId: string): Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Get deployment metrics and analytics
   * Performance and usage statistics
   */
  getMetrics(deploymentId: string): Promise<{
    buildTime?: number;      // Build duration in seconds
    deployTime?: number;     // Deploy duration in seconds
    buildSize?: number;      // Build artifact size in bytes
    bandwidth?: number;      // Bandwidth usage
    requests?: number;       // Request count
    errors?: number;         // Error count
    uptime?: number;         // Uptime percentage
  }>;

  /**
   * Health check for the adapter
   * Verify provider connectivity and credentials
   */
  healthCheck(): Promise<{
    healthy: boolean;
    error?: string;
    responseTime?: number;   // Response time in milliseconds
    metadata?: Record<string, any>;
  }>;

  /**
   * Validate deployment configuration
   * Check if the configuration is valid for this provider
   */
  validateConfig(buildConfig: BuildConfig, providerConfig?: ProviderConfig): Promise<{
    valid: boolean;
    errors?: string[];       // Configuration errors
    warnings?: string[];     // Configuration warnings
    suggestions?: string[];  // Improvement suggestions
  }>;

  /**
   * Get provider-specific limits and quotas
   * Information about usage limits and restrictions
   */
  getLimits(): Promise<{
    deployments?: {
      perMonth?: number;
      concurrent?: number;
    };
    bandwidth?: number;      // Bytes per month
    buildTime?: number;      // Seconds per deployment
    storage?: number;        // Bytes of storage
    customDomains?: number;  // Number of custom domains
    collaborators?: number;  // Team member limit
  }>;
}

/**
 * Factory interface for creating deployment adapters
 */
export interface IDeploymentAdapterFactory {
  createAdapter(providerId: string): IDeploymentAdapter | null;
  getSupportedProviders(): string[];
  getProviderCapabilities(providerId: string): IDeploymentAdapter['capabilities'] | null;
}

/**
 * Deployment event types for WebSocket streaming
 */
export type DeploymentEventType = 
  | 'deployment_started'
  | 'deployment_progress'
  | 'deployment_logs'
  | 'deployment_completed'
  | 'deployment_failed'
  | 'deployment_cancelled'
  | 'preview_created'
  | 'preview_destroyed'
  | 'rollback_started'
  | 'rollback_completed';

/**
 * Deployment event structure for real-time updates
 */
export interface DeploymentEvent {
  type: DeploymentEventType;
  deploymentId: string;
  deploymentRunId?: string;
  timestamp: Date;
  data: {
    status?: DeploymentStatus;
    progress?: DeploymentProgress;
    logs?: DeploymentLogEntry[];
    error?: string;
    url?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Webhook payload for provider notifications
 */
export interface DeploymentWebhookPayload {
  providerId: string;
  deploymentId: string;
  event: DeploymentEventType;
  timestamp: Date;
  signature?: string;        // Webhook signature for verification
  data: Record<string, any>; // Provider-specific payload
}
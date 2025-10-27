/**
 * Types for BuildMate Studio Automation System
 */

import type { TaskType } from './modelRouter';

// Automation State Machine States
export type AutomationState = 
  | 'idle'
  | 'planning'
  | 'executing'
  | 'scoring'
  | 'deciding'
  | 'completed'
  | 'failed'
  | 'awaiting-input';

// Decision outcomes
export type Decision = 'continue' | 'retry' | 'request-input' | 'complete' | 'fail';

// Plan structure
export interface Plan {
  id: string;
  prompt: string;
  objectives: string[];
  architecture: {
    techStack: string[];
    structure: Record<string, string[]>;
    dataModels: DataModel[];
  };
  tasks: Task[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface DataModel {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  relationships?: Array<{
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    target: string;
  }>;
}

export interface Task {
  id: string;
  type: TaskType;
  description: string;
  dependencies: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  files?: string[];
  priority: number;
}

// Execution result
export interface ExecutionResult {
  taskId: string;
  success: boolean;
  filesGenerated: GeneratedFile[];
  filesModified: string[];
  errors: ExecutionError[];
  warnings: string[];
  metadata: {
    modelUsed: string;
    tokensUsed: number;
    duration: number;
  };
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  size: number;
}

export interface ExecutionError {
  type: 'syntax' | 'type' | 'runtime' | 'validation';
  message: string;
  file?: string;
  line?: number;
  severity: 'error' | 'warning';
}

// Score structure
export interface Score {
  overall: number; // 0-100
  metrics: {
    testsCoverage: number;
    accessibility: number;
    performance: number;
    security: number;
    codeQuality: number;
  };
  issues: Issue[];
  recommendations: string[];
  timestamp: Date;
}

export interface Issue {
  type: 'test' | 'accessibility' | 'performance' | 'security' | 'quality';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

// Automation context
export interface AutomationContext {
  sessionId: string;
  state: AutomationState;
  plan?: Plan;
  executionResults: ExecutionResult[];
  scores: Score[];
  decisions: DecisionRecord[];
  outputDirectory: string;
  config: AutomationConfig;
}

export interface DecisionRecord {
  timestamp: Date;
  state: AutomationState;
  decision: Decision;
  reasoning: string;
  score?: Score;
  userInput?: string;
}

export interface AutomationConfig {
  maxRetries: number;
  qualityThreshold: number; // 0-100
  enableAccessibility: boolean;
  enablePerformance: boolean;
  enableSecurity: boolean;
  autoApprove: boolean;
  verbose: boolean;
}

// Event types for logging
export type AutomationEvent = 
  | { type: 'state-change'; from: AutomationState; to: AutomationState }
  | { type: 'plan-created'; plan: Plan }
  | { type: 'task-started'; task: Task }
  | { type: 'task-completed'; task: Task; result: ExecutionResult }
  | { type: 'score-calculated'; score: Score }
  | { type: 'decision-made'; decision: Decision; reasoning: string }
  | { type: 'error'; error: Error }
  | { type: 'info'; message: string };

// Logger interface
export interface AutomationLogger {
  log(event: AutomationEvent): void;
  getHistory(): AutomationEvent[];
  clear(): void;
}

// Backend connector types
export type BackendProvider = 'supabase' | 'firebase' | 'aws' | 'netlify' | 'vercel' | 'custom';

export interface BackendConnection {
  provider: BackendProvider;
  apiUrl: string;
  apiKey?: string;
  config: Record<string, any>;
  connected: boolean;
  lastSync?: Date;
}

export interface BackendConnector {
  provider: BackendProvider;
  connect(config: Record<string, any>): Promise<BackendConnection>;
  disconnect(): Promise<void>;
  sync(data: any): Promise<void>;
  test(): Promise<boolean>;
}

// Hosting connector types
export type HostingProvider = 'vercel' | 'netlify' | 'aws' | 'cloudflare' | 'custom';

export interface HostingConnection {
  provider: HostingProvider;
  url?: string;
  deploymentId?: string;
  config: Record<string, any>;
  status: 'pending' | 'building' | 'deployed' | 'failed';
}

export interface HostingConnector {
  provider: HostingProvider;
  deploy(directory: string, config: Record<string, any>): Promise<HostingConnection>;
  getStatus(deploymentId: string): Promise<HostingConnection>;
  rollback(deploymentId: string): Promise<void>;
}

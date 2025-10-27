/**
 * BuildMate Studio Core - Main exports
 * AI-driven no/low-code automation system
 */

// Model Routing
export {
  selectModel,
  getRecommendedModel,
  getModelsForTask,
  registerModel,
  getModelByName,
  explainModelSelection,
  modelRegistry,
  type ModelProvider,
  type TaskType,
  type ModelConfig,
  type ModelSelectionContext,
} from './modelRouter';

// Types
export type {
  AutomationState,
  Decision,
  Plan,
  DataModel,
  Task,
  ExecutionResult,
  GeneratedFile,
  ExecutionError,
  Score,
  Issue,
  AutomationContext,
  DecisionRecord,
  AutomationConfig,
  AutomationEvent,
  AutomationLogger,
  BackendProvider,
  BackendConnection,
  BackendConnector,
  HostingProvider,
  HostingConnection,
  HostingConnector,
} from './types';

// Planner
export {
  createPlan,
  auditRepository,
  type PlannerConfig,
  type RepositoryContext,
} from './planner';

// Executor
export {
  executeTask,
  type ExecutorConfig,
} from './executor';

// Scorer
export {
  scoreResults,
  meetsThresholds,
  generateScoreReport,
  type ScorerConfig,
} from './scorer';

// Decider
export {
  makeDecision,
  getNextState,
  isTerminalState,
  createDecisionRecord,
  explainDecision,
  analyzeHistory,
  suggestNextActions,
  type DecisionContext,
} from './decider';

// Orchestrator
export {
  AutomationOrchestrator,
  runAutomation,
} from './orchestrator';

// Backend Connectors
export {
  SupabaseConnector,
  FirebaseConnector,
  AWSConnector,
  CustomConnector,
  createBackendConnector,
  BackendManager,
} from './backendConnectors';

// Hosting Connectors
export {
  VercelConnector,
  NetlifyConnector,
  AWSHostingConnector,
  CloudflareConnector,
  CustomHostingConnector,
  createHostingConnector,
  HostingManager,
} from './hostingConnectors';

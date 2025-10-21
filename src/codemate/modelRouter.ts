/**
 * Model Router - Intelligent model selection for different tasks
 * Routes tasks to optimal LLM based on task type, context, and model capabilities
 */

export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'xai';

export type TaskType = 
  | 'repo-audit'
  | 'architecture-planning'
  | 'code-scaffold'
  | 'code-implementation'
  | 'code-refactor'
  | 'test-generation'
  | 'documentation'
  | 'quick-fix'
  | 'validation'
  | 'automation-reasoning';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  displayName: string;
  temperature?: number;
  maxTokens?: number;
  capabilities: TaskType[];
  priority: number; // Higher = preferred for its capabilities
  costPerToken?: number;
}

export interface ModelSelectionContext {
  taskType: TaskType;
  complexity?: 'low' | 'medium' | 'high';
  codeSize?: number;
  preferSpeed?: boolean;
  preferQuality?: boolean;
  budget?: 'low' | 'medium' | 'high';
}

// Model Registry - Configure available models
export const modelRegistry: ModelConfig[] = [
  // Claude Sonnet 4.5 - Best for planning and structured reasoning
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4.5',
    displayName: 'Claude Sonnet 4.5',
    temperature: 0.7,
    maxTokens: 8192,
    capabilities: ['repo-audit', 'architecture-planning', 'automation-reasoning', 'validation'],
    priority: 10,
    costPerToken: 0.000003,
  },
  
  // GPT-5 Codex - Tuned for code generation
  {
    provider: 'openai',
    model: 'gpt-5-codex',
    displayName: 'GPT-5 Codex',
    temperature: 0.3,
    maxTokens: 16384,
    capabilities: ['code-scaffold', 'code-implementation', 'code-refactor', 'test-generation'],
    priority: 10,
    costPerToken: 0.000005,
  },
  
  // GPT-5 - General purpose with strong reasoning
  {
    provider: 'openai',
    model: 'gpt-5',
    displayName: 'GPT-5',
    temperature: 0.7,
    maxTokens: 16384,
    capabilities: ['automation-reasoning', 'validation', 'architecture-planning'],
    priority: 9,
    costPerToken: 0.000004,
  },
  
  // Gemini 2.5 Pro - Excellent for documentation
  {
    provider: 'google',
    model: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    temperature: 0.7,
    maxTokens: 8192,
    capabilities: ['documentation', 'validation'],
    priority: 9,
    costPerToken: 0.000002,
  },
  
  // Grok Code Fast 1 - Quick fixes and micro-refactors
  {
    provider: 'xai',
    model: 'grok-code-fast-1',
    displayName: 'Grok Code Fast 1',
    temperature: 0.2,
    maxTokens: 4096,
    capabilities: ['quick-fix', 'code-refactor'],
    priority: 8,
    costPerToken: 0.000001,
  },
  
  // Fallback models (using actual available models as fallback)
  {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    displayName: 'GPT-4 Turbo',
    temperature: 0.7,
    maxTokens: 4096,
    capabilities: ['repo-audit', 'architecture-planning', 'code-implementation', 'validation', 'documentation'],
    priority: 7,
    costPerToken: 0.00001,
  },
  
  {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet',
    temperature: 0.7,
    maxTokens: 8192,
    capabilities: ['repo-audit', 'architecture-planning', 'automation-reasoning', 'validation', 'documentation'],
    priority: 8,
    costPerToken: 0.000003,
  },
];

/**
 * Select the best model for a given task
 */
export function selectModel(context: ModelSelectionContext): ModelConfig {
  // Filter models that support this task type
  const capableModels = modelRegistry.filter(model => 
    model.capabilities.includes(context.taskType)
  );
  
  if (capableModels.length === 0) {
    throw new Error(`No model found for task type: ${context.taskType}`);
  }
  
  // Apply context-based filtering
  let candidates = [...capableModels];
  
  // If speed is preferred, filter out slower models
  if (context.preferSpeed) {
    const fastModels = candidates.filter(m => m.model.includes('fast') || m.model.includes('turbo'));
    if (fastModels.length > 0) {
      candidates = fastModels;
    }
  }
  
  // If quality is preferred, prioritize higher-tier models
  if (context.preferQuality) {
    candidates.sort((a, b) => (b.costPerToken || 0) - (a.costPerToken || 0));
  }
  
  // Budget considerations
  if (context.budget === 'low') {
    candidates.sort((a, b) => (a.costPerToken || 0) - (b.costPerToken || 0));
  }
  
  // Sort by priority (higher is better)
  candidates.sort((a, b) => b.priority - a.priority);
  
  // Return the top candidate
  return candidates[0];
}

/**
 * Get recommended model for a specific task type with defaults
 */
export function getRecommendedModel(taskType: TaskType): ModelConfig {
  return selectModel({ taskType, preferQuality: true });
}

/**
 * Get all available models for a task type
 */
export function getModelsForTask(taskType: TaskType): ModelConfig[] {
  return modelRegistry
    .filter(model => model.capabilities.includes(taskType))
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Add a new model to the registry (for extensibility)
 */
export function registerModel(config: ModelConfig): void {
  modelRegistry.push(config);
}

/**
 * Get model by name
 */
export function getModelByName(modelName: string): ModelConfig | undefined {
  return modelRegistry.find(m => m.model === modelName);
}

/**
 * Format model selection explanation
 */
export function explainModelSelection(context: ModelSelectionContext): string {
  const selected = selectModel(context);
  const alternatives = getModelsForTask(context.taskType)
    .filter(m => m.model !== selected.model)
    .slice(0, 2);
  
  let explanation = `Selected ${selected.displayName} for ${context.taskType}\n`;
  explanation += `Reasoning: ${getSelectionReasoning(selected, context)}\n`;
  
  if (alternatives.length > 0) {
    explanation += `\nAlternatives considered:\n`;
    alternatives.forEach(alt => {
      explanation += `- ${alt.displayName}: ${getSelectionReasoning(alt, context)}\n`;
    });
  }
  
  return explanation;
}

function getSelectionReasoning(model: ModelConfig, context: ModelSelectionContext): string {
  const reasons: string[] = [];
  
  // Task-specific reasoning
  if (context.taskType === 'repo-audit' && model.provider === 'anthropic') {
    reasons.push('excellent structured analysis');
  }
  if (context.taskType === 'code-scaffold' && model.model.includes('codex')) {
    reasons.push('specialized for code generation');
  }
  if (context.taskType === 'quick-fix' && model.model.includes('fast')) {
    reasons.push('optimized for speed');
  }
  if (context.taskType === 'documentation' && model.provider === 'google') {
    reasons.push('clear narrative output');
  }
  
  // Context-based reasoning
  if (context.preferSpeed && model.maxTokens && model.maxTokens < 8192) {
    reasons.push('fast response time');
  }
  if (context.preferQuality && model.priority >= 9) {
    reasons.push('highest quality output');
  }
  if (context.budget === 'low' && model.costPerToken && model.costPerToken < 0.000003) {
    reasons.push('cost-effective');
  }
  
  reasons.push(`priority ${model.priority}/10`);
  
  return reasons.join(', ');
}

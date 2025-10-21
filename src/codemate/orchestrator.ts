/**
 * Automation Orchestrator - Main state machine for Plan → Execute → Score → Decide
 */

import { createPlan, type RepositoryContext, type PlannerConfig } from './planner';
import { executeTask, type ExecutorConfig } from './executor';
import { scoreResults, generateScoreReport, type ScorerConfig } from './scorer';
import { 
  makeDecision, 
  getNextState, 
  isTerminalState, 
  createDecisionRecord,
  explainDecision,
  suggestNextActions 
} from './decider';
import type {
  AutomationContext,
  AutomationConfig,
  AutomationEvent,
  AutomationLogger,
  AutomationState,
  Plan,
  Task,
} from './types';
import { randomUUID } from 'crypto';

const DEFAULT_CONFIG: AutomationConfig = {
  maxRetries: 3,
  qualityThreshold: 70,
  enableAccessibility: true,
  enablePerformance: true,
  enableSecurity: true,
  autoApprove: false,
  verbose: true,
};

/**
 * Simple logger implementation
 */
class SimpleLogger implements AutomationLogger {
  private history: AutomationEvent[] = [];
  
  log(event: AutomationEvent): void {
    this.history.push(event);
    
    if (event.type === 'state-change') {
      console.log(`[Automation] State: ${event.from} → ${event.to}`);
    } else if (event.type === 'decision-made') {
      console.log(`[Automation] Decision: ${event.decision} - ${event.reasoning}`);
    } else if (event.type === 'error') {
      console.error(`[Automation] Error:`, event.error);
    } else if (event.type === 'info') {
      console.log(`[Automation] ${event.message}`);
    }
  }
  
  getHistory(): AutomationEvent[] {
    return [...this.history];
  }
  
  clear(): void {
    this.history = [];
  }
}

/**
 * Main automation orchestrator
 */
export class AutomationOrchestrator {
  private context: AutomationContext;
  private logger: AutomationLogger;
  private retryCount: number = 0;
  
  constructor(
    prompt: string,
    outputDirectory: string,
    config: Partial<AutomationConfig> = {},
    logger?: AutomationLogger
  ) {
    this.logger = logger || new SimpleLogger();
    
    this.context = {
      sessionId: randomUUID(),
      state: 'idle',
      executionResults: [],
      scores: [],
      decisions: [],
      outputDirectory,
      config: { ...DEFAULT_CONFIG, ...config },
    };
    
    this.logger.log({
      type: 'info',
      message: `Automation session started: ${this.context.sessionId}`,
    });
  }
  
  /**
   * Run the automation workflow
   */
  async run(prompt: string, repoContext?: RepositoryContext): Promise<void> {
    try {
      this.transitionState('planning');
      
      // Phase 1: Planning
      const plan = await this.planPhase(prompt, repoContext);
      this.context.plan = plan;
      
      // Main automation loop
      while (!isTerminalState(this.context.state)) {
        switch (this.context.state) {
          case 'executing':
            await this.executePhase();
            break;
          
          case 'scoring':
            await this.scorePhase();
            break;
          
          case 'deciding':
            await this.decidePhase();
            break;
          
          default:
            throw new Error(`Unexpected state: ${this.context.state}`);
        }
      }
      
      // Final state reached
      this.logger.log({
        type: 'info',
        message: `Automation completed with state: ${this.context.state}`,
      });
      
    } catch (error) {
      this.logger.log({
        type: 'error',
        error: error as Error,
      });
      this.transitionState('failed');
      throw error;
    }
  }
  
  /**
   * Planning phase
   */
  private async planPhase(prompt: string, repoContext?: RepositoryContext): Promise<Plan> {
    this.logger.log({
      type: 'info',
      message: 'Starting planning phase...',
    });
    
    const plannerConfig: PlannerConfig = {
      includeDataModels: true,
      includeTests: true,
    };
    
    const plan = await createPlan(prompt, repoContext, plannerConfig);
    
    this.logger.log({
      type: 'plan-created',
      plan,
    });
    
    // Transition to execution
    this.transitionState('executing');
    
    return plan;
  }
  
  /**
   * Execution phase
   */
  private async executePhase(): Promise<void> {
    if (!this.context.plan) {
      throw new Error('No plan available for execution');
    }
    
    this.logger.log({
      type: 'info',
      message: `Executing ${this.context.plan.tasks.length} tasks...`,
    });
    
    const executorConfig: ExecutorConfig = {
      useDesignTokens: true,
      validateOutput: true,
    };
    
    // Execute tasks in priority order
    const sortedTasks = [...this.context.plan.tasks].sort((a, b) => b.priority - a.priority);
    
    for (const task of sortedTasks) {
      // Check dependencies
      if (!this.areDependenciesMet(task)) {
        this.logger.log({
          type: 'info',
          message: `Skipping task ${task.id} - dependencies not met`,
        });
        continue;
      }
      
      this.logger.log({
        type: 'task-started',
        task,
      });
      
      task.status = 'in-progress';
      
      try {
        const result = await executeTask(task, executorConfig);
        
        this.context.executionResults.push(result);
        task.status = result.success ? 'completed' : 'failed';
        
        this.logger.log({
          type: 'task-completed',
          task,
          result,
        });
      } catch (error) {
        task.status = 'failed';
        this.logger.log({
          type: 'error',
          error: error as Error,
        });
      }
    }
    
    // Transition to scoring
    this.transitionState('scoring');
  }
  
  /**
   * Scoring phase
   */
  private async scorePhase(): Promise<void> {
    this.logger.log({
      type: 'info',
      message: 'Evaluating quality...',
    });
    
    const scorerConfig: ScorerConfig = {
      checkAccessibility: this.context.config.enableAccessibility,
      checkPerformance: this.context.config.enablePerformance,
      checkSecurity: this.context.config.enableSecurity,
      checkTests: true,
      checkCodeQuality: true,
      thresholds: {
        overall: this.context.config.qualityThreshold,
      },
    };
    
    const score = await scoreResults(this.context.executionResults, scorerConfig);
    
    this.context.scores.push(score);
    
    this.logger.log({
      type: 'score-calculated',
      score,
    });
    
    if (this.context.config.verbose) {
      console.log('\n' + generateScoreReport(score));
    }
    
    // Transition to deciding
    this.transitionState('deciding');
  }
  
  /**
   * Deciding phase
   */
  private async decidePhase(): Promise<void> {
    const latestScore = this.context.scores[this.context.scores.length - 1];
    
    if (!latestScore) {
      throw new Error('No score available for decision');
    }
    
    const decisionContext = {
      currentState: this.context.state,
      score: latestScore,
      retryCount: this.retryCount,
      config: this.context.config,
      history: this.context.decisions,
    };
    
    const { decision, reasoning } = makeDecision(decisionContext);
    
    this.logger.log({
      type: 'decision-made',
      decision,
      reasoning,
    });
    
    const record = createDecisionRecord(
      this.context.state,
      decision,
      reasoning,
      latestScore
    );
    
    this.context.decisions.push(record);
    
    if (this.context.config.verbose) {
      console.log('\n' + explainDecision(decisionContext));
      
      const actions = suggestNextActions(decision, latestScore);
      if (actions.length > 0) {
        console.log('\n### Suggested Actions:');
        actions.forEach(action => console.log(`- ${action}`));
      }
    }
    
    // Handle decision
    if (decision === 'retry') {
      this.retryCount++;
    }
    
    const nextState = getNextState(this.context.state, decision);
    this.transitionState(nextState);
  }
  
  /**
   * Check if task dependencies are met
   */
  private areDependenciesMet(task: Task): boolean {
    if (!this.context.plan) return false;
    
    return task.dependencies.every(depId => {
      const depTask = this.context.plan!.tasks.find(t => t.id === depId);
      return depTask && depTask.status === 'completed';
    });
  }
  
  /**
   * Transition to a new state
   */
  private transitionState(newState: AutomationState): void {
    const oldState = this.context.state;
    this.context.state = newState;
    
    this.logger.log({
      type: 'state-change',
      from: oldState,
      to: newState,
    });
  }
  
  /**
   * Get current context
   */
  getContext(): AutomationContext {
    return { ...this.context };
  }
  
  /**
   * Get event history
   */
  getHistory(): AutomationEvent[] {
    return this.logger.getHistory();
  }
}

/**
 * Convenience function to run automation
 */
export async function runAutomation(
  prompt: string,
  outputDirectory: string,
  config?: Partial<AutomationConfig>,
  repoContext?: RepositoryContext
): Promise<AutomationContext> {
  const orchestrator = new AutomationOrchestrator(prompt, outputDirectory, config);
  
  await orchestrator.run(prompt, repoContext);
  
  return orchestrator.getContext();
}

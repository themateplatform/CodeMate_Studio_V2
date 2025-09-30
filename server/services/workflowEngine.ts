import { db } from '../db';
import { 
  implementationPlans, 
  planSteps, 
  chatMessages,
  routerAnalysis,
  type ImplementationPlan,
  type PlanStep,
  type InsertImplementationPlan,
  type InsertPlanStep,
  type InsertChatMessage
} from '@shared/schema';
import { eq, and, or, inArray, isNull, sql } from 'drizzle-orm';
import { DynamicIntelligenceRouter } from './dynamicRouter';
import { collaborationService, type CollaborationEvent } from './collaborationService';
import { randomUUID } from 'crypto';

// Workflow and step status types (aligned with planSteps schema)
export type WorkflowStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed' | 'cancelled' | 'blocked';

// Workflow definition types
export interface StepDefinition {
  id: string;
  name: string;
  type: 'requirements' | 'architecture' | 'schema' | 'codegen' | 'assembly' | 'tests' | 'deploy' | 'custom';
  description: string;
  prompt: string;
  dependsOn: string[];
  maxRetries?: number;
  timeoutMs?: number;
  tokenBudget?: number;
  metadata?: Record<string, any>;
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  version: string;
  steps: StepDefinition[];
  globalMaxRetries?: number;
  globalTimeoutMs?: number;
  metadata?: Record<string, any>;
}

// Step execution result
export interface StepExecutionResult {
  stepId: string;
  status: WorkflowStatus;
  output?: string;
  artifacts?: Record<string, any>;
  metrics?: {
    tokensUsed: number;
    responseTime: number;
    modelUsed: string;
  };
  error?: string;
}

// Workflow execution context
export interface WorkflowContext {
  workflowId: string;
  projectId: string;
  userId?: string;
  stepOutputs: Map<string, any>;
  globalContext: Record<string, any>;
}

// Canonical workflow presets
export const WORKFLOW_PRESETS = {
  structureNormalization: {
    name: 'Structure Normalization',
    description: 'Automated project structure normalization and optimization workflow',
    version: '1.0',
    steps: [
      {
        id: 'analyze-structure',
        name: 'Analyze Project Structure',
        type: 'custom' as const,
        description: 'Detect project type and analyze current structure compliance',
        prompt: 'Analyze the project structure and detect framework types...',
        dependsOn: [],
        maxRetries: 2,
        timeoutMs: 60000,
        tokenBudget: 2000
      },
      {
        id: 'generate-plan',
        name: 'Generate Normalization Plan',
        type: 'custom' as const,
        description: 'Create a detailed plan for structure normalization',
        prompt: 'Generate a normalization plan based on detected project type and best practices...',
        dependsOn: ['analyze-structure'],
        maxRetries: 2,
        timeoutMs: 120000,
        tokenBudget: 4000,
        metadata: {
          dryRun: true
        }
      },
      {
        id: 'apply-transformations',
        name: 'Apply Structure Transformations',
        type: 'codegen' as const,
        description: 'Apply codemod transformations to normalize structure',
        prompt: 'Apply the normalization plan transformations to project files...',
        dependsOn: ['generate-plan'],
        maxRetries: 3,
        timeoutMs: 300000,
        tokenBudget: 8000,
        metadata: {
          skipCriticalFiles: true,
          preserveFunctionality: true
        }
      },
      {
        id: 'optimize-dependencies',
        name: 'Optimize Dependencies',
        type: 'custom' as const,
        description: 'Analyze and optimize project dependencies',
        prompt: 'Analyze dependencies and remove unused, deduplicate versions...',
        dependsOn: ['apply-transformations'],
        maxRetries: 2,
        timeoutMs: 180000,
        tokenBudget: 3000,
        metadata: {
          removeUnused: true,
          consolidateVersions: true
        }
      },
      {
        id: 'validate-structure',
        name: 'Validate Normalized Structure',
        type: 'tests' as const,
        description: 'Validate that normalized structure meets compliance standards',
        prompt: 'Validate the normalized project structure and ensure tests pass...',
        dependsOn: ['optimize-dependencies'],
        maxRetries: 2,
        timeoutMs: 120000,
        tokenBudget: 2000,
        metadata: {
          runTests: true,
          checkCompliance: true
        }
      },
      {
        id: 'generate-report',
        name: 'Generate Normalization Report',
        type: 'custom' as const,
        description: 'Create comprehensive normalization report with before/after metrics',
        prompt: 'Generate a detailed report of normalization changes and improvements...',
        dependsOn: ['validate-structure'],
        maxRetries: 1,
        timeoutMs: 60000,
        tokenBudget: 3000
      }
    ],
    globalMaxRetries: 3,
    globalTimeoutMs: 900000,
    metadata: {
      requiresApproval: true,
      createsPR: true,
      defaultDryRun: true
    }
  } as WorkflowDefinition,
  qualityAssurance: {
    name: 'Quality Assurance',
    description: 'Automated quality assurance workflow with test coverage enforcement',
    version: '1.0',
    steps: [
      {
        id: 'run-tests',
        name: 'Run Test Suite',
        type: 'tests' as const,
        description: 'Execute all unit and integration tests',
        prompt: 'Run the complete test suite and report results...',
        dependsOn: [],
        maxRetries: 2,
        timeoutMs: 300000,
        tokenBudget: 1000
      },
      {
        id: 'measure-coverage',
        name: 'Measure Test Coverage',
        type: 'custom' as const,
        description: 'Calculate code coverage metrics',
        prompt: 'Measure test coverage across the entire codebase...',
        dependsOn: ['run-tests'],
        maxRetries: 2,
        timeoutMs: 120000,
        tokenBudget: 1000,
        metadata: {
          threshold: 85,
          reporters: ['text', 'html', 'lcov', 'json']
        }
      },
      {
        id: 'coverage-gate',
        name: 'Coverage Gate Check',
        type: 'custom' as const,
        description: 'Enforce 85% coverage threshold',
        prompt: 'Check if coverage meets the 85% threshold requirement...',
        dependsOn: ['measure-coverage'],
        maxRetries: 1,
        timeoutMs: 30000,
        tokenBudget: 500,
        metadata: {
          threshold: 85,
          enforceMode: 'strict',
          blockOnFailure: true
        }
      },
      {
        id: 'identify-gaps',
        name: 'Identify Coverage Gaps',
        type: 'custom' as const,
        description: 'Find files and functions with low coverage',
        prompt: 'Analyze coverage data to identify gaps and prioritize improvements...',
        dependsOn: ['measure-coverage'],
        maxRetries: 1,
        timeoutMs: 60000,
        tokenBudget: 2000
      },
      {
        id: 'generate-test-stubs',
        name: 'Generate Test Stubs',
        type: 'tests' as const,
        description: 'Create test stubs for uncovered code',
        prompt: 'Generate test stubs for files with coverage below 85%...',
        dependsOn: ['identify-gaps'],
        maxRetries: 2,
        timeoutMs: 180000,
        tokenBudget: 6000,
        metadata: {
          targetCoverage: 85,
          stubTypes: ['unit', 'integration', 'component']
        }
      },
      {
        id: 'quality-report',
        name: 'Generate Quality Report',
        type: 'custom' as const,
        description: 'Create comprehensive quality assurance report',
        prompt: 'Generate a detailed QA report with coverage metrics, trends, and recommendations...',
        dependsOn: ['coverage-gate', 'identify-gaps'],
        maxRetries: 1,
        timeoutMs: 60000,
        tokenBudget: 3000
      }
    ]
  } as WorkflowDefinition,
  supabaseProvisioning: {
    name: 'Supabase Database Provisioning',
    description: 'Automated provisioning workflow for Supabase database setup',
    version: '1.0',
    steps: [
      {
        id: 'validate-credentials',
        name: 'Validate Credentials',
        type: 'custom' as const,
        description: 'Verify Supabase credentials and access',
        prompt: 'Validate the provided Supabase credentials and ensure API access...',
        dependsOn: [],
        maxRetries: 3,
        timeoutMs: 30000,
        tokenBudget: 1000
      },
      {
        id: 'detect-schema',
        name: 'Detect Schema Requirements',
        type: 'schema' as const,
        description: 'Determine optimal schema based on project template',
        prompt: 'Analyze the project template and determine the appropriate database schema...',
        dependsOn: ['validate-credentials'],
        maxRetries: 2,
        tokenBudget: 2000
      },
      {
        id: 'setup-database',
        name: 'Setup Database',
        type: 'custom' as const,
        description: 'Configure database connection and pooling',
        prompt: 'Setup database connection with proper pooling and security settings...',
        dependsOn: ['detect-schema'],
        maxRetries: 3,
        timeoutMs: 60000,
        tokenBudget: 1000
      },
      {
        id: 'apply-migrations',
        name: 'Apply Schema Pack',
        type: 'custom' as const,
        description: 'Apply the selected schema pack to the database',
        prompt: 'Execute the schema migrations for the selected template...',
        dependsOn: ['setup-database'],
        maxRetries: 3,
        timeoutMs: 120000,
        tokenBudget: 1000
      },
      {
        id: 'verify-connection',
        name: 'Verify Connection',
        type: 'tests' as const,
        description: 'Test database connectivity and verify schema',
        prompt: 'Verify the database connection and ensure all tables are correctly created...',
        dependsOn: ['apply-migrations'],
        maxRetries: 2,
        timeoutMs: 30000,
        tokenBudget: 1000
      }
    ]
  } as WorkflowDefinition,
  fullStack: {
    name: 'Full Stack Application',
    description: 'Complete workflow for building a full-stack application',
    version: '1.0',
    steps: [
      {
        id: 'requirements',
        name: 'Requirements Analysis',
        type: 'requirements' as const,
        description: 'Analyze and document project requirements',
        prompt: 'Analyze the following project requirements and create a detailed specification...',
        dependsOn: [],
        maxRetries: 2,
        tokenBudget: 4000
      },
      {
        id: 'architecture',
        name: 'System Architecture',
        type: 'architecture' as const,
        description: 'Design the system architecture',
        prompt: 'Based on the requirements, design a comprehensive system architecture...',
        dependsOn: ['requirements'],
        maxRetries: 2,
        tokenBudget: 6000
      },
      {
        id: 'schema',
        name: 'Data Schema Design',
        type: 'schema' as const,
        description: 'Define database schema and data models',
        prompt: 'Create the database schema and data models for the application...',
        dependsOn: ['architecture'],
        maxRetries: 2,
        tokenBudget: 4000
      },
      {
        id: 'backend-codegen',
        name: 'Backend Code Generation',
        type: 'codegen' as const,
        description: 'Generate backend implementation code',
        prompt: 'Implement the backend services based on the architecture and schema...',
        dependsOn: ['schema'],
        maxRetries: 3,
        tokenBudget: 8000
      },
      {
        id: 'frontend-codegen',
        name: 'Frontend Code Generation',
        type: 'codegen' as const,
        description: 'Generate frontend implementation code',
        prompt: 'Implement the frontend components based on the architecture...',
        dependsOn: ['schema'],
        maxRetries: 3,
        tokenBudget: 8000
      },
      {
        id: 'integration',
        name: 'Integration Assembly',
        type: 'assembly' as const,
        description: 'Integrate frontend and backend components',
        prompt: 'Integrate the frontend and backend components...',
        dependsOn: ['backend-codegen', 'frontend-codegen'],
        maxRetries: 2,
        tokenBudget: 4000
      },
      {
        id: 'tests',
        name: 'Test Suite Generation',
        type: 'tests' as const,
        description: 'Create comprehensive test suite',
        prompt: 'Generate a comprehensive test suite for the application...',
        dependsOn: ['integration'],
        maxRetries: 2,
        tokenBudget: 6000
      },
      {
        id: 'deploy',
        name: 'Deployment Configuration',
        type: 'deploy' as const,
        description: 'Configure deployment and CI/CD',
        prompt: 'Create deployment configuration and CI/CD pipeline...',
        dependsOn: ['tests'],
        maxRetries: 2,
        tokenBudget: 3000
      }
    ]
  } as WorkflowDefinition
};

export class WorkflowEngine {
  private router: DynamicIntelligenceRouter;
  private executionContexts: Map<string, WorkflowContext> = new Map();

  constructor() {
    this.router = new DynamicIntelligenceRouter();
  }

  /**
   * Create a new workflow from definition
   */
  async createWorkflow(
    definition: WorkflowDefinition,
    projectId: string,
    userId?: string,
    initialContext?: Record<string, any>
  ): Promise<ImplementationPlan> {
    // Validate DAG (no cycles)
    this.validateDAG(definition.steps);
    
    // Create implementation plan
    const plan = await db.insert(implementationPlans).values({
      projectId,
      userId: userId || '',  // userId is required in the schema
      prompt: definition.description || '',  // prompt is required
      title: definition.name,
      description: definition.description,
      status: 'pending',
      priority: 'medium',
      estimatedEffort: definition.steps.length * 30,  // Minutes
      metadata: {
        version: definition.version,
        ...definition.metadata
      }
    }).returning();

    const implementationPlan = plan[0];

    // Create plan steps with dependencies
    const stepPromises = definition.steps.map((stepDef, index) => {
      return db.insert(planSteps).values({
        planId: implementationPlan.id,
        stepNumber: index + 1,
        title: stepDef.name,
        description: stepDef.description || '',
        type: stepDef.type,
        status: 'pending',
        dependsOn: stepDef.dependsOn,
        routerAnalysisId: null,
        retries: 0,
        maxRetries: stepDef.maxRetries || 3,
        estimatedMinutes: 30,
        assignedTo: userId,
        startedAt: null,
        finishedAt: null,
        metrics: {},
        artifacts: {},
        metadata: {
          type: stepDef.type,
          prompt: stepDef.prompt,
          tokenBudget: stepDef.tokenBudget,
          timeoutMs: stepDef.timeoutMs,
          stepId: stepDef.id,
          ...stepDef.metadata
        }
      }).returning();
    });

    await Promise.all(stepPromises);

    // Initialize execution context
    const context: WorkflowContext = {
      workflowId: implementationPlan.id,
      projectId,
      userId,
      stepOutputs: new Map(),
      globalContext: initialContext || {}
    };
    this.executionContexts.set(implementationPlan.id, context);

    return implementationPlan;
  }

  /**
   * Start workflow execution
   */
  async start(workflowId: string): Promise<void> {
    const context = this.executionContexts.get(workflowId);
    if (!context) {
      throw new Error(`Workflow context not found: ${workflowId}`);
    }

    // Update plan status to active
    await db.update(implementationPlans)
      .set({ status: 'active' })
      .where(eq(implementationPlans.id, workflowId));

    // Emit start event
    this.emitWorkflowEvent(context, 'workflow_started', {
      workflowId,
      projectId: context.projectId
    });

    // Start execution loop
    await this.tick(workflowId);
  }

  /**
   * Execute one tick of the workflow (process ready steps)
   */
  async tick(workflowId: string): Promise<void> {
    const context = this.executionContexts.get(workflowId);
    if (!context) {
      throw new Error(`Workflow context not found: ${workflowId}`);
    }

    // Get all steps for this workflow
    const allSteps = await db.select()
      .from(planSteps)
      .where(eq(planSteps.planId, workflowId));

    // Find ready steps (queued with all dependencies succeeded)
    const readySteps = this.findReadySteps(allSteps);

    if (readySteps.length === 0) {
      // Check if workflow is complete or blocked
      await this.checkWorkflowCompletion(workflowId, allSteps);
      return;
    }

    // Execute ready steps in parallel
    const executionPromises = readySteps.map(step => 
      this.runStep(context, step).catch(error => {
        console.error(`Step execution failed: ${step.id}`, error);
        return this.handleStepFailure(context, step, error);
      })
    );

    await Promise.all(executionPromises);

    // Continue execution
    setTimeout(() => this.tick(workflowId), 1000);
  }

  /**
   * Execute a single workflow step
   */
  async runStep(context: WorkflowContext, step: PlanStep): Promise<StepExecutionResult> {
    try {
      // Update step status to running
      await db.update(planSteps)
        .set({ 
          status: 'in_progress',
          startedAt: new Date()
        })
        .where(eq(planSteps.id, step.id));

      // Emit step started event
      this.emitWorkflowEvent(context, 'step_started', {
        stepId: step.id,
        stepTitle: step.title
      });

      // Build prompt with context from previous steps
      const prompt = this.buildStepPrompt(context, step);

      // Execute step using dynamic router
      const routerResponse = await this.router.routeRequest({
        content: prompt,
        projectId: context.projectId,
        userId: context.userId,
        context: `Workflow: ${context.workflowId}, Step: ${step.title}`
      });

      // Store step output in context
      context.stepOutputs.set(step.metadata?.stepId || step.id, routerResponse.response);

      // Create chat message for step execution
      await this.createStepChatMessage(context, step, prompt, routerResponse.response);

      // Update step with results
      const metrics = {
        tokensUsed: routerResponse.tokensUsed,
        responseTime: routerResponse.responseTime,
        modelUsed: routerResponse.selectedModel
      };

      const artifacts = {
        output: routerResponse.response,
        analysisId: routerResponse.analysisId,
        timestamp: new Date().toISOString()
      };

      await db.update(planSteps)
        .set({
          status: 'completed',
          finishedAt: new Date(),
          routerAnalysisId: routerResponse.analysisId,
          metrics,
          artifacts
        })
        .where(eq(planSteps.id, step.id));

      // Emit step completed event
      this.emitWorkflowEvent(context, 'step_completed', {
        stepId: step.id,
        stepTitle: step.title,
        metrics
      });

      return {
        stepId: step.id,
        status: 'completed',
        output: routerResponse.response,
        artifacts,
        metrics
      };

    } catch (error) {
      return await this.handleStepFailure(context, step, error as Error);
    }
  }

  /**
   * Handle step failure with retry logic
   */
  private async handleStepFailure(
    context: WorkflowContext,
    step: PlanStep,
    error: Error
  ): Promise<StepExecutionResult> {
    const retries = (step.retries || 0) + 1;
    const maxRetries = step.maxRetries || 3;

    if (retries < maxRetries) {
      // Exponential backoff: 2^retries seconds
      const backoffMs = Math.pow(2, retries) * 1000;

      await db.update(planSteps)
        .set({
          status: 'pending',
          retries,
          metadata: {
            ...step.metadata,
            lastError: error.message,
            nextRetryAt: new Date(Date.now() + backoffMs).toISOString()
          }
        })
        .where(eq(planSteps.id, step.id));

      // Schedule retry
      setTimeout(() => this.tick(context.workflowId), backoffMs);

      this.emitWorkflowEvent(context, 'step_retry_scheduled', {
        stepId: step.id,
        retries,
        nextRetryIn: backoffMs
      });

      return {
        stepId: step.id,
        status: 'queued',
        error: `Retry ${retries}/${maxRetries} scheduled`
      };
    }

    // Max retries exceeded, mark as failed
    await db.update(planSteps)
      .set({
        status: 'failed' as WorkflowStatus,
        finishedAt: new Date(),
        metadata: {
          ...step.metadata,
          finalError: error.message
        }
      })
      .where(eq(planSteps.id, step.id));

    this.emitWorkflowEvent(context, 'step_failed', {
      stepId: step.id,
      stepTitle: step.title,
      error: error.message
    });

    return {
      stepId: step.id,
      status: 'failed',
      error: error.message
    };
  }

  /**
   * Validate DAG for cycles using topological sort
   */
  private validateDAG(steps: StepDefinition[]): void {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Build graph
    for (const step of steps) {
      graph.set(step.id, step.dependsOn);
      inDegree.set(step.id, step.dependsOn.length);
    }

    // Topological sort
    const queue: string[] = [];
    const sorted: string[] = [];

    // Find nodes with no dependencies
    for (const [id, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      // Check all nodes that depend on current
      for (const [id, deps] of graph.entries()) {
        if (deps.includes(current)) {
          const newDegree = inDegree.get(id)! - 1;
          inDegree.set(id, newDegree);
          if (newDegree === 0) {
            queue.push(id);
          }
        }
      }
    }

    if (sorted.length !== steps.length) {
      throw new Error('Workflow contains cycles or invalid dependencies');
    }
  }

  /**
   * Find steps that are ready to execute
   */
  private findReadySteps(steps: PlanStep[]): PlanStep[] {
    const stepMap = new Map(steps.map(s => [(s.metadata as any)?.stepId || s.id, s]));
    const readySteps: PlanStep[] = [];

    for (const step of steps) {
      if (step.status !== 'pending') continue;

      const deps = step.dependsOn || [];
      const allDepsSucceeded = deps.every(depId => {
        const depStep = steps.find(s => ((s.metadata as any)?.stepId || s.id) === depId);
        return depStep?.status === 'completed';
      });

      if (allDepsSucceeded) {
        readySteps.push(step);
      }
    }

    return readySteps;
  }

  /**
   * Check if workflow is complete or blocked
   */
  private async checkWorkflowCompletion(workflowId: string, steps: PlanStep[]): Promise<void> {
    const statuses = steps.map(s => s.status);
    
    if (statuses.every(s => s === 'completed')) {
      // All steps succeeded
      await db.update(implementationPlans)
        .set({ status: 'completed' })
        .where(eq(implementationPlans.id, workflowId));
      
      this.emitWorkflowEvent(this.executionContexts.get(workflowId)!, 'workflow_completed', {
        workflowId
      });
    } else if (statuses.some(s => s === 'failed')) {
      // Some steps failed
      await db.update(implementationPlans)
        .set({ status: 'failed' })
        .where(eq(implementationPlans.id, workflowId));
      
      this.emitWorkflowEvent(this.executionContexts.get(workflowId)!, 'workflow_failed', {
        workflowId,
        failedSteps: steps.filter(s => s.status === 'failed').map(s => s.id)
      });
    } else if (statuses.every(s => s === 'completed' || s === 'blocked')) {
      // Workflow is blocked
      await db.update(implementationPlans)
        .set({ status: 'on_hold' })
        .where(eq(implementationPlans.id, workflowId));
      
      this.emitWorkflowEvent(this.executionContexts.get(workflowId)!, 'workflow_blocked', {
        workflowId,
        blockedSteps: steps.filter(s => s.status === 'blocked').map(s => s.id)
      });
    }
  }

  /**
   * Build step prompt with context
   */
  private buildStepPrompt(context: WorkflowContext, step: PlanStep): string {
    const metadata = step.metadata as any;
    const basePrompt = metadata?.prompt || '';
    const stepId = metadata?.stepId || step.id;
    
    // Add context from dependent steps
    const deps = step.dependsOn || [];
    let contextPrompt = basePrompt;

    if (deps.length > 0) {
      contextPrompt += '\n\n### Context from Previous Steps:\n';
      for (const depId of deps) {
        const depOutput = context.stepOutputs.get(depId);
        if (depOutput) {
          contextPrompt += `\n**${depId}:**\n${depOutput}\n`;
        }
      }
    }

    // Add global context
    if (Object.keys(context.globalContext).length > 0) {
      contextPrompt += '\n\n### Project Context:\n';
      contextPrompt += JSON.stringify(context.globalContext, null, 2);
    }

    return contextPrompt;
  }

  /**
   * Create chat message for step execution
   */
  private async createStepChatMessage(
    context: WorkflowContext,
    step: PlanStep,
    prompt: string,
    response: string
  ): Promise<void> {
    // Create user message (prompt)
    await db.insert(chatMessages).values({
      projectId: context.projectId,
      userId: context.userId,
      role: 'user',
      content: prompt,
      metadata: {
        workflowId: context.workflowId,
        stepId: step.id,
        stepTitle: step.title
      }
    });

    // Create assistant message (response)
    await db.insert(chatMessages).values({
      projectId: context.projectId,
      userId: context.userId,
      role: 'assistant',
      content: response,
      metadata: {
        workflowId: context.workflowId,
        stepId: step.id,
        stepTitle: step.title
      }
    });
  }

  /**
   * Emit workflow event via collaboration service
   */
  private emitWorkflowEvent(context: WorkflowContext, eventType: string, data: any): void {
    const event: CollaborationEvent = {
      type: 'document_update' as any, // Using existing event type
      roomId: `workflow-${context.workflowId}`,
      userId: context.userId || 'system',
      clientId: `workflow-engine`,
      data: {
        eventType,
        ...data
      },
      timestamp: Date.now()
    };

    // Emit workflow event (would broadcast in production)
    // In production, collaborationService would have a public method for this
    console.log('Workflow event:', eventType, data);
  }

  /**
   * Cancel a running workflow
   */
  async cancel(workflowId: string): Promise<void> {
    // Update all running/queued steps to canceled
    await db.update(planSteps)
      .set({ 
        status: 'canceled' as WorkflowStatus,
        finishedAt: new Date()
      })
      .where(
        and(
          eq(planSteps.planId, workflowId),
          or(
            eq(planSteps.status, 'queued' as any),
            eq(planSteps.status, 'running' as any)
          )
        )
      );

    // Update plan status
    await db.update(implementationPlans)
      .set({ status: 'cancelled' })
      .where(eq(implementationPlans.id, workflowId));

    const context = this.executionContexts.get(workflowId);
    if (context) {
      this.emitWorkflowEvent(context, 'workflow_canceled', { workflowId });
    }

    // Clean up context
    this.executionContexts.delete(workflowId);
  }

  /**
   * Get workflow status with all steps
   */
  async getStatus(workflowId: string): Promise<{
    plan: ImplementationPlan;
    steps: PlanStep[];
    context?: WorkflowContext;
  }> {
    const [plan] = await db.select()
      .from(implementationPlans)
      .where(eq(implementationPlans.id, workflowId));

    if (!plan) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const steps = await db.select()
      .from(planSteps)
      .where(eq(planSteps.planId, workflowId));

    return {
      plan,
      steps,
      context: this.executionContexts.get(workflowId)
    };
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();
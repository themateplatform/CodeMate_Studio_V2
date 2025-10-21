/**
 * Tests for CodeMate Studio Core Modules
 */

import { describe, it, expect } from 'vitest';
import { selectModel, getRecommendedModel, getModelsForTask } from '../src/codemate/modelRouter';
import { createPlan } from '../src/codemate/planner';
import { meetsThresholds } from '../src/codemate/scorer';
import { makeDecision, getNextState, isTerminalState } from '../src/codemate/decider';
import type { Score, DecisionContext, AutomationState } from '../src/codemate/types';

describe('Model Router', () => {
  it('should select appropriate model for code implementation', () => {
    const model = selectModel({ taskType: 'code-implementation' });
    expect(model).toBeDefined();
    expect(model.capabilities).toContain('code-implementation');
  });

  it('should get recommended model for documentation', () => {
    const model = getRecommendedModel('documentation');
    expect(model).toBeDefined();
    expect(model.capabilities).toContain('documentation');
  });

  it('should list all models for a task type', () => {
    const models = getModelsForTask('architecture-planning');
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].capabilities).toContain('architecture-planning');
  });

  it('should prioritize speed when requested', () => {
    const model = selectModel({ 
      taskType: 'code-refactor',
      preferSpeed: true 
    });
    expect(model).toBeDefined();
  });

  it('should prioritize quality when requested', () => {
    const model = selectModel({ 
      taskType: 'architecture-planning',
      preferQuality: true 
    });
    expect(model).toBeDefined();
  });
});

describe('Planner', () => {
  it('should create a plan from a simple prompt', async () => {
    const plan = await createPlan('Create a blog with posts');
    
    expect(plan).toBeDefined();
    expect(plan.id).toBeDefined();
    expect(plan.prompt).toBe('Create a blog with posts');
    expect(plan.objectives.length).toBeGreaterThan(0);
    expect(plan.architecture).toBeDefined();
    expect(plan.tasks.length).toBeGreaterThan(0);
  });

  it('should extract blog-related objectives', async () => {
    const plan = await createPlan('Create a blog with articles and comments');
    
    const blogObjective = plan.objectives.find(obj => 
      obj.toLowerCase().includes('blog') || obj.toLowerCase().includes('article')
    );
    expect(blogObjective).toBeDefined();
  });

  it('should include accessibility in objectives', async () => {
    const plan = await createPlan('Create a dashboard');
    
    const a11yObjective = plan.objectives.find(obj => 
      obj.toLowerCase().includes('accessibility')
    );
    expect(a11yObjective).toBeDefined();
  });

  it('should generate appropriate tech stack', async () => {
    const plan = await createPlan('Create a web app with authentication');
    
    expect(plan.architecture.techStack).toContain('React 18');
    expect(plan.architecture.techStack).toContain('TypeScript');
    expect(plan.architecture.techStack).toContain('Tailwind CSS');
  });

  it('should estimate complexity correctly', async () => {
    const simplePlan = await createPlan('Create a landing page');
    const complexPlan = await createPlan('Create a blog with auth, comments, search, admin dashboard, analytics');
    
    expect(['low', 'medium', 'high']).toContain(simplePlan.estimatedComplexity);
    expect(['low', 'medium', 'high']).toContain(complexPlan.estimatedComplexity);
  });
});

describe('Scorer', () => {
  it('should pass thresholds when score is high', () => {
    const score: Score = {
      overall: 85,
      metrics: {
        testsCoverage: 80,
        accessibility: 90,
        performance: 85,
        security: 95,
        codeQuality: 85,
      },
      issues: [],
      recommendations: [],
      timestamp: new Date(),
    };

    const result = meetsThresholds(score, {
      thresholds: {
        overall: 70,
        testsCoverage: 60,
        accessibility: 80,
        performance: 70,
        security: 90,
        codeQuality: 70,
      },
    });

    expect(result).toBe(true);
  });

  it('should fail thresholds when security is low', () => {
    const score: Score = {
      overall: 75,
      metrics: {
        testsCoverage: 80,
        accessibility: 90,
        performance: 85,
        security: 60, // Below threshold
        codeQuality: 85,
      },
      issues: [],
      recommendations: [],
      timestamp: new Date(),
    };

    const result = meetsThresholds(score, {
      thresholds: {
        overall: 70,
        testsCoverage: 60,
        accessibility: 80,
        performance: 70,
        security: 90,
        codeQuality: 70,
      },
    });

    expect(result).toBe(false);
  });
});

describe('Decider', () => {
  it('should decide to continue when score is good', () => {
    const context: DecisionContext = {
      currentState: 'scoring' as AutomationState,
      score: {
        overall: 85,
        metrics: {
          testsCoverage: 80,
          accessibility: 90,
          performance: 85,
          security: 95,
          codeQuality: 85,
        },
        issues: [],
        recommendations: [],
        timestamp: new Date(),
      },
      retryCount: 0,
      config: {
        maxRetries: 3,
        qualityThreshold: 70,
        enableAccessibility: true,
        enablePerformance: true,
        enableSecurity: true,
        autoApprove: true,
        verbose: false,
      },
      history: [],
    };

    const { decision } = makeDecision(context);
    expect(decision).toBe('complete');
  });

  it('should decide to retry when score is low', () => {
    const context: DecisionContext = {
      currentState: 'scoring' as AutomationState,
      score: {
        overall: 50,
        metrics: {
          testsCoverage: 40,
          accessibility: 60,
          performance: 50,
          security: 70,
          codeQuality: 50,
        },
        issues: [],
        recommendations: [],
        timestamp: new Date(),
      },
      retryCount: 0,
      config: {
        maxRetries: 3,
        qualityThreshold: 70,
        enableAccessibility: true,
        enablePerformance: true,
        enableSecurity: true,
        autoApprove: false,
        verbose: false,
      },
      history: [],
    };

    const { decision } = makeDecision(context);
    expect(decision).toBe('retry');
  });

  it('should decide to fail when max retries exceeded', () => {
    const context: DecisionContext = {
      currentState: 'scoring' as AutomationState,
      score: {
        overall: 50,
        metrics: {
          testsCoverage: 40,
          accessibility: 60,
          performance: 50,
          security: 70,
          codeQuality: 50,
        },
        issues: [],
        recommendations: [],
        timestamp: new Date(),
      },
      retryCount: 3,
      config: {
        maxRetries: 3,
        qualityThreshold: 70,
        enableAccessibility: true,
        enablePerformance: true,
        enableSecurity: true,
        autoApprove: false,
        verbose: false,
      },
      history: [],
    };

    const { decision } = makeDecision(context);
    expect(decision).toBe('fail');
  });

  it('should get next state correctly', () => {
    expect(getNextState('idle', 'continue')).toBe('planning');
    expect(getNextState('planning', 'continue')).toBe('executing');
    expect(getNextState('executing', 'continue')).toBe('scoring');
    expect(getNextState('scoring', 'continue')).toBe('deciding');
  });

  it('should identify terminal states', () => {
    expect(isTerminalState('completed')).toBe(true);
    expect(isTerminalState('failed')).toBe(true);
    expect(isTerminalState('awaiting-input')).toBe(true);
    expect(isTerminalState('planning')).toBe(false);
    expect(isTerminalState('executing')).toBe(false);
  });
});

describe('Design Tokens', () => {
  it('should have primary colors defined', async () => {
    const { designTokens } = await import('../src/styles/tokens');
    
    expect(designTokens.colors.primary).toBeDefined();
    expect(designTokens.colors.primary[500]).toBeDefined();
  });

  it('should have spacing scale defined', async () => {
    const { designTokens } = await import('../src/styles/tokens');
    
    expect(designTokens.spacing.md).toBeDefined();
    expect(designTokens.spacing.lg).toBeDefined();
  });

  it('should have typography settings defined', async () => {
    const { designTokens } = await import('../src/styles/tokens');
    
    expect(designTokens.typography.fontFamily.sans).toBeDefined();
    expect(designTokens.typography.fontSize.base).toBeDefined();
  });
});

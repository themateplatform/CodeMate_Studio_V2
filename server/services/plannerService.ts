import { openaiService } from "./openaiService";
import { 
  type InsertImplementationPlan, 
  type InsertPlanStep, 
  type ImplementationPlan,
  type PlanStep
} from "@shared/schema";

export interface PlanGenerationRequest {
  prompt: string;
  projectId: string;
  userId: string;
  context?: {
    existingFiles?: Array<{ path: string; content: string }>;
    techStack?: string[];
    requirements?: Record<string, any>;
    dependencies?: string[];
  };
}

export interface GeneratedPlan {
  title: string;
  description: string;
  steps: Array<{
    title: string;
    description: string;
    type: 'create_file' | 'modify_file' | 'delete_file' | 'create_test' | 'run_command';
    filePath?: string;
    expectedChanges: string;
    estimatedMinutes: number;
    dependencies: string[];
    aiInstructions: Record<string, any>;
    validationCriteria: string[];
  }>;
  estimatedEffort: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dependencies: string[];
  tags: string[];
  metadata: Record<string, any>;
}

class PlannerService {

  /**
   * Generate a comprehensive implementation plan from a user prompt
   */
  async generatePlan(request: PlanGenerationRequest): Promise<GeneratedPlan> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(request);

      const response = await openaiService.openaiChat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ], undefined, {
        responseFormat: { type: "json_object" }
      });

      if (!response.success) {
        throw new Error(`Failed to generate plan: ${response.error}`);
      }

      const planData = JSON.parse(response.data.choices[0].message.content);
      return this.validateAndProcessPlan(planData);

    } catch (error) {
      console.error('Plan generation error:', error);
      throw new Error(`Failed to generate implementation plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Break down a complex task into smaller, actionable steps
   */
  async breakdownTask(description: string, context?: Record<string, any>): Promise<PlanStep[]> {
    try {
      const prompt = `Break down this development task into specific, actionable steps:
      
Task: ${description}
Context: ${context ? JSON.stringify(context) : 'None provided'}

Generate a detailed step-by-step breakdown with:
1. Clear, specific titles for each step
2. Detailed descriptions of what needs to be done
3. File paths that will be affected
4. Type of operation (create_file, modify_file, delete_file, create_test, run_command)
5. Dependencies between steps
6. Time estimates in minutes
7. Validation criteria for each step

Respond with JSON in this format:
{
  "steps": [
    {
      "title": "Step title",
      "description": "Detailed description",
      "type": "create_file|modify_file|delete_file|create_test|run_command",
      "filePath": "path/to/file.ext",
      "expectedChanges": "What will change",
      "estimatedMinutes": 15,
      "dependencies": ["step-id-1", "step-id-2"],
      "aiInstructions": { "detailed": "instructions" },
      "validationCriteria": ["how to validate completion"]
    }
  ]
}`;

      const response = await openaiService.openaiChat([
        { role: "user", content: prompt }
      ], undefined, {
        responseFormat: { type: "json_object" }
      });

      if (!response.success) {
        throw new Error(`Failed to breakdown task: ${response.error}`);
      }

      return JSON.parse(response.data.choices[0].message.content).steps;

    } catch (error) {
      console.error('Task breakdown error:', error);
      throw new Error(`Failed to breakdown task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze dependencies between plan steps
   */
  analyzeDependencies(steps: PlanStep[]): Map<string, string[]> {
    const dependencyMap = new Map<string, string[]>();
    
    steps.forEach(step => {
      const dependencies: string[] = [];
      
      steps.forEach(otherStep => {
        if (step.id !== otherStep.id) {
          // Check file dependencies
          if (step.filePath && otherStep.filePath) {
            if (step.type === 'modify_file' && otherStep.type === 'create_file' && 
                step.filePath === otherStep.filePath) {
              dependencies.push(otherStep.id);
            }
          }
          
          // Check explicit dependencies
          if (step.dependencies && Array.isArray(step.dependencies)) {
            if (step.dependencies.includes(otherStep.id)) {
              dependencies.push(otherStep.id);
            }
          }
        }
      });
      
      dependencyMap.set(step.id, dependencies);
    });
    
    return dependencyMap;
  }

  /**
   * Estimate total effort for a plan
   */
  estimateEffort(steps: PlanStep[]): number {
    const baseTime = steps.reduce((total, step) => {
      return total + (step.estimatedMinutes || 0);
    }, 0);

    // Add complexity multipliers
    const complexityFactors = {
      create_file: 1.0,
      modify_file: 1.2,
      delete_file: 0.8,
      create_test: 1.5,
      run_command: 0.5
    };

    const adjustedTime = steps.reduce((total, step) => {
      const factor = complexityFactors[step.type as keyof typeof complexityFactors] || 1.0;
      return total + ((step.estimatedMinutes || 0) * factor);
    }, 0);

    // Add overhead for coordination and testing
    return Math.ceil(adjustedTime * 1.15);
  }

  /**
   * Validate plan completeness and feasibility
   */
  async validatePlan(plan: GeneratedPlan): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check for missing required fields
    if (!plan.title || plan.title.trim().length === 0) {
      issues.push("Plan title is required");
    }

    if (!plan.steps || plan.steps.length === 0) {
      issues.push("Plan must have at least one step");
    }

    // Validate steps
    plan.steps.forEach((step, index) => {
      if (!step.title) {
        issues.push(`Step ${index + 1} is missing a title`);
      }
      if (!step.type) {
        issues.push(`Step ${index + 1} is missing a type`);
      }
      if (step.estimatedMinutes <= 0) {
        issues.push(`Step ${index + 1} has invalid time estimate`);
      }
    });

    // Check for circular dependencies
    const dependencyMap = this.analyzeDependencies(plan.steps as any);
    const circularDeps = this.detectCircularDependencies(dependencyMap);
    if (circularDeps.length > 0) {
      issues.push(`Circular dependencies detected: ${circularDeps.join(', ')}`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Generate contextual insights and recommendations
   */
  async generateInsights(plan: GeneratedPlan, projectContext?: Record<string, any>): Promise<Record<string, any>> {
    const insights = {
      complexity: this.assessComplexity(plan),
      risks: this.identifyRisks(plan),
      optimizations: await this.suggestOptimizations(plan),
      timeline: this.generateTimeline(plan),
      resources: this.identifyRequiredResources(plan)
    };

    return insights;
  }

  // Private helper methods

  private buildSystemPrompt(): string {
    return `You are an expert software architect and project planner. Generate comprehensive, actionable implementation plans for development tasks.

Your plans should be:
- Technically accurate and implementable
- Broken down into clear, specific steps
- Include proper dependency analysis
- Provide realistic time estimates
- Consider testing and validation
- Follow modern development best practices

Always respond with valid JSON in the exact format specified.`;
  }

  private buildUserPrompt(request: PlanGenerationRequest): string {
    const contextStr = request.context ? `
Project Context:
- Existing files: ${request.context.existingFiles?.length || 0} files
- Tech stack: ${request.context.techStack?.join(', ') || 'Not specified'}
- Requirements: ${JSON.stringify(request.context.requirements || {})}
- Dependencies: ${request.context.dependencies?.join(', ') || 'None'}
` : '';

    return `Generate a detailed implementation plan for this request:

"${request.prompt}"

Project ID: ${request.projectId}
${contextStr}

Respond with JSON in this exact format:
{
  "title": "Plan title describing what will be built",
  "description": "Comprehensive description of the plan",
  "steps": [
    {
      "title": "Step title",
      "description": "Detailed description of what this step accomplishes",
      "type": "create_file|modify_file|delete_file|create_test|run_command",
      "filePath": "path/to/affected/file.ext",
      "expectedChanges": "Description of what will change",
      "estimatedMinutes": 30,
      "dependencies": [],
      "aiInstructions": {
        "detailed": "step-by-step instructions",
        "codePatterns": "patterns to follow",
        "considerations": "important considerations"
      },
      "validationCriteria": ["how to validate this step is complete"]
    }
  ],
  "estimatedEffort": 120,
  "priority": "medium",
  "dependencies": [],
  "tags": ["feature", "frontend", "backend"],
  "metadata": {
    "complexity": "medium",
    "riskLevel": "low",
    "requiredSkills": ["react", "typescript"]
  }
}`;
  }

  private validateAndProcessPlan(planData: any): GeneratedPlan {
    // Validate required fields
    if (!planData.title || !planData.steps || !Array.isArray(planData.steps)) {
      throw new Error('Invalid plan format: missing required fields');
    }

    // Process and validate steps
    const processedSteps = planData.steps.map((step: any, index: number) => {
      return {
        title: step.title || `Step ${index + 1}`,
        description: step.description || '',
        type: step.type || 'modify_file',
        filePath: step.filePath || null,
        expectedChanges: step.expectedChanges || '',
        estimatedMinutes: Math.max(5, step.estimatedMinutes || 15),
        dependencies: Array.isArray(step.dependencies) ? step.dependencies : [],
        aiInstructions: step.aiInstructions || {},
        validationCriteria: Array.isArray(step.validationCriteria) ? step.validationCriteria : []
      };
    });

    return {
      title: planData.title,
      description: planData.description || '',
      steps: processedSteps,
      estimatedEffort: planData.estimatedEffort || this.estimateEffort(processedSteps as any),
      priority: planData.priority || 'medium',
      dependencies: Array.isArray(planData.dependencies) ? planData.dependencies : [],
      tags: Array.isArray(planData.tags) ? planData.tags : [],
      metadata: planData.metadata || {}
    };
  }

  private detectCircularDependencies(dependencyMap: Map<string, string[]>): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circular: string[] = [];

    const dfs = (stepId: string): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);

      const dependencies = dependencyMap.get(stepId) || [];
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          if (dfs(dep)) {
            return true;
          }
        } else if (recursionStack.has(dep)) {
          circular.push(`${stepId} -> ${dep}`);
          return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const stepId of Array.from(dependencyMap.keys())) {
      if (!visited.has(stepId)) {
        dfs(stepId);
      }
    }

    return circular;
  }

  private assessComplexity(plan: GeneratedPlan): 'low' | 'medium' | 'high' {
    const factors = {
      stepCount: plan.steps.length,
      totalTime: plan.estimatedEffort,
      dependencyCount: plan.steps.reduce((count, step) => count + step.dependencies.length, 0),
      fileModifications: plan.steps.filter(s => s.type === 'modify_file').length,
      newFiles: plan.steps.filter(s => s.type === 'create_file').length
    };

    const score = (
      factors.stepCount * 0.2 +
      (factors.totalTime / 60) * 0.3 +
      factors.dependencyCount * 0.2 +
      factors.fileModifications * 0.2 +
      factors.newFiles * 0.1
    );

    if (score < 5) return 'low';
    if (score < 15) return 'medium';
    return 'high';
  }

  private identifyRisks(plan: GeneratedPlan): string[] {
    const risks: string[] = [];

    // Check for high-risk operations
    const deleteOperations = plan.steps.filter(s => s.type === 'delete_file');
    if (deleteOperations.length > 0) {
      risks.push(`File deletion operations detected (${deleteOperations.length} files)`);
    }

    // Check for complex dependencies
    const complexSteps = plan.steps.filter(s => s.dependencies.length > 3);
    if (complexSteps.length > 0) {
      risks.push(`Steps with complex dependencies detected`);
    }

    // Check for large time estimates
    const longSteps = plan.steps.filter(s => s.estimatedMinutes > 120);
    if (longSteps.length > 0) {
      risks.push(`Steps with long duration detected (${longSteps.length} steps > 2 hours)`);
    }

    return risks;
  }

  private async suggestOptimizations(plan: GeneratedPlan): Promise<string[]> {
    const optimizations: string[] = [];

    // Identify parallelizable steps
    const independentSteps = plan.steps.filter(s => s.dependencies.length === 0);
    if (independentSteps.length > 1) {
      optimizations.push(`${independentSteps.length} steps can be executed in parallel`);
    }

    // Identify redundant operations
    const filePaths = plan.steps.map(s => s.filePath).filter(Boolean);
    const duplicates = filePaths.filter((item, index) => filePaths.indexOf(item) !== index);
    if (duplicates.length > 0) {
      optimizations.push(`Consider consolidating operations on ${duplicates.length} files`);
    }

    return optimizations;
  }

  private generateTimeline(plan: GeneratedPlan): Record<string, any> {
    const dependencyMap = this.analyzeDependencies(plan.steps as any);
    const levels = this.calculateExecutionLevels(dependencyMap);
    
    let currentTime = 0;
    const timeline: Record<string, any> = {};

    levels.forEach((stepIds, level) => {
      const levelSteps = plan.steps.filter(s => stepIds.includes((s as any).id));
      const maxTime = Math.max(...levelSteps.map(s => s.estimatedMinutes));
      
      timeline[`level_${level}`] = {
        steps: stepIds,
        startTime: currentTime,
        duration: maxTime,
        endTime: currentTime + maxTime
      };
      
      currentTime += maxTime;
    });

    return timeline;
  }

  private calculateExecutionLevels(dependencyMap: Map<string, string[]>): Map<number, string[]> {
    const levels = new Map<number, string[]>();
    const stepLevels = new Map<string, number>();

    const calculateLevel = (stepId: string): number => {
      if (stepLevels.has(stepId)) {
        return stepLevels.get(stepId)!;
      }

      const dependencies = dependencyMap.get(stepId) || [];
      if (dependencies.length === 0) {
        stepLevels.set(stepId, 0);
        return 0;
      }

      const maxDepLevel = Math.max(...dependencies.map(dep => calculateLevel(dep)));
      const level = maxDepLevel + 1;
      stepLevels.set(stepId, level);
      return level;
    };

    // Calculate levels for all steps
    for (const stepId of Array.from(dependencyMap.keys())) {
      const level = calculateLevel(stepId);
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(stepId);
    }

    return levels;
  }

  private identifyRequiredResources(plan: GeneratedPlan): string[] {
    const resources = new Set<string>();

    // Identify file types and technologies
    plan.steps.forEach(step => {
      if (step.filePath) {
        const extension = step.filePath.split('.').pop()?.toLowerCase();
        switch (extension) {
          case 'tsx':
          case 'ts':
            resources.add('TypeScript');
            resources.add('React');
            break;
          case 'js':
          case 'jsx':
            resources.add('JavaScript');
            resources.add('React');
            break;
          case 'css':
          case 'scss':
            resources.add('CSS/SCSS');
            break;
          case 'json':
            resources.add('Configuration');
            break;
        }
      }

      // Check AI instructions for technology hints
      if (step.aiInstructions && typeof step.aiInstructions === 'object') {
        const instructions = JSON.stringify(step.aiInstructions).toLowerCase();
        if (instructions.includes('database')) resources.add('Database');
        if (instructions.includes('api')) resources.add('API');
        if (instructions.includes('test')) resources.add('Testing Framework');
      }
    });

    return Array.from(resources);
  }
}

export const plannerService = new PlannerService();
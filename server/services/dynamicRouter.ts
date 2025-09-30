import { db } from '../db';
import { routerAnalysis, modelPerformance, chatMessages } from '@shared/schema';
import { eq, and, avg, count, desc } from 'drizzle-orm';
import { openaiService } from './openaiService';

interface ComplexityAnalysis {
  score: number; // 1-10 scale
  reasoning: string;
  workflowStep?: string;
  suggestedModel: string;
  tokenBudget: number;
}

interface RouterRequest {
  content: string;
  projectId: string;
  userId?: string;
  context?: string;
  previousMessages?: Array<{ role: string; content: string }>;
}

interface RouterResponse {
  selectedModel: string;
  analysisId: string;
  response: string;
  tokensUsed: number;
  responseTime: number;
  workflowStep?: string;
  escalated?: boolean;
}

export class DynamicIntelligenceRouter {
  private openaiService: typeof openaiService;
  private readonly GPT_5_MODEL = "gpt-5"; // When available
  private readonly GPT_4O_MODEL = "gpt-4o";
  private readonly GPT_4O_MINI_MODEL = "gpt-4o-mini";
  
  // Complexity thresholds for model selection
  private readonly COMPLEXITY_THRESHOLDS = {
    SIMPLE: 3,    // 1-3: GPT-4o-mini
    MEDIUM: 6,    // 4-6: GPT-4o  
    COMPLEX: 10   // 7-10: GPT-5
  };

  constructor() {
    this.openaiService = openaiService;
  }

  /**
   * Main router entry point - analyzes and routes requests
   */
  async routeRequest(request: RouterRequest): Promise<RouterResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Analyze request complexity using GPT-5 (or GPT-4o as fallback)
      const complexityAnalysis = await this.analyzeComplexity(request);
      
      // 2. Create router analysis record
      const [analysis] = await db.insert(routerAnalysis).values({
        projectId: request.projectId,
        userId: request.userId,
        requestContent: request.content,
        complexityScore: complexityAnalysis.score,
        complexityReasoning: complexityAnalysis.reasoning,
        selectedModel: complexityAnalysis.suggestedModel,
        tokenBudget: complexityAnalysis.tokenBudget,
        workflowStep: complexityAnalysis.workflowStep,
        routerVersion: "1.0",
        metadata: {
          context: request.context,
          analysisTimestamp: new Date().toISOString()
        }
      }).returning();

      // 3. Execute request with selected model
      const response = await this.executeWithModel(
        request, 
        complexityAnalysis.suggestedModel, 
        complexityAnalysis.tokenBudget
      );

      const responseTime = Date.now() - startTime;

      // 4. Update analysis with results
      await db.update(routerAnalysis)
        .set({
          tokenUsed: response.tokensUsed,
          responseTime,
          success: true
        })
        .where(eq(routerAnalysis.id, analysis.id));

      // 5. Update model performance metrics
      await this.updateModelPerformance(
        complexityAnalysis.suggestedModel,
        complexityAnalysis.score,
        responseTime,
        response.tokensUsed,
        true
      );

      return {
        selectedModel: complexityAnalysis.suggestedModel,
        analysisId: analysis.id,
        response: response.content,
        tokensUsed: response.tokensUsed,
        responseTime,
        workflowStep: complexityAnalysis.workflowStep
      };

    } catch (error) {
      console.error('Router error:', error);
      
      // Try fallback model on failure
      return await this.handleFailureEscalation(request, error as Error, startTime);
    }
  }

  /**
   * Analyze request complexity using GPT-5 for routing decisions
   */
  private async analyzeComplexity(request: RouterRequest): Promise<ComplexityAnalysis> {
    const systemPrompt = `You are the Dynamic Intelligence Router for Codemate - an advanced AI development system.

Analyze the user's request and determine:
1. Complexity score (1-10 scale)
2. Reasoning for the score
3. Appropriate workflow step (if applicable)
4. Recommended model based on complexity

Complexity Guidelines:
- 1-3 (Simple): Basic questions, simple code fixes, documentation
- 4-6 (Medium): Feature implementation, debugging, moderate refactoring  
- 7-10 (Complex): Architecture design, complex systems, full project builds

Workflow Steps:
- requirements: Requirements analysis and planning
- architecture: System architecture and design
- schema: Database schema and data modeling
- codegen: Code generation and implementation
- assembly: Code integration and assembly
- tests: Testing and quality assurance
- deploy: Deployment and release

Model Selection:
- 1-3: gpt-4o-mini (fast, cost-effective)
- 4-6: gpt-4o (balanced performance)
- 7-10: gpt-5 (maximum capability)

Respond with JSON:
{
  "score": 5,
  "reasoning": "This request involves...",
  "workflowStep": "codegen",
  "suggestedModel": "gpt-4o",
  "tokenBudget": 2000
}`;

    const userPrompt = `Request: ${request.content}

${request.context ? `Context: ${request.context}` : ''}

${request.previousMessages?.length ? `Previous conversation context:
${request.previousMessages.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}` : ''}`;

    try {
      // Use GPT-5 for complexity analysis (fallback to GPT-4o)
      const response = await this.openaiService.openaiChat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ], this.GPT_5_MODEL, {
        responseFormat: { type: "json_object" },
        maxTokens: 1000
      });

      if (!response.success) {
        throw new Error(`Complexity analysis failed: ${response.error}`);
      }

      const analysis = JSON.parse(response.data.choices[0].message.content || '{}');
      
      // Validate and sanitize the analysis
      return {
        score: Math.max(1, Math.min(10, analysis.score || 5)),
        reasoning: analysis.reasoning || 'Complexity analysis performed',
        workflowStep: analysis.workflowStep,
        suggestedModel: this.selectModelByComplexity(analysis.score || 5),
        tokenBudget: analysis.tokenBudget || this.calculateTokenBudget(analysis.score || 5)
      };

    } catch (error) {
      console.error('Complexity analysis error:', error);
      
      // Fallback: Use heuristic analysis
      return this.heuristicComplexityAnalysis(request);
    }
  }

  /**
   * Execute request with the selected model
   */
  private async executeWithModel(
    request: RouterRequest, 
    model: string, 
    tokenBudget: number
  ): Promise<{ content: string; tokensUsed: number }> {
    
    const systemPrompt = `You are an expert AI development assistant in the Codemate system. 
Provide helpful, accurate, and actionable responses for software development tasks.
Be concise but thorough in your explanations.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(request.previousMessages || []),
      { role: "user", content: request.content }
    ];

    const response = await this.openaiService.openaiChat(messages, model, {
      maxTokens: tokenBudget,
      temperature: 0.7
    });

    if (!response.success) {
      throw new Error(`Model execution failed: ${response.error}`);
    }

    return {
      content: response.data.choices[0].message.content || 'No response generated',
      tokensUsed: response.tokens || 0
    };
  }

  /**
   * Handle failures with auto-escalation
   */
  private async handleFailureEscalation(
    request: RouterRequest, 
    error: Error, 
    startTime: number
  ): Promise<RouterResponse> {
    console.warn('Escalating due to failure:', error.message);

    try {
      // Create failure analysis record
      const [analysis] = await db.insert(routerAnalysis).values({
        projectId: request.projectId,
        userId: request.userId,
        requestContent: request.content,
        complexityScore: 8, // Assume complex for escalation
        complexityReasoning: `Escalated due to failure: ${error.message}`,
        selectedModel: this.GPT_4O_MODEL, // Fallback to reliable model
        escalationTrigger: 'error',
        tokenBudget: 4000,
        success: false,
        errorMessage: error.message,
        routerVersion: "1.0"
      }).returning();

      // Try with fallback model
      const response = await this.executeWithModel(
        request, 
        this.GPT_4O_MODEL, 
        4000
      );

      const responseTime = Date.now() - startTime;

      // Update analysis with successful recovery
      await db.update(routerAnalysis)
        .set({
          tokenUsed: response.tokensUsed,
          responseTime,
          success: true
        })
        .where(eq(routerAnalysis.id, analysis.id));

      return {
        selectedModel: this.GPT_4O_MODEL,
        analysisId: analysis.id,
        response: response.content,
        tokensUsed: response.tokensUsed,
        responseTime,
        escalated: true
      };

    } catch (escalationError) {
      console.error('Escalation also failed:', escalationError);
      throw new Error(`Both primary and fallback models failed: ${error.message}`);
    }
  }

  /**
   * Select model based on complexity score
   */
  private selectModelByComplexity(score: number): string {
    if (score <= this.COMPLEXITY_THRESHOLDS.SIMPLE) {
      return this.GPT_4O_MINI_MODEL;
    } else if (score <= this.COMPLEXITY_THRESHOLDS.MEDIUM) {
      return this.GPT_4O_MODEL;
    } else {
      return this.GPT_5_MODEL;
    }
  }

  /**
   * Calculate appropriate token budget based on complexity
   */
  private calculateTokenBudget(score: number): number {
    if (score <= this.COMPLEXITY_THRESHOLDS.SIMPLE) {
      return 1500;
    } else if (score <= this.COMPLEXITY_THRESHOLDS.MEDIUM) {
      return 3000;
    } else {
      return 6000;
    }
  }

  /**
   * Fallback heuristic complexity analysis when GPT analysis fails
   */
  private heuristicComplexityAnalysis(request: RouterRequest): ComplexityAnalysis {
    const content = request.content.toLowerCase();
    let score = 3; // Default to simple

    // Increase complexity for certain keywords
    const complexityIndicators = {
      'architecture': 3,
      'design': 2,
      'database': 2,
      'system': 2,
      'build': 2,
      'deploy': 2,
      'complex': 2,
      'refactor': 2,
      'optimize': 1,
      'debug': 1,
      'test': 1
    };

    for (const [keyword, weight] of Object.entries(complexityIndicators)) {
      if (content.includes(keyword)) {
        score += weight;
      }
    }

    // Length-based complexity
    if (request.content.length > 500) score += 1;
    if (request.content.length > 1000) score += 1;

    score = Math.max(1, Math.min(10, score));

    return {
      score,
      reasoning: `Heuristic analysis based on content keywords and length`,
      suggestedModel: this.selectModelByComplexity(score),
      tokenBudget: this.calculateTokenBudget(score)
    };
  }

  /**
   * Update model performance metrics for optimization
   */
  private async updateModelPerformance(
    model: string,
    complexityScore: number,
    responseTime: number,
    tokensUsed: number,
    success: boolean
  ): Promise<void> {
    const complexityRange = this.getComplexityRange(complexityScore);
    
    try {
      // Check if performance record exists
      const [existing] = await db.select()
        .from(modelPerformance)
        .where(and(
          eq(modelPerformance.model, model),
          eq(modelPerformance.complexityRange, complexityRange)
        ));

      if (existing) {
        // Update existing metrics with weighted average
        const currentSampleSize = existing.sampleSize || 0;
        const currentSuccessRate = existing.successRate || 0;
        const currentResponseTime = existing.avgResponseTime || 0;
        const currentTokenUsage = existing.avgTokenUsage || 0;
        
        const newSampleSize = currentSampleSize + 1;
        const successRate = success 
          ? Math.round(((currentSuccessRate * currentSampleSize) + 100) / newSampleSize)
          : Math.round(((currentSuccessRate * currentSampleSize) + 0) / newSampleSize);

        await db.update(modelPerformance)
          .set({
            avgResponseTime: Math.round(((currentResponseTime * currentSampleSize) + responseTime) / newSampleSize),
            successRate,
            avgTokenUsage: Math.round(((currentTokenUsage * currentSampleSize) + tokensUsed) / newSampleSize),
            sampleSize: newSampleSize,
            lastUpdated: new Date()
          })
          .where(eq(modelPerformance.id, existing.id));
      } else {
        // Create new performance record
        await db.insert(modelPerformance).values({
          model,
          complexityRange,
          avgResponseTime: responseTime,
          successRate: success ? 100 : 0,
          avgTokenUsage: tokensUsed,
          sampleSize: 1
        });
      }
    } catch (error) {
      console.error('Failed to update model performance:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Convert complexity score to range string
   */
  private getComplexityRange(score: number): string {
    if (score <= 3) return "1-3";
    if (score <= 6) return "4-6";
    return "7-10";
  }

  /**
   * Get performance metrics for model selection optimization
   */
  async getModelPerformanceMetrics(model?: string): Promise<any[]> {
    try {
      if (model) {
        return await db.select()
          .from(modelPerformance)
          .where(eq(modelPerformance.model, model))
          .orderBy(desc(modelPerformance.lastUpdated));
      } else {
        return await db.select()
          .from(modelPerformance)
          .orderBy(desc(modelPerformance.lastUpdated));
      }
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return [];
    }
  }

  /**
   * Get router analytics for the dashboard
   */
  async getRouterAnalytics(projectId?: string, days: number = 7): Promise<any> {
    try {
      const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const query = db.select()
        .from(routerAnalysis)
        .where(projectId 
          ? and(
              eq(routerAnalysis.projectId, projectId),
              // Add date filter when available
            )
          : // Add date filter when available
            eq(routerAnalysis.createdAt, routerAnalysis.createdAt) // placeholder
        );

      const results = await query;

      // Aggregate analytics
      const analytics = {
        totalRequests: results.length,
        avgComplexityScore: results.reduce((sum, r) => sum + r.complexityScore, 0) / results.length || 0,
        modelUsage: results.reduce((acc, r) => {
          acc[r.selectedModel] = (acc[r.selectedModel] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        avgResponseTime: results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length || 0,
        successRate: (results.filter(r => r.success).length / results.length) * 100 || 0,
        escalations: results.filter(r => r.escalationTrigger).length,
        workflowSteps: results.reduce((acc, r) => {
          if (r.workflowStep) {
            acc[r.workflowStep] = (acc[r.workflowStep] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>)
      };

      return analytics;
    } catch (error) {
      console.error('Failed to get router analytics:', error);
      return {
        totalRequests: 0,
        avgComplexityScore: 0,
        modelUsage: {},
        avgResponseTime: 0,
        successRate: 0,
        escalations: 0,
        workflowSteps: {}
      };
    }
  }
}

// Export singleton instance
export const dynamicRouter = new DynamicIntelligenceRouter();
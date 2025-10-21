/**
 * Decider - State machine controller for automation workflow
 * Decides whether to continue, retry, or request input based on scores
 */

import type { Decision, Score, AutomationState, AutomationConfig, DecisionRecord } from './types';
import { meetsThresholds, type ScorerConfig } from './scorer';

export interface DecisionContext {
  currentState: AutomationState;
  score: Score;
  retryCount: number;
  config: AutomationConfig;
  history: DecisionRecord[];
}

/**
 * Make a decision about what to do next
 */
export function makeDecision(context: DecisionContext): { decision: Decision; reasoning: string } {
  const { currentState, score, retryCount, config, history } = context;
  
  console.log(`[Decider] Making decision for state: ${currentState}`);
  console.log(`[Decider] Score: ${score.overall}/100, Retries: ${retryCount}/${config.maxRetries}`);
  
  // Check if we've exceeded max retries
  if (retryCount >= config.maxRetries) {
    return {
      decision: 'fail',
      reasoning: `Maximum retry limit (${config.maxRetries}) exceeded`,
    };
  }
  
  // State-specific decision logic
  switch (currentState) {
    case 'planning':
      return decidePlanning(context);
    
    case 'executing':
      return decideExecuting(context);
    
    case 'scoring':
      return decideScoring(context);
    
    case 'deciding':
      // This shouldn't happen, but handle gracefully
      return {
        decision: 'continue',
        reasoning: 'Continuing to next phase',
      };
    
    default:
      return {
        decision: 'fail',
        reasoning: `Unknown state: ${currentState}`,
      };
  }
}

/**
 * Decide after planning phase
 */
function decidePlanning(context: DecisionContext): { decision: Decision; reasoning: string } {
  const { score } = context;
  
  // Planning should always proceed to execution
  // Unless there are critical issues in the plan
  const criticalIssues = score.issues.filter(i => i.severity === 'critical');
  
  if (criticalIssues.length > 0) {
    return {
      decision: 'retry',
      reasoning: `Plan has ${criticalIssues.length} critical issues that need to be addressed`,
    };
  }
  
  return {
    decision: 'continue',
    reasoning: 'Plan is acceptable, proceeding to execution',
  };
}

/**
 * Decide after execution phase
 */
function decideExecuting(context: DecisionContext): { decision: Decision; reasoning: string } {
  const { score } = context;
  
  // Check for execution errors
  const executionErrors = score.issues.filter(i => 
    i.type === 'test' && i.severity === 'critical'
  );
  
  if (executionErrors.length > 0) {
    return {
      decision: 'retry',
      reasoning: `Execution failed with ${executionErrors.length} critical errors`,
    };
  }
  
  // Proceed to scoring
  return {
    decision: 'continue',
    reasoning: 'Execution completed, proceeding to quality validation',
  };
}

/**
 * Decide after scoring phase
 */
function decideScoring(context: DecisionContext): { decision: Decision; reasoning: string } {
  const { score, config, retryCount } = context;
  
  // Check if score meets all thresholds
  const scorerConfig: ScorerConfig = {
    thresholds: {
      overall: config.qualityThreshold,
      testsCoverage: 60,
      accessibility: config.enableAccessibility ? 80 : 0,
      performance: config.enablePerformance ? 70 : 0,
      security: config.enableSecurity ? 90 : 0,
      codeQuality: 70,
    },
  };
  
  const meetsThreshold = meetsThresholds(score, scorerConfig);
  
  if (meetsThreshold) {
    // Check for critical security issues even if score is good
    const criticalSecurityIssues = score.issues.filter(i => 
      i.type === 'security' && i.severity === 'critical'
    );
    
    if (criticalSecurityIssues.length > 0) {
      return {
        decision: 'retry',
        reasoning: `Critical security issues must be fixed: ${criticalSecurityIssues.map(i => i.message).join(', ')}`,
      };
    }
    
    // If auto-approve is enabled, complete immediately
    if (config.autoApprove) {
      return {
        decision: 'complete',
        reasoning: `Quality score ${score.overall}/100 meets threshold ${config.qualityThreshold}/100. Auto-approved.`,
      };
    }
    
    // Otherwise, request user input for approval
    return {
      decision: 'request-input',
      reasoning: `Quality score ${score.overall}/100 meets threshold. Awaiting user approval.`,
    };
  }
  
  // Score doesn't meet threshold
  const reasons = getFailureReasons(score, scorerConfig);
  
  // If we have retries left, try again
  if (retryCount < config.maxRetries) {
    return {
      decision: 'retry',
      reasoning: `Quality score ${score.overall}/100 below threshold ${config.qualityThreshold}/100. Issues: ${reasons.join(', ')}`,
    };
  }
  
  // No more retries, request human intervention
  return {
    decision: 'request-input',
    reasoning: `Quality score ${score.overall}/100 below threshold after ${retryCount} retries. Manual review required.`,
  };
}

/**
 * Get specific failure reasons
 */
function getFailureReasons(score: Score, config: ScorerConfig): string[] {
  const reasons: string[] = [];
  const thresholds = config.thresholds || {};
  
  if (score.metrics.testsCoverage < (thresholds.testsCoverage || 60)) {
    reasons.push(`test coverage ${score.metrics.testsCoverage}%`);
  }
  
  if (score.metrics.accessibility < (thresholds.accessibility || 80)) {
    reasons.push(`accessibility ${score.metrics.accessibility}%`);
  }
  
  if (score.metrics.performance < (thresholds.performance || 70)) {
    reasons.push(`performance ${score.metrics.performance}%`);
  }
  
  if (score.metrics.security < (thresholds.security || 90)) {
    reasons.push(`security ${score.metrics.security}%`);
  }
  
  if (score.metrics.codeQuality < (thresholds.codeQuality || 70)) {
    reasons.push(`code quality ${score.metrics.codeQuality}%`);
  }
  
  return reasons;
}

/**
 * Get next state based on decision
 */
export function getNextState(
  currentState: AutomationState,
  decision: Decision
): AutomationState {
  if (decision === 'complete') {
    return 'completed';
  }
  
  if (decision === 'fail') {
    return 'failed';
  }
  
  if (decision === 'request-input') {
    return 'awaiting-input';
  }
  
  if (decision === 'retry') {
    // Retry means go back to the appropriate phase
    switch (currentState) {
      case 'planning':
        return 'planning';
      case 'executing':
        return 'executing';
      case 'scoring':
        return 'executing'; // Re-execute to fix issues
      default:
        return 'planning'; // Start over
    }
  }
  
  // Continue to next phase
  switch (currentState) {
    case 'idle':
      return 'planning';
    case 'planning':
      return 'executing';
    case 'executing':
      return 'scoring';
    case 'scoring':
      return 'deciding';
    case 'deciding':
      return 'completed';
    default:
      return 'idle';
  }
}

/**
 * Check if state is terminal (no more transitions)
 */
export function isTerminalState(state: AutomationState): boolean {
  return state === 'completed' || state === 'failed' || state === 'awaiting-input';
}

/**
 * Create decision record for history
 */
export function createDecisionRecord(
  state: AutomationState,
  decision: Decision,
  reasoning: string,
  score?: Score,
  userInput?: string
): DecisionRecord {
  return {
    timestamp: new Date(),
    state,
    decision,
    reasoning,
    score,
    userInput,
  };
}

/**
 * Analyze decision history for patterns
 */
export function analyzeHistory(history: DecisionRecord[]): {
  totalRetries: number;
  mostCommonIssue: string | null;
  averageScore: number;
  trend: 'improving' | 'degrading' | 'stable';
} {
  if (history.length === 0) {
    return {
      totalRetries: 0,
      mostCommonIssue: null,
      averageScore: 0,
      trend: 'stable',
    };
  }
  
  const retries = history.filter(r => r.decision === 'retry').length;
  
  // Calculate average score
  const scores = history
    .map(r => r.score?.overall)
    .filter((s): s is number => s !== undefined);
  const averageScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : 0;
  
  // Determine trend (comparing first half to second half)
  let trend: 'improving' | 'degrading' | 'stable' = 'stable';
  if (scores.length >= 4) {
    const mid = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, mid);
    const secondHalf = scores.slice(mid);
    
    const avgFirst = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;
    
    if (avgSecond > avgFirst + 5) {
      trend = 'improving';
    } else if (avgSecond < avgFirst - 5) {
      trend = 'degrading';
    }
  }
  
  // Find most common issue
  const issueTypes: Record<string, number> = {};
  history.forEach(r => {
    if (r.score) {
      r.score.issues.forEach(issue => {
        const key = `${issue.type}:${issue.severity}`;
        issueTypes[key] = (issueTypes[key] || 0) + 1;
      });
    }
  });
  
  let mostCommonIssue: string | null = null;
  let maxCount = 0;
  for (const [issue, count] of Object.entries(issueTypes)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonIssue = issue;
    }
  }
  
  return {
    totalRetries: retries,
    mostCommonIssue,
    averageScore,
    trend,
  };
}

/**
 * Generate decision explanation
 */
export function explainDecision(context: DecisionContext): string {
  const { decision, reasoning } = makeDecision(context);
  const analysis = analyzeHistory(context.history);
  
  let explanation = `## Decision: ${decision.toUpperCase()}\n\n`;
  explanation += `**Reasoning:** ${reasoning}\n\n`;
  
  explanation += `### Current Status\n`;
  explanation += `- Overall Score: ${context.score.overall}/100\n`;
  explanation += `- Quality Threshold: ${context.config.qualityThreshold}/100\n`;
  explanation += `- Retry Count: ${context.retryCount}/${context.config.maxRetries}\n\n`;
  
  if (analysis.totalRetries > 0) {
    explanation += `### History Analysis\n`;
    explanation += `- Total Retries: ${analysis.totalRetries}\n`;
    explanation += `- Average Score: ${Math.round(analysis.averageScore)}/100\n`;
    explanation += `- Trend: ${analysis.trend}\n`;
    if (analysis.mostCommonIssue) {
      explanation += `- Most Common Issue: ${analysis.mostCommonIssue}\n`;
    }
    explanation += '\n';
  }
  
  if (context.score.issues.length > 0) {
    const criticalCount = context.score.issues.filter(i => i.severity === 'critical').length;
    const highCount = context.score.issues.filter(i => i.severity === 'high').length;
    
    explanation += `### Issues Summary\n`;
    if (criticalCount > 0) {
      explanation += `- ⚠️ Critical: ${criticalCount}\n`;
    }
    if (highCount > 0) {
      explanation += `- 🔴 High: ${highCount}\n`;
    }
    explanation += `- Total Issues: ${context.score.issues.length}\n`;
  }
  
  return explanation;
}

/**
 * Suggest next actions based on decision
 */
export function suggestNextActions(decision: Decision, score: Score): string[] {
  const actions: string[] = [];
  
  switch (decision) {
    case 'retry':
      // Prioritize fixes based on issue severity
      const criticalIssues = score.issues.filter(i => i.severity === 'critical');
      const highIssues = score.issues.filter(i => i.severity === 'high');
      
      if (criticalIssues.length > 0) {
        actions.push(`Fix ${criticalIssues.length} critical issue(s) immediately`);
        criticalIssues.slice(0, 3).forEach(issue => {
          actions.push(`  - ${issue.message}`);
        });
      }
      
      if (highIssues.length > 0) {
        actions.push(`Address ${highIssues.length} high-severity issue(s)`);
      }
      
      // Add metric-specific actions
      if (score.metrics.security < 90) {
        actions.push('Prioritize security fixes before continuing');
      }
      if (score.metrics.accessibility < 80) {
        actions.push('Review and fix accessibility violations');
      }
      break;
    
    case 'complete':
      actions.push('Generate final documentation');
      actions.push('Prepare deployment package');
      actions.push('Create release notes');
      break;
    
    case 'request-input':
      actions.push('Review generated code and quality report');
      actions.push('Decide whether to proceed, retry, or modify requirements');
      actions.push('Provide feedback on any concerns');
      break;
    
    case 'fail':
      actions.push('Review error logs and failure reasons');
      actions.push('Adjust requirements or configuration');
      actions.push('Consider manual intervention');
      break;
  }
  
  return actions;
}

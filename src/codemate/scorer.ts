/**
 * Scorer - Quality validation for generated code
 * Validates tests, accessibility, performance, and security
 */

import { selectModel } from './modelRouter';
import type { Score, Issue, ExecutionResult } from './types';

export interface ScorerConfig {
  modelOverride?: string;
  checkAccessibility?: boolean;
  checkPerformance?: boolean;
  checkSecurity?: boolean;
  checkTests?: boolean;
  checkCodeQuality?: boolean;
  thresholds?: {
    overall?: number;
    testsCoverage?: number;
    accessibility?: number;
    performance?: number;
    security?: number;
    codeQuality?: number;
  };
}

/**
 * Score the execution results
 */
export async function scoreResults(
  results: ExecutionResult[],
  config: ScorerConfig = {}
): Promise<Score> {
  const model = selectModel({
    taskType: 'validation',
    preferQuality: true,
  });
  
  console.log(`[Scorer] Using ${model.displayName} for validation`);
  
  const issues: Issue[] = [];
  const recommendations: string[] = [];
  
  // Collect all errors from execution results
  for (const result of results) {
    for (const error of result.errors) {
      issues.push({
        type: mapErrorTypeToIssueType(error.type),
        severity: error.severity === 'error' ? 'high' : 'medium',
        message: error.message,
        file: error.file,
        line: error.line,
      });
    }
  }
  
  // Calculate individual metric scores
  const testsCoverage = config.checkTests !== false 
    ? await scoreTests(results, config)
    : 100;
    
  const accessibility = config.checkAccessibility !== false
    ? await scoreAccessibility(results, config, issues)
    : 100;
    
  const performance = config.checkPerformance !== false
    ? await scorePerformance(results, config, issues)
    : 100;
    
  const security = config.checkSecurity !== false
    ? await scoreSecurity(results, config, issues)
    : 100;
    
  const codeQuality = config.checkCodeQuality !== false
    ? await scoreCodeQuality(results, config, issues)
    : 100;
  
  // Calculate overall score (weighted average)
  const overall = Math.round(
    (testsCoverage * 0.25) +
    (accessibility * 0.2) +
    (performance * 0.2) +
    (security * 0.25) +
    (codeQuality * 0.1)
  );
  
  // Generate recommendations
  if (testsCoverage < 80) {
    recommendations.push('Increase test coverage to at least 80%');
  }
  if (accessibility < 90) {
    recommendations.push('Address accessibility issues for WCAG 2.1 AA compliance');
  }
  if (performance < 85) {
    recommendations.push('Optimize performance bottlenecks');
  }
  if (security < 95) {
    recommendations.push('Fix security vulnerabilities immediately');
  }
  if (codeQuality < 80) {
    recommendations.push('Refactor code to improve quality and maintainability');
  }
  
  // Add general recommendations
  if (overall >= 90) {
    recommendations.push('Excellent work! Consider adding more edge case tests');
  } else if (overall >= 70) {
    recommendations.push('Good progress. Focus on addressing high-severity issues');
  } else {
    recommendations.push('Significant improvements needed before deployment');
  }
  
  return {
    overall,
    metrics: {
      testsCoverage,
      accessibility,
      performance,
      security,
      codeQuality,
    },
    issues,
    recommendations,
    timestamp: new Date(),
  };
}

/**
 * Score test coverage
 */
async function scoreTests(results: ExecutionResult[], config: ScorerConfig): Promise<number> {
  let score = 100;
  
  // Check if test files were generated
  const hasTestFiles = results.some(r => 
    r.filesGenerated.some(f => f.path.includes('.test.') || f.path.includes('.spec.'))
  );
  
  if (!hasTestFiles) {
    score -= 50;
  }
  
  // Check for test utilities
  const hasTestUtils = results.some(r =>
    r.filesGenerated.some(f => 
      f.content.includes('@testing-library') || 
      f.content.includes('vitest') ||
      f.content.includes('describe(') ||
      f.content.includes('it(')
    )
  );
  
  if (!hasTestUtils) {
    score -= 30;
  }
  
  return Math.max(0, score);
}

/**
 * Score accessibility compliance
 */
async function scoreAccessibility(
  results: ExecutionResult[],
  config: ScorerConfig,
  issues: Issue[]
): Promise<number> {
  let score = 100;
  let issueCount = 0;
  
  for (const result of results) {
    for (const file of result.filesGenerated) {
      // Check for missing alt text on images
      if (file.content.includes('<img') && !file.content.includes('alt=')) {
        issues.push({
          type: 'accessibility',
          severity: 'high',
          message: 'Image elements must have alt text',
          file: file.path,
          suggestion: 'Add descriptive alt attributes to all img elements',
        });
        issueCount++;
      }
      
      // Check for missing labels on form inputs
      if (file.content.includes('<input') || file.content.includes('<Input')) {
        const hasLabel = file.content.includes('<label') || 
                        file.content.includes('aria-label') ||
                        file.content.includes('Label');
        if (!hasLabel) {
          issues.push({
            type: 'accessibility',
            severity: 'medium',
            message: 'Form inputs should have associated labels',
            file: file.path,
            suggestion: 'Add label elements or aria-label attributes',
          });
          issueCount++;
        }
      }
      
      // Check for semantic HTML
      if (file.language === 'typescript' && file.path.includes('.tsx')) {
        const hasSemantic = file.content.includes('<header') ||
                          file.content.includes('<nav') ||
                          file.content.includes('<main') ||
                          file.content.includes('<article') ||
                          file.content.includes('<section');
        
        if (!hasSemantic && file.content.includes('return (')) {
          issues.push({
            type: 'accessibility',
            severity: 'low',
            message: 'Consider using semantic HTML elements',
            file: file.path,
            suggestion: 'Use header, nav, main, article, section instead of div where appropriate',
          });
          issueCount++;
        }
      }
      
      // Check for keyboard navigation support
      if (file.content.includes('onClick') && !file.content.includes('onKeyDown') && !file.content.includes('onKeyPress')) {
        issues.push({
          type: 'accessibility',
          severity: 'medium',
          message: 'Interactive elements should support keyboard navigation',
          file: file.path,
          suggestion: 'Add onKeyDown or onKeyPress handlers, or use button elements',
        });
        issueCount++;
      }
    }
  }
  
  // Deduct points based on issue severity
  score -= (issueCount * 10);
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Score performance
 */
async function scorePerformance(
  results: ExecutionResult[],
  config: ScorerConfig,
  issues: Issue[]
): Promise<number> {
  let score = 100;
  let issueCount = 0;
  
  for (const result of results) {
    for (const file of result.filesGenerated) {
      // Check for large bundle warnings
      if (file.size > 100000) { // > 100KB
        issues.push({
          type: 'performance',
          severity: 'medium',
          message: `Large file size: ${Math.round(file.size / 1024)}KB`,
          file: file.path,
          suggestion: 'Consider code splitting or lazy loading',
        });
        issueCount++;
      }
      
      // Check for unoptimized images
      if (file.content.includes('.jpg') || file.content.includes('.png')) {
        if (!file.content.includes('loading="lazy"') && !file.content.includes('loading={')) {
          issues.push({
            type: 'performance',
            severity: 'low',
            message: 'Images should use lazy loading',
            file: file.path,
            suggestion: 'Add loading="lazy" to image elements',
          });
          issueCount++;
        }
      }
      
      // Check for missing React.memo or useMemo for expensive components
      if (file.content.includes('map(') && 
          !file.content.includes('React.memo') && 
          !file.content.includes('useMemo')) {
        issues.push({
          type: 'performance',
          severity: 'low',
          message: 'Consider memoizing components that render lists',
          file: file.path,
          suggestion: 'Use React.memo or useMemo for performance optimization',
        });
        issueCount++;
      }
    }
  }
  
  score -= (issueCount * 8);
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Score security
 */
async function scoreSecurity(
  results: ExecutionResult[],
  config: ScorerConfig,
  issues: Issue[]
): Promise<number> {
  let score = 100;
  let issueCount = 0;
  
  for (const result of results) {
    for (const file of result.filesGenerated) {
      // Check for hardcoded secrets
      const secretPatterns = [
        /api[_-]?key/i,
        /secret/i,
        /password/i,
        /token/i,
      ];
      
      for (const pattern of secretPatterns) {
        if (pattern.test(file.content) && file.content.includes('=')) {
          // Check if it's not from env vars
          if (!file.content.includes('process.env') && 
              !file.content.includes('import.meta.env')) {
            issues.push({
              type: 'security',
              severity: 'critical',
              message: 'Potential hardcoded secret detected',
              file: file.path,
              suggestion: 'Use environment variables for sensitive data',
            });
            issueCount++;
            score -= 20; // Critical issue
          }
        }
      }
      
      // Check for dangerouslySetInnerHTML
      if (file.content.includes('dangerouslySetInnerHTML')) {
        issues.push({
          type: 'security',
          severity: 'high',
          message: 'dangerouslySetInnerHTML can lead to XSS vulnerabilities',
          file: file.path,
          suggestion: 'Sanitize HTML content or use safer alternatives',
        });
        issueCount++;
        score -= 15;
      }
      
      // Check for eval usage
      if (file.content.includes('eval(')) {
        issues.push({
          type: 'security',
          severity: 'critical',
          message: 'eval() is a security risk',
          file: file.path,
          suggestion: 'Avoid using eval(), find safer alternatives',
        });
        issueCount++;
        score -= 20;
      }
      
      // Check for SQL injection risks (basic check)
      if (file.content.includes('SELECT') && file.content.includes('${')) {
        issues.push({
          type: 'security',
          severity: 'high',
          message: 'Potential SQL injection vulnerability',
          file: file.path,
          suggestion: 'Use parameterized queries or ORM',
        });
        issueCount++;
        score -= 15;
      }
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Score code quality
 */
async function scoreCodeQuality(
  results: ExecutionResult[],
  config: ScorerConfig,
  issues: Issue[]
): Promise<number> {
  let score = 100;
  let issueCount = 0;
  
  for (const result of results) {
    for (const file of result.filesGenerated) {
      // Check component size
      const lines = file.content.split('\n').length;
      if (lines > 200) {
        issues.push({
          type: 'quality',
          severity: 'medium',
          message: `Component is too large: ${lines} lines (max 200)`,
          file: file.path,
          suggestion: 'Split into smaller, focused components',
        });
        issueCount++;
      }
      
      // Check for TypeScript types
      if (file.language === 'typescript' && !file.path.includes('.test.')) {
        const hasTypes = file.content.includes(': ') || 
                        file.content.includes('interface ') ||
                        file.content.includes('type ');
        
        if (!hasTypes && file.content.includes('function')) {
          issues.push({
            type: 'quality',
            severity: 'low',
            message: 'Functions should have type annotations',
            file: file.path,
            suggestion: 'Add TypeScript type annotations',
          });
          issueCount++;
        }
      }
      
      // Check for console.log (should be removed in production)
      if (file.content.includes('console.log') && !file.path.includes('.test.')) {
        issues.push({
          type: 'quality',
          severity: 'low',
          message: 'Remove console.log statements from production code',
          file: file.path,
          suggestion: 'Use proper logging library or remove debug statements',
        });
        issueCount++;
      }
      
      // Check for magic numbers
      const magicNumberRegex = /\b\d{2,}\b/g;
      const matches = file.content.match(magicNumberRegex);
      if (matches && matches.length > 5) {
        issues.push({
          type: 'quality',
          severity: 'low',
          message: 'Consider extracting magic numbers to constants',
          file: file.path,
          suggestion: 'Define constants for repeated numeric values',
        });
        issueCount++;
      }
    }
  }
  
  score -= (issueCount * 5);
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Check if score meets thresholds
 */
export function meetsThresholds(score: Score, config: ScorerConfig): boolean {
  const thresholds = config.thresholds || {
    overall: 70,
    testsCoverage: 60,
    accessibility: 80,
    performance: 70,
    security: 90,
    codeQuality: 70,
  };
  
  return (
    score.overall >= (thresholds.overall || 70) &&
    score.metrics.testsCoverage >= (thresholds.testsCoverage || 60) &&
    score.metrics.accessibility >= (thresholds.accessibility || 80) &&
    score.metrics.performance >= (thresholds.performance || 70) &&
    score.metrics.security >= (thresholds.security || 90) &&
    score.metrics.codeQuality >= (thresholds.codeQuality || 70)
  );
}

/**
 * Helper function to map error types
 */
function mapErrorTypeToIssueType(errorType: string): Issue['type'] {
  switch (errorType) {
    case 'syntax':
    case 'type':
      return 'quality';
    case 'runtime':
      return 'test';
    case 'validation':
      return 'quality';
    default:
      return 'quality';
  }
}

/**
 * Generate a detailed score report
 */
export function generateScoreReport(score: Score): string {
  let report = '# Quality Score Report\n\n';
  report += `**Overall Score:** ${score.overall}/100\n\n`;
  
  report += '## Metrics\n\n';
  report += `- **Tests Coverage:** ${score.metrics.testsCoverage}/100\n`;
  report += `- **Accessibility:** ${score.metrics.accessibility}/100\n`;
  report += `- **Performance:** ${score.metrics.performance}/100\n`;
  report += `- **Security:** ${score.metrics.security}/100\n`;
  report += `- **Code Quality:** ${score.metrics.codeQuality}/100\n\n`;
  
  if (score.issues.length > 0) {
    report += '## Issues\n\n';
    
    const criticalIssues = score.issues.filter(i => i.severity === 'critical');
    const highIssues = score.issues.filter(i => i.severity === 'high');
    const mediumIssues = score.issues.filter(i => i.severity === 'medium');
    const lowIssues = score.issues.filter(i => i.severity === 'low');
    
    if (criticalIssues.length > 0) {
      report += `### Critical (${criticalIssues.length})\n\n`;
      criticalIssues.forEach(issue => {
        report += `- ${issue.message}`;
        if (issue.file) report += ` (${issue.file})`;
        report += '\n';
      });
      report += '\n';
    }
    
    if (highIssues.length > 0) {
      report += `### High (${highIssues.length})\n\n`;
      highIssues.forEach(issue => {
        report += `- ${issue.message}`;
        if (issue.file) report += ` (${issue.file})`;
        report += '\n';
      });
      report += '\n';
    }
    
    if (mediumIssues.length > 0) {
      report += `### Medium (${mediumIssues.length})\n\n`;
      mediumIssues.slice(0, 5).forEach(issue => {
        report += `- ${issue.message}`;
        if (issue.file) report += ` (${issue.file})`;
        report += '\n';
      });
      if (mediumIssues.length > 5) {
        report += `\n... and ${mediumIssues.length - 5} more\n`;
      }
      report += '\n';
    }
    
    if (lowIssues.length > 0) {
      report += `### Low (${lowIssues.length})\n\n`;
      report += `${lowIssues.length} low-severity issues found.\n\n`;
    }
  }
  
  if (score.recommendations.length > 0) {
    report += '## Recommendations\n\n';
    score.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });
  }
  
  return report;
}

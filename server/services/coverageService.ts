import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { db } from '../db';
import { 
  projects, 
  coverageReports,
  type CoverageReport,
  type InsertCoverageReport
} from '@shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

const execAsync = promisify(exec);

export interface CoverageMetrics {
  statements: { total: number; covered: number; percentage: number };
  branches: { total: number; covered: number; percentage: number };
  functions: { total: number; covered: number; percentage: number };
  lines: { total: number; covered: number; percentage: number };
}

export interface FileCoverage {
  path: string;
  metrics: CoverageMetrics;
  uncoveredLines: number[];
  uncoveredFunctions: string[];
}

export interface CoverageGap {
  file: string;
  type: 'statement' | 'branch' | 'function' | 'line';
  current: number;
  required: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  suggestedTests?: string[];
}

export interface CoverageAnalysis {
  projectId: string;
  overall: CoverageMetrics;
  files: FileCoverage[];
  gaps: CoverageGap[];
  timestamp: Date;
  passed: boolean;
  reportPath: string;
  htmlReportPath: string;
}

class CoverageService {
  private readonly coverageDir = './coverage';
  private readonly threshold = 85;

  /**
   * Run coverage analysis for a project
   */
  async runCoverage(projectId: string, options?: {
    watch?: boolean;
    updateSnapshots?: boolean;
    testPattern?: string;
  }): Promise<CoverageAnalysis> {
    console.log(`Running coverage analysis for project ${projectId}...`);

    // Ensure coverage directory exists
    if (!existsSync(this.coverageDir)) {
      mkdirSync(this.coverageDir, { recursive: true });
    }

    // Build the test command
    let command = 'npx vitest run --coverage';
    if (options?.watch) {
      command = 'npx vitest --coverage --watch';
    }
    if (options?.updateSnapshots) {
      command += ' -u';
    }
    if (options?.testPattern) {
      command += ` --testNamePattern="${options.testPattern}"`;
    }

    try {
      // Run the coverage command
      const { stdout, stderr } = await execAsync(command, {
        env: { ...process.env, CI: 'true', NODE_ENV: 'test' }
      });

      if (stderr && !stderr.includes('WARN')) {
        console.warn('Coverage warnings:', stderr);
      }

      // Parse the coverage results
      const analysis = await this.parseCoverageResults(projectId);

      // Update project with latest coverage
      await db
        .update(projects)
        .set({
          testCoverage: analysis.overall.statements.percentage,
          lastCoverageRun: new Date(),
          updatedAt: new Date()
        })
        .where(eq(projects.id, projectId));

      // Store coverage report in database
      await this.storeCoverageReport(analysis);

      // Generate coverage gaps analysis
      analysis.gaps = await this.identifyCoverageGaps(analysis);

      console.log(`Coverage analysis completed: ${analysis.overall.statements.percentage.toFixed(2)}%`);
      return analysis;
    } catch (error) {
      console.error('Failed to run coverage:', error);
      throw new Error(`Coverage analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse coverage results from JSON report
   */
  async parseCoverageResults(projectId: string): Promise<CoverageAnalysis> {
    const jsonPath = join(this.coverageDir, 'coverage-final.json');
    const summaryPath = join(this.coverageDir, 'coverage-summary.json');

    if (!existsSync(jsonPath) || !existsSync(summaryPath)) {
      throw new Error('Coverage reports not found. Run tests first.');
    }

    const coverageData = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    const summaryData = JSON.parse(readFileSync(summaryPath, 'utf-8'));

    // Parse overall metrics
    const overall = this.extractMetrics(summaryData.total);

    // Parse file-level coverage
    const files: FileCoverage[] = [];
    for (const [filePath, fileData] of Object.entries(coverageData)) {
      const relativePath = relative(process.cwd(), filePath);
      const fileSummary = summaryData[filePath];
      
      if (!fileSummary) continue;

      const fileCoverage: FileCoverage = {
        path: relativePath,
        metrics: this.extractMetrics(fileSummary),
        uncoveredLines: this.getUncoveredLines(fileData as any),
        uncoveredFunctions: this.getUncoveredFunctions(fileData as any)
      };

      files.push(fileCoverage);
    }

    // Sort files by coverage percentage (ascending) to prioritize low coverage files
    files.sort((a, b) => a.metrics.statements.percentage - b.metrics.statements.percentage);

    const analysis: CoverageAnalysis = {
      projectId,
      overall,
      files,
      gaps: [], // Will be populated by identifyCoverageGaps
      timestamp: new Date(),
      passed: this.checkThresholds(overall),
      reportPath: jsonPath,
      htmlReportPath: join(this.coverageDir, 'index.html')
    };

    return analysis;
  }

  /**
   * Extract metrics from coverage summary
   */
  private extractMetrics(summary: any): CoverageMetrics {
    return {
      statements: {
        total: summary.statements.total,
        covered: summary.statements.covered,
        percentage: summary.statements.pct
      },
      branches: {
        total: summary.branches.total,
        covered: summary.branches.covered,
        percentage: summary.branches.pct
      },
      functions: {
        total: summary.functions.total,
        covered: summary.functions.covered,
        percentage: summary.functions.pct
      },
      lines: {
        total: summary.lines.total,
        covered: summary.lines.covered,
        percentage: summary.lines.pct
      }
    };
  }

  /**
   * Get uncovered line numbers from file data
   */
  private getUncoveredLines(fileData: any): number[] {
    const uncoveredLines: number[] = [];
    const statementMap = fileData.statementMap || {};
    const s = fileData.s || {};

    for (const [key, statement] of Object.entries(statementMap)) {
      if (s[key] === 0) {
        const loc = (statement as any).start;
        if (loc && loc.line) {
          uncoveredLines.push(loc.line);
        }
      }
    }

    return [...new Set(uncoveredLines)].sort((a, b) => a - b);
  }

  /**
   * Get uncovered function names from file data
   */
  private getUncoveredFunctions(fileData: any): string[] {
    const uncoveredFunctions: string[] = [];
    const fnMap = fileData.fnMap || {};
    const f = fileData.f || {};

    for (const [key, func] of Object.entries(fnMap)) {
      if (f[key] === 0) {
        const funcName = (func as any).name || `anonymous_${key}`;
        uncoveredFunctions.push(funcName);
      }
    }

    return uncoveredFunctions;
  }

  /**
   * Check if coverage meets thresholds
   */
  private checkThresholds(metrics: CoverageMetrics): boolean {
    return (
      metrics.statements.percentage >= this.threshold &&
      metrics.branches.percentage >= this.threshold &&
      metrics.functions.percentage >= this.threshold &&
      metrics.lines.percentage >= this.threshold
    );
  }

  /**
   * Identify coverage gaps and prioritize them
   */
  async identifyCoverageGaps(analysis: CoverageAnalysis): Promise<CoverageGap[]> {
    const gaps: CoverageGap[] = [];

    // Check overall coverage gaps
    const metricTypes: Array<keyof CoverageMetrics> = ['statements', 'branches', 'functions', 'lines'];
    
    for (const type of metricTypes) {
      const metric = analysis.overall[type];
      if (metric.percentage < this.threshold) {
        gaps.push({
          file: 'overall',
          type: type.slice(0, -1) as any,
          current: metric.percentage,
          required: this.threshold,
          gap: this.threshold - metric.percentage,
          priority: this.getPriority(metric.percentage)
        });
      }
    }

    // Check file-level coverage gaps
    for (const file of analysis.files) {
      for (const type of metricTypes) {
        const metric = file.metrics[type];
        if (metric.percentage < this.threshold && metric.total > 0) {
          const gap: CoverageGap = {
            file: file.path,
            type: type.slice(0, -1) as any,
            current: metric.percentage,
            required: this.threshold,
            gap: this.threshold - metric.percentage,
            priority: this.getPriority(metric.percentage),
            suggestedTests: await this.suggestTests(file.path, file.uncoveredFunctions)
          };
          gaps.push(gap);
        }
      }
    }

    // Sort gaps by priority and gap size
    gaps.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.gap - a.gap;
    });

    return gaps;
  }

  /**
   * Determine priority based on coverage percentage
   */
  private getPriority(percentage: number): 'high' | 'medium' | 'low' {
    if (percentage < 50) return 'high';
    if (percentage < 70) return 'medium';
    return 'low';
  }

  /**
   * Suggest tests for uncovered code
   */
  private async suggestTests(filePath: string, uncoveredFunctions: string[]): Promise<string[]> {
    const suggestions: string[] = [];

    // Determine test type based on file path
    if (filePath.includes('/components/')) {
      suggestions.push('Component render test');
      suggestions.push('Props validation test');
      suggestions.push('User interaction test');
    } else if (filePath.includes('/hooks/')) {
      suggestions.push('Hook initialization test');
      suggestions.push('Hook state change test');
      suggestions.push('Hook edge cases test');
    } else if (filePath.includes('/services/')) {
      suggestions.push('Service method test');
      suggestions.push('Error handling test');
      suggestions.push('Integration test');
    } else if (filePath.includes('/lib/') || filePath.includes('/utils/')) {
      suggestions.push('Unit test for utility functions');
      suggestions.push('Edge case test');
      suggestions.push('Input validation test');
    }

    // Add specific function tests
    for (const func of uncoveredFunctions.slice(0, 3)) {
      suggestions.push(`Test for ${func} function`);
    }

    return suggestions;
  }

  /**
   * Store coverage report in database
   */
  async storeCoverageReport(analysis: CoverageAnalysis): Promise<void> {
    const reportData: InsertCoverageReport = {
      projectId: analysis.projectId,
      coverage: analysis.overall.statements.percentage,
      statementsCoverage: analysis.overall.statements.percentage,
      branchesCoverage: analysis.overall.branches.percentage,
      functionsCoverage: analysis.overall.functions.percentage,
      linesCoverage: analysis.overall.lines.percentage,
      passed: analysis.passed,
      reportData: {
        overall: analysis.overall,
        files: analysis.files.map(f => ({
          path: f.path,
          metrics: f.metrics
        })),
        timestamp: analysis.timestamp
      },
      createdAt: new Date()
    };

    await db.insert(coverageReports).values(reportData);
  }

  /**
   * Get coverage history for a project
   */
  async getCoverageHistory(
    projectId: string, 
    limit: number = 10
  ): Promise<CoverageReport[]> {
    const reports = await db
      .select()
      .from(coverageReports)
      .where(eq(coverageReports.projectId, projectId))
      .orderBy(desc(coverageReports.createdAt))
      .limit(limit);

    return reports;
  }

  /**
   * Get coverage trends
   */
  async getCoverageTrends(projectId: string, days: number = 30): Promise<{
    dates: string[];
    statements: number[];
    branches: number[];
    functions: number[];
    lines: number[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const reports = await db
      .select()
      .from(coverageReports)
      .where(
        and(
          eq(coverageReports.projectId, projectId),
          gte(coverageReports.createdAt, startDate)
        )
      )
      .orderBy(coverageReports.createdAt);

    return {
      dates: reports.map(r => r.createdAt.toISOString().split('T')[0]),
      statements: reports.map(r => r.statementsCoverage),
      branches: reports.map(r => r.branchesCoverage),
      functions: reports.map(r => r.functionsCoverage),
      lines: reports.map(r => r.linesCoverage)
    };
  }

  /**
   * Generate coverage badge SVG
   */
  generateBadge(percentage: number): string {
    const color = percentage >= 85 ? '#4c1' : percentage >= 70 ? '#dfb317' : '#e05d44';
    const text = `${percentage.toFixed(1)}%`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="114" height="20">
      <linearGradient id="b" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
        <stop offset="1" stop-opacity=".1"/>
      </linearGradient>
      <clipPath id="a">
        <rect width="114" height="20" rx="3" fill="#fff"/>
      </clipPath>
      <g clip-path="url(#a)">
        <path fill="#555" d="M0 0h63v20H0z"/>
        <path fill="${color}" d="M63 0h51v20H63z"/>
        <path fill="url(#b)" d="M0 0h114v20H0z"/>
      </g>
      <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
        <text x="325" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="530">coverage</text>
        <text x="325" y="140" transform="scale(.1)" textLength="530">coverage</text>
        <text x="875" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="410">${text}</text>
        <text x="875" y="140" transform="scale(.1)" textLength="410">${text}</text>
      </g>
    </svg>`;
  }

  /**
   * Export coverage report in different formats
   */
  async exportReport(projectId: string, format: 'json' | 'html' | 'lcov'): Promise<string> {
    const basePath = join(this.coverageDir, projectId);
    
    switch (format) {
      case 'json':
        return join(basePath, 'coverage-final.json');
      case 'html':
        return join(basePath, 'index.html');
      case 'lcov':
        return join(basePath, 'lcov.info');
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}

export const coverageService = new CoverageService();
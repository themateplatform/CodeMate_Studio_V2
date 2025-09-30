import { Router } from 'express';
import { storage } from '../storage';

// Mock auth middleware (no authentication required)
const isAuthenticated = (req: any, res: any, next: any) => {
  req.user = { id: 'local', username: 'admin', role: 'admin' };
  next();
};
import { coverageService } from '../services/coverageService';
import { z } from 'zod';
import csrf from 'csrf';
import { randomBytes } from 'crypto';

const router = Router();
const csrfTokens = new csrf();

// Simple header-based CSRF protection (no session dependency)
const csrfProtection = (req: any, res: any, next: any) => {
  // Skip CSRF for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  try {
    // Use double-submit cookie pattern or authorization-based CSRF protection
    const authHeader = req.headers.authorization;
    const csrfHeader = req.headers['x-csrf-token'];
    
    if (!authHeader || !csrfHeader) {
      return res.status(403).json({ 
        error: 'CSRF protection failed',
        message: 'Both Authorization and X-CSRF-Token headers required'
      });
    }

    // Simple verification: CSRF token should match a derived value from auth
    // In production, this would be a signed token or other secure mechanism
    const expectedToken = Buffer.from(authHeader).toString('base64').slice(0, 32);
    
    if (csrfHeader !== expectedToken) {
      return res.status(403).json({ 
        error: 'Invalid CSRF token',
        message: 'CSRF token verification failed'
      });
    }

    next();
  } catch (error) {
    console.error('CSRF verification error:', error);
    res.status(403).json({ 
      error: 'CSRF token verification failed',
      message: 'Unable to verify CSRF token'
    });
  }
};

// Get coverage reports for a project
router.get('/projects/:id/coverage', isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 10;

    // Check project ownership first
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check project ownership with proper multi-tenant isolation
    const isDirectOwner = project.userId === req.user?.id;
    const isSameOrgElevated = (req.user?.role === "admin" || req.user?.role === "owner") && 
                             project.organizationId === req.user?.organizationId;
    
    if (!isDirectOwner && !isSameOrgElevated) {
      return res.status(403).json({ error: "Access denied to this project" });
    }

    // Get coverage reports
    const reports = await storage.getCoverageReports(projectId, limit);
    
    // Get latest report details
    const latestReport = await storage.getLatestCoverageReport(projectId);
    
    res.json({
      reports,
      latestReport,
      projectCoverage: project.testCoverage,
      lastRun: project.lastCoverageRun,
      enforced: project.coverageEnforced
    });
  } catch (error) {
    console.error('Failed to get coverage reports:', error);
    res.status(500).json({ 
      error: 'Failed to get coverage reports',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Run coverage analysis for a project
router.post('/projects/:id/run-coverage', isAuthenticated, csrfProtection, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const bodySchema = z.object({
      watch: z.boolean().optional(),
      updateSnapshots: z.boolean().optional(),
      testPattern: z.string().optional()
    });

    const body = bodySchema.parse(req.body);

    // Check project ownership first  
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check project ownership with proper multi-tenant isolation
    const isDirectOwner = project.userId === req.user?.id;
    const isSameOrgElevated = (req.user?.role === "admin" || req.user?.role === "owner") && 
                             project.organizationId === req.user?.organizationId;
    
    if (!isDirectOwner && !isSameOrgElevated) {
      return res.status(403).json({ error: "Access denied to this project" });
    }

    // Run coverage analysis
    const analysis = await coverageService.runCoverage(projectId, {
      watch: body.watch,
      updateSnapshots: body.updateSnapshots,
      testPattern: body.testPattern
    });

    res.json({
      success: true,
      analysis,
      passed: analysis.passed,
      coverage: analysis.overall.statements.percentage
    });
  } catch (error) {
    console.error('Failed to run coverage analysis:', error);
    res.status(500).json({ 
      error: 'Failed to run coverage analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get coverage gaps for a project
router.get('/projects/:id/coverage-gaps', isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;

    // Check project ownership first
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check project ownership with proper multi-tenant isolation
    const isDirectOwner = project.userId === req.user?.id;
    const isSameOrgElevated = (req.user?.role === "admin" || req.user?.role === "owner") && 
                             project.organizationId === req.user?.organizationId;
    
    if (!isDirectOwner && !isSameOrgElevated) {
      return res.status(403).json({ error: "Access denied to this project" });
    }

    // Get latest coverage report
    const latestReport = await storage.getLatestCoverageReport(projectId);
    
    if (!latestReport) {
      return res.status(404).json({ 
        error: 'No coverage data available',
        message: 'Run coverage analysis first'
      });
    }

    // Parse and analyze the coverage data to find gaps
    const reportData = latestReport.reportData as any;
    const gaps = await coverageService.identifyCoverageGaps({
      projectId,
      overall: reportData.overall,
      files: reportData.files || [],
      gaps: [],
      timestamp: latestReport.createdAt,
      passed: latestReport.passed,
      reportPath: '',
      htmlReportPath: ''
    });

    res.json({
      gaps,
      summary: {
        totalGaps: gaps.length,
        highPriority: gaps.filter(g => g.priority === 'high').length,
        mediumPriority: gaps.filter(g => g.priority === 'medium').length,
        lowPriority: gaps.filter(g => g.priority === 'low').length
      }
    });
  } catch (error) {
    console.error('Failed to get coverage gaps:', error);
    res.status(500).json({ 
      error: 'Failed to get coverage gaps',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get coverage trends for a project
router.get('/projects/:id/coverage-trends', isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const days = parseInt(req.query.days as string) || 30;

    // Check project ownership first
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check project ownership with proper multi-tenant isolation
    const isDirectOwner = project.userId === req.user?.id;
    const isSameOrgElevated = (req.user?.role === "admin" || req.user?.role === "owner") && 
                             project.organizationId === req.user?.organizationId;
    
    if (!isDirectOwner && !isSameOrgElevated) {
      return res.status(403).json({ error: "Access denied to this project" });
    }

    // Get coverage trends
    const trends = await coverageService.getCoverageTrends(projectId, days);

    res.json({
      trends,
      projectId,
      period: `${days} days`
    });
  } catch (error) {
    console.error('Failed to get coverage trends:', error);
    res.status(500).json({ 
      error: 'Failed to get coverage trends',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get coverage badge for a project
router.get('/projects/:id/coverage-badge', async (req, res) => {
  try {
    const projectId = req.params.id;

    // Get project (public endpoint for badge)
    const project = await storage.getProject(projectId);
    if (!project) {
      // Return default badge for missing project
      const svg = coverageService.generateBadge(0);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(svg);
    }

    // Generate badge based on current coverage
    const coverage = project.testCoverage || 0;
    const svg = coverageService.generateBadge(coverage);

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'max-age=3600');
    res.send(svg);
  } catch (error) {
    console.error('Failed to generate coverage badge:', error);
    // Return error badge
    const svg = coverageService.generateBadge(0);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  }
});

// Enforce coverage threshold for a project
router.put('/projects/:id/coverage-enforcement', isAuthenticated, csrfProtection, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const bodySchema = z.object({
      enforce: z.boolean()
    });

    const { enforce } = bodySchema.parse(req.body);

    // Check project ownership first
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check project ownership with proper multi-tenant isolation
    const isDirectOwner = project.userId === req.user?.id;
    const isSameOrgElevated = (req.user?.role === "admin" || req.user?.role === "owner") && 
                             project.organizationId === req.user?.organizationId;
    
    if (!isDirectOwner && !isSameOrgElevated) {
      return res.status(403).json({ error: "Access denied to this project" });
    }

    // Update enforcement setting
    await storage.updateProject(projectId, {
      coverageEnforced: enforce
    });

    res.json({
      success: true,
      projectId,
      coverageEnforced: enforce,
      message: enforce 
        ? 'Coverage enforcement enabled - builds will fail below 85% coverage'
        : 'Coverage enforcement disabled - coverage checks will warn but not block'
    });
  } catch (error) {
    console.error('Failed to update coverage enforcement:', error);
    res.status(500).json({ 
      error: 'Failed to update coverage enforcement',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
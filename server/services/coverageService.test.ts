import { describe, it, expect, vi, beforeEach } from 'vitest';
import { coverageService } from './coverageService';

describe('CoverageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPriority', () => {
    it('should return high priority for coverage below 50%', () => {
      // @ts-ignore - accessing private method for testing
      const priority = coverageService.getPriority(45);
      expect(priority).toBe('high');
    });

    it('should return medium priority for coverage between 50-70%', () => {
      // @ts-ignore - accessing private method for testing
      const priority = coverageService.getPriority(60);
      expect(priority).toBe('medium');
    });

    it('should return low priority for coverage above 70%', () => {
      // @ts-ignore - accessing private method for testing
      const priority = coverageService.getPriority(75);
      expect(priority).toBe('low');
    });
  });

  describe('generateBadge', () => {
    it('should generate green badge for coverage >= 85%', () => {
      const svg = coverageService.generateBadge(90);
      expect(svg).toContain('#4c1'); // Green color
      expect(svg).toContain('90.0%');
    });

    it('should generate yellow badge for coverage between 70-85%', () => {
      const svg = coverageService.generateBadge(75);
      expect(svg).toContain('#dfb317'); // Yellow color
      expect(svg).toContain('75.0%');
    });

    it('should generate red badge for coverage below 70%', () => {
      const svg = coverageService.generateBadge(50);
      expect(svg).toContain('#e05d44'); // Red color
      expect(svg).toContain('50.0%');
    });
  });

  describe('extractMetrics', () => {
    it('should correctly extract coverage metrics from summary', () => {
      const summary = {
        statements: { total: 100, covered: 85, pct: 85 },
        branches: { total: 50, covered: 42, pct: 84 },
        functions: { total: 20, covered: 18, pct: 90 },
        lines: { total: 100, covered: 86, pct: 86 }
      };

      // @ts-ignore - accessing private method for testing
      const metrics = coverageService.extractMetrics(summary);

      expect(metrics.statements.percentage).toBe(85);
      expect(metrics.branches.percentage).toBe(84);
      expect(metrics.functions.percentage).toBe(90);
      expect(metrics.lines.percentage).toBe(86);
    });
  });
});
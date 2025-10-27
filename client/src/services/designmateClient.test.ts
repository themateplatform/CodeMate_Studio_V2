/**
 * Tests for DesignMate Studio API Client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DesignMateClient } from './designmateClient';

describe('DesignMateClient', () => {
  let client: DesignMateClient;

  beforeEach(() => {
    // Mock environment variables
    vi.stubEnv('VITE_DESIGNMATE_API_URL', 'https://test-api.com');
    vi.stubEnv('VITE_DESIGNMATE_API_KEY', 'test-key');
    
    client = new DesignMateClient();
    
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  describe('getTokensForApp', () => {
    it('should fetch tokens from API when configured', async () => {
      const mockTokens = {
        colors: {
          primary: '#3b82f6',
          secondary: '#8b5cf6',
          accent: '#f59e0b',
          background: '#ffffff',
          foreground: '#000000'
        },
        typography: {
          fontFamily: {
            sans: 'Inter, system-ui, sans-serif',
            mono: 'Monaco, monospace'
          },
          fontSize: {
            sm: '0.875rem',
            base: '1rem'
          },
          fontWeight: {
            normal: 400,
            medium: 500
          }
        },
        spacing: {
          sm: '0.5rem',
          md: '1rem'
        },
        radius: {
          sm: '0.25rem',
          md: '0.5rem'
        },
        shadow: {
          sm: '0 1px 2px rgba(0,0,0,0.05)'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens
      });

      const tokens = await client.getTokensForApp('employse');

      expect(tokens).toEqual(mockTokens);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.com/api/tokens/employse',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should return fallback tokens when API fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const tokens = await client.getTokensForApp('employse');

      expect(tokens).toBeDefined();
      expect(tokens.colors.primary).toBeDefined();
      expect(tokens.typography.fontFamily.sans).toBeDefined();
    });

    it('should return fallback tokens when API returns error status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const tokens = await client.getTokensForApp('employse');

      expect(tokens).toBeDefined();
      expect(tokens.colors.primary).toBe('#3b82f6');
    });
  });

  describe('validateCompliance', () => {
    it('should validate code against design system', async () => {
      const mockReport = {
        compliant: false,
        violations: [
          {
            line: 1,
            message: 'Hardcoded color value',
            severity: 'error' as const
          }
        ],
        score: 75
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReport
      });

      const report = await client.validateCompliance('<div>test</div>', 'employse');

      expect(report).toEqual(mockReport);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.com/api/validate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ code: '<div>test</div>', app: 'employse' })
        })
      );
    });

    it('should return compliant report when API fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const report = await client.validateCompliance('<div>test</div>', 'employse');

      expect(report.compliant).toBe(true);
      expect(report.violations).toEqual([]);
      expect(report.score).toBe(100);
    });
  });

  describe('getAvailableApps', () => {
    it('should fetch available apps from API', async () => {
      const mockApps = {
        apps: ['employse', 'hottr', 'noche', 'custom']
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApps
      });

      const apps = await client.getAvailableApps();

      expect(apps).toEqual(mockApps.apps);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.com/api/apps',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });

    it('should return default apps when API fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const apps = await client.getAvailableApps();

      expect(apps).toEqual(['employse', 'hottr', 'noche', 'default']);
    });
  });

  describe('fallback behavior', () => {
    it('should use fallback tokens when API URL not configured', async () => {
      vi.stubEnv('VITE_DESIGNMATE_API_URL', '');
      const unconfiguredClient = new DesignMateClient();

      const tokens = await unconfiguredClient.getTokensForApp('employse');

      expect(tokens.colors.primary).toBe('#3b82f6');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return default apps when API URL not configured', async () => {
      vi.stubEnv('VITE_DESIGNMATE_API_URL', '');
      const unconfiguredClient = new DesignMateClient();

      const apps = await unconfiguredClient.getAvailableApps();

      expect(apps).toEqual(['employse', 'hottr', 'noche', 'default']);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return compliant report when API URL not configured', async () => {
      vi.stubEnv('VITE_DESIGNMATE_API_URL', '');
      const unconfiguredClient = new DesignMateClient();

      const report = await unconfiguredClient.validateCompliance('<div>test</div>', 'employse');

      expect(report.compliant).toBe(true);
      expect(report.score).toBe(100);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});

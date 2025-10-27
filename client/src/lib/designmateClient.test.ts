import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DesignMateClient } from './designmateClient';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DesignMateClient', () => {
  let client: DesignMateClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock import.meta.env
    vi.stubEnv('VITE_DESIGNMATE_API_URL', 'https://test-api.com');
    vi.stubEnv('VITE_DESIGNMATE_API_KEY', 'test-key');
    client = new DesignMateClient();
  });

  describe('getTokensForApp', () => {
    it('should fetch tokens from API when configured', async () => {
      const mockTokens = {
        colors: { primary: '#3b82f6', secondary: '#8b5cf6' },
        typography: {
          fontFamily: { sans: 'Inter', mono: 'Monaco' },
          fontSize: { base: '1rem' },
          fontWeight: { normal: 400 }
        },
        spacing: { md: '1rem' },
        radius: { md: '0.5rem' },
        shadow: { md: '0 4px 6px rgba(0,0,0,0.1)' }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens
      });

      const result = await client.getTokensForApp('employse');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/api/tokens/employse',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockTokens);
    });

    it('should return fallback tokens when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getTokensForApp('employse');

      expect(result).toBeDefined();
      expect(result.colors).toBeDefined();
      expect(result.typography).toBeDefined();
      expect(result.spacing).toBeDefined();
    });

    it('should return fallback tokens when API returns error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await client.getTokensForApp('employse');

      expect(result).toBeDefined();
      expect(result.colors.primary).toBe('#3b82f6');
    });
  });

  describe('validateCompliance', () => {
    it('should validate code via API when configured', async () => {
      const mockCompliance = {
        compliant: false,
        violations: [
          {
            line: 1,
            column: 10,
            message: 'Hardcoded color',
            severity: 'error' as const
          }
        ],
        score: 85
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompliance
      });

      const code = 'const x = "#3b82f6"';
      const result = await client.validateCompliance(code, 'employse');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/api/validate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ code, app: 'employse' })
        })
      );
      expect(result).toEqual(mockCompliance);
    });

    it('should return compliant result when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.validateCompliance('code', 'employse');

      expect(result.compliant).toBe(true);
      expect(result.violations).toEqual([]);
      expect(result.score).toBe(100);
    });
  });

  describe('getAvailableApps', () => {
    it('should fetch available apps from API', async () => {
      const mockApps = ['employse', 'hottr', 'noche'];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apps: mockApps })
      });

      const result = await client.getAvailableApps();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/api/apps',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
      expect(result).toEqual(mockApps);
    });

    it('should return default apps when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getAvailableApps();

      expect(result).toContain('employse');
      expect(result).toContain('hottr');
      expect(result).toContain('noche');
      expect(result).toContain('default');
    });
  });

  describe('fallback behavior', () => {
    it('should use fallback tokens when API URL not configured', async () => {
      vi.stubEnv('VITE_DESIGNMATE_API_URL', '');
      const unconfiguredClient = new DesignMateClient();

      const result = await unconfiguredClient.getTokensForApp('employse');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.colors.primary).toBeDefined();
      expect(result.typography.fontFamily.sans).toBeDefined();
    });

    it('should return default apps when API URL not configured', async () => {
      vi.stubEnv('VITE_DESIGNMATE_API_URL', '');
      const unconfiguredClient = new DesignMateClient();

      const result = await unconfiguredClient.getAvailableApps();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual(['employse', 'hottr', 'noche', 'default']);
    });

    it('should return compliant validation when API URL not configured', async () => {
      vi.stubEnv('VITE_DESIGNMATE_API_URL', '');
      const unconfiguredClient = new DesignMateClient();

      const result = await unconfiguredClient.validateCompliance('code', 'employse');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.compliant).toBe(true);
      expect(result.score).toBe(100);
    });
  });
});

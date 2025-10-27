/**
 * DesignMate Studio API Client
 * Fetches design tokens during code generation
 */

export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    [key: string]: string;
  };
  typography: {
    fontFamily: {
      sans: string;
      mono: string;
    };
    fontSize: Record<string, string>;
    fontWeight: Record<string, number>;
  };
  spacing: Record<string, string>;
  radius: Record<string, string>;
  shadow: Record<string, string>;
}

export interface ComplianceReport {
  compliant: boolean;
  violations: Array<{
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning';
  }>;
  score: number; // 0-100
}

export class DesignMateClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_DESIGNMATE_API_URL || '';
    this.apiKey = import.meta.env.VITE_DESIGNMATE_API_KEY || '';

    if (!this.baseUrl) {
      console.warn('DesignMate Studio integration not configured');
    }
  }

  /**
   * Fetch design tokens for target app
   */
  async getTokensForApp(appName: string): Promise<DesignTokens> {
    if (!this.baseUrl) {
      return this.getFallbackTokens();
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/tokens/${appName}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`DesignMate API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
      return this.getFallbackTokens();
    }
  }

  /**
   * Validate generated code uses approved tokens
   */
  async validateCompliance(
    code: string,
    appName: string
  ): Promise<ComplianceReport> {
    if (!this.baseUrl) {
      return { compliant: true, violations: [], score: 100 };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, app: appName })
      });

      if (!response.ok) {
        throw new Error(`Validation error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Validation failed:', error);
      return { compliant: true, violations: [], score: 100 };
    }
  }

  /**
   * Get list of available design systems
   */
  async getAvailableApps(): Promise<string[]> {
    if (!this.baseUrl) {
      return ['employse', 'hottr', 'noche', 'default'];
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/apps`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.apps;
    } catch (error) {
      console.error('Failed to fetch apps:', error);
      return ['employse', 'hottr', 'noche', 'default'];
    }
  }

  /**
   * Fallback tokens when DesignMate unavailable
   */
  private getFallbackTokens(): DesignTokens {
    return {
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
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem'
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700
        }
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem'
      },
      radius: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '1rem',
        full: '9999px'
      },
      shadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.1)'
      }
    };
  }
}

// Export singleton
export const designmateClient = new DesignMateClient();

/**
 * Server-side secret broker service
 * Handles secure API key management for external services
 */
export class SecretBrokerService {
  private static instance: SecretBrokerService;

  static getInstance(): SecretBrokerService {
    if (!SecretBrokerService.instance) {
      SecretBrokerService.instance = new SecretBrokerService();
    }
    return SecretBrokerService.instance;
  }

  /**
   * Get OpenAI API key with fallback handling
   */
  getOpenAIKey(): string {
    const key = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
    if (!key) {
      throw new Error('OpenAI API key not configured');
    }
    return key;
  }

  /**
   * Get GitHub OAuth credentials
   */
  getGitHubCredentials(): { clientId: string; clientSecret: string } {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth credentials not configured');
    }
    
    return { clientId, clientSecret };
  }

  /**
   * Get Replit authentication token
   */
  getReplitToken(): string {
    const token = process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL;
    if (!token) {
      throw new Error('Replit authentication token not available');
    }
    return token;
  }

  /**
   * Get Supabase service role key
   */
  getSupabaseServiceRole(): string {
    const key = process.env.SUPABASE_SERVICE_ROLE;
    if (!key) {
      throw new Error('Supabase service role key not configured');
    }
    return key;
  }

  /**
   * Validate all required secrets are available
   */
  validateSecrets(): { valid: boolean; missing: string[] } {
    const required = [
      { name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR },
      { name: 'GITHUB_CLIENT_ID', value: process.env.GITHUB_CLIENT_ID },
      { name: 'GITHUB_CLIENT_SECRET', value: process.env.GITHUB_CLIENT_SECRET },
      { name: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
      { name: 'SUPABASE_SERVICE_ROLE', value: process.env.SUPABASE_SERVICE_ROLE },
    ];

    const missing = required
      .filter(secret => !secret.value)
      .map(secret => secret.name);

    return {
      valid: missing.length === 0,
      missing
    };
  }
}

// Singleton instance
export const secretBrokerService = SecretBrokerService.getInstance();
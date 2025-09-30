import { supabase } from './supabase'

export interface ProxyRequest {
  provider: 'openai' | 'github';
  action: string;
  payload?: any;
  scope?: string;
}

export interface ProxyResponse {
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    tokens?: number;
    cost?: number;
  };
}

/**
 * Secure API Proxy - routes all external service calls
 * through Supabase Edge Functions without exposing secrets
 */
export class APIProxy {
  private static instance: APIProxy;
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private readonly cacheTTL = 2 * 60 * 1000; // 2 minutes for response caching

  static getInstance(): APIProxy {
    if (!APIProxy.instance) {
      APIProxy.instance = new APIProxy();
    }
    return APIProxy.instance;
  }

  /**
   * Make secure API call through proxy
   */
  async call(provider: ProxyRequest['provider'], action: string, payload?: any): Promise<ProxyResponse> {
    const cacheKey = `${provider}:${action}:${JSON.stringify(payload || {})}`;
    
    // Check cache for cacheable responses (e.g., models list)
    if (this.isCacheable(action)) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() < cached.expires) {
        return { success: true, data: cached.data };
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { success: false, error: 'Authentication required' };
      }

      const { data, error } = await supabase.functions.invoke('secret-broker', {
        body: {
          provider,
          action,
          payload
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('API proxy error:', error);
        return { success: false, error: error.message };
      }

      // Cache cacheable successful responses
      if (data.success && this.isCacheable(action)) {
        this.cache.set(cacheKey, {
          data: data.data,
          expires: Date.now() + this.cacheTTL
        });
      }

      return data;
    } catch (error) {
      console.error('Failed to call API proxy:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * OpenAI-specific helper methods
   */
  async openaiChat(messages: any[], model = 'gpt-4o', options: any = {}): Promise<ProxyResponse> {
    return this.call('openai', 'chat', {
      messages,
      model,
      max_tokens: options.max_tokens || 1000,
      temperature: options.temperature || 0.7,
      ...options
    });
  }

  async openaiCompletion(prompt: string, model = 'gpt-3.5-turbo-instruct', options: any = {}): Promise<ProxyResponse> {
    return this.call('openai', 'completion', {
      prompt,
      model,
      max_tokens: options.max_tokens || 1000,
      temperature: options.temperature || 0.7,
      ...options
    });
  }

  async openaiModels(): Promise<ProxyResponse> {
    return this.call('openai', 'models');
  }

  /**
   * GitHub-specific helper methods
   */
  async githubOAuthURL(redirectUri: string, scope = 'repo,user'): Promise<ProxyResponse> {
    return this.call('github', 'oauth-url', {
      redirectUri,
      scope,
      state: crypto.randomUUID()
    });
  }

  async githubExchangeCode(code: string, redirectUri: string): Promise<ProxyResponse> {
    return this.call('github', 'exchange-code', {
      code,
      redirectUri
    });
  }

  async githubUserRepos(): Promise<ProxyResponse> {
    return this.call('github', 'user-repos', {});
  }

  /**
   * Determine if a response should be cached
   */
  private isCacheable(action: string): boolean {
    const cacheableActions = ['models'];
    return cacheableActions.includes(action);
  }

  /**
   * Clear cache for specific provider or all
   */
  clearCache(provider?: ProxyRequest['provider']): void {
    if (provider) {
      const keys = Array.from(this.cache.keys());
      for (const key of keys) {
        if (key.startsWith(`${provider}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const apiProxy = APIProxy.getInstance();
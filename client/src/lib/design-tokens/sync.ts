/**
 * Design Tokens Runtime Sync
 * 
 * This utility fetches design tokens from HubMate Studio API in development mode
 * and applies them to the document root for live preview without rebuild.
 * 
 * Usage:
 * - Only active in development with VITE_DESIGN_TOKENS_SYNC=true
 * - Fetches from HubMate /api/design-tokens?app=codemate&env=dev&mode=light|dark
 * - Disabled in production for performance
 */

interface DesignToken {
  name: string;
  value: string;
  category: string;
}

interface TokenSyncConfig {
  enabled: boolean;
  apiUrl: string;
  app: string;
  env: string;
  pollInterval?: number; // ms, optional polling
}

class DesignTokenSync {
  private config: TokenSyncConfig;
  private pollTimer?: number;

  constructor(config: TokenSyncConfig) {
    this.config = config;
  }

  /**
   * Initialize token sync - call once on app startup
   */
  async init(): Promise<void> {
    if (!this.config.enabled) {
      console.log('[DesignTokenSync] Disabled - using vendored tokens');
      return;
    }

    console.log('[DesignTokenSync] Initializing...');
    
    // Fetch initial tokens
    await this.fetchAndApplyTokens();

    // Set up polling if configured
    if (this.config.pollInterval) {
      this.startPolling();
    }

    // Listen for theme changes
    this.watchThemeChanges();
  }

  /**
   * Fetch tokens from HubMate API and apply to :root
   */
  async fetchAndApplyTokens(mode?: 'light' | 'dark'): Promise<void> {
    try {
      const currentMode = mode || this.getCurrentMode();
      const url = `${this.config.apiUrl}/api/design-tokens?app=${this.config.app}&env=${this.config.env}&mode=${currentMode}`;
      
      console.log(`[DesignTokenSync] Fetching tokens from ${url}`);
      
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch tokens: ${response.status} ${response.statusText}`);
      }

      const tokens: DesignToken[] = await response.json();
      
      console.log(`[DesignTokenSync] Received ${tokens.length} tokens`);
      
      this.applyTokensToRoot(tokens);
      
      // Dispatch custom event for components that need to react
      window.dispatchEvent(new CustomEvent('design-tokens-updated', { 
        detail: { tokens, mode: currentMode } 
      }));
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[DesignTokenSync] Fetch timeout - request took longer than 10 seconds');
      } else {
        console.error('[DesignTokenSync] Failed to fetch/apply tokens:', error);
      }
      console.log('[DesignTokenSync] Falling back to vendored tokens');
    }
  }

  /**
   * Apply tokens to document :root
   */
  private applyTokensToRoot(tokens: DesignToken[]): void {
    const root = document.documentElement;
    
    tokens.forEach(token => {
      // Convert token name to CSS variable format
      // e.g., "core.brand.primary" -> "--core-brand-primary"
      const varName = `--${token.name.replace(/\./g, '-')}`;
      root.style.setProperty(varName, token.value);
    });
    
    console.log(`[DesignTokenSync] Applied ${tokens.length} tokens to :root`);
  }

  /**
   * Get current theme mode (light/dark)
   */
  private getCurrentMode(): 'light' | 'dark' {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }

  /**
   * Watch for theme changes and refetch tokens
   */
  private watchThemeChanges(): void {
    let debounceTimer: number | undefined;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          // Debounce theme changes to avoid rapid API calls
          if (debounceTimer) {
            window.clearTimeout(debounceTimer);
          }
          
          debounceTimer = window.setTimeout(() => {
            const mode = this.getCurrentMode();
            console.log(`[DesignTokenSync] Theme changed to ${mode}`);
            this.fetchAndApplyTokens(mode);
          }, 300); // 300ms debounce
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  /**
   * Start polling for token updates
   */
  private startPolling(): void {
    if (this.pollTimer) {
      return; // Already polling
    }

    console.log(`[DesignTokenSync] Starting poll every ${this.config.pollInterval}ms`);
    
    this.pollTimer = window.setInterval(() => {
      // Wrap in try-catch to prevent accumulated errors
      try {
        this.fetchAndApplyTokens();
      } catch (error) {
        console.error('[DesignTokenSync] Polling error:', error);
      }
    }, this.config.pollInterval);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollTimer) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = undefined;
      console.log('[DesignTokenSync] Stopped polling');
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopPolling();
  }
}

// Singleton instance
let tokenSyncInstance: DesignTokenSync | null = null;

/**
 * Initialize design token sync (call from main.tsx)
 */
export function initDesignTokenSync(): DesignTokenSync | null {
  // Singleton pattern - return existing instance if already initialized
  if (tokenSyncInstance) {
    return tokenSyncInstance;
  }
  
  // Only enable in development with feature flag
  const enabled = 
    import.meta.env.DEV && 
    import.meta.env.VITE_DESIGN_TOKENS_SYNC === 'true';

  const config: TokenSyncConfig = {
    enabled,
    apiUrl: import.meta.env.VITE_HUBMATE_API_URL || 'http://localhost:3000',
    app: 'codemate',
    env: 'dev',
    pollInterval: import.meta.env.VITE_DESIGN_TOKENS_POLL_INTERVAL 
      ? parseInt(import.meta.env.VITE_DESIGN_TOKENS_POLL_INTERVAL) 
      : undefined,
  };

  if (config.enabled) {
    tokenSyncInstance = new DesignTokenSync(config);
    tokenSyncInstance.init();
  }

  return tokenSyncInstance;
}

/**
 * Get current token sync instance
 */
export function getDesignTokenSync(): DesignTokenSync | null {
  return tokenSyncInstance;
}

/**
 * Manually trigger token refresh (useful for dev tools)
 */
export async function refreshDesignTokens(): Promise<void> {
  if (tokenSyncInstance) {
    await tokenSyncInstance.fetchAndApplyTokens();
  }
}

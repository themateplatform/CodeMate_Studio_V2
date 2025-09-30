/**
 * PWA Configuration
 * Central configuration for Progressive Web App features
 */

export const PWA_CONFIG = {
  // Service Worker configuration
  serviceWorker: {
    scope: '/',
    cacheName: 'codemate-v1.0.0',
    apiCacheName: 'codemate-api-v1',
    offlineUrl: '/offline.html',
    skipWaiting: true
  },

  // Cache strategies
  caching: {
    staticAssets: {
      strategy: 'cache-first',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxEntries: 100
    },
    apiResponses: {
      strategy: 'network-first',
      maxAge: 5 * 60 * 1000, // 5 minutes
      maxEntries: 50
    },
    documents: {
      strategy: 'network-first',
      maxAge: 60 * 60 * 1000, // 1 hour
      maxEntries: 20
    }
  },

  // Background sync configuration
  backgroundSync: {
    tags: {
      PROJECT_SAVE: 'project-save',
      FILE_UPLOAD: 'file-upload',
      CHAT_MESSAGE: 'chat-message',
      GITHUB_SYNC: 'github-sync'
    },
    retryInterval: 30000, // 30 seconds
    maxRetries: 5
  },

  // Push notifications
  pushNotifications: {
    vapidPublicKey: '', // Would be set from environment
    topics: {
      PROJECT_UPDATES: 'project-updates',
      COLLABORATION: 'collaboration',
      SYSTEM_UPDATES: 'system-updates'
    }
  },

  // Installation prompt
  installation: {
    showAfterVisits: 3,
    showAfterDays: 1,
    reminderInterval: 7 * 24 * 60 * 60 * 1000 // 7 days
  },

  // Features flags
  features: {
    offlineMode: true,
    backgroundSync: true,
    pushNotifications: true,
    installPrompt: true,
    updateNotifications: true,
    persistentStorage: true
  },

  // App information
  app: {
    name: 'CodeMate Studio',
    shortName: 'CodeMate',
    description: 'AI-powered code generation and development platform',
    version: '1.0.0',
    themeColor: '#000000',
    backgroundColor: '#000000'
  },

  // Update check configuration
  updates: {
    checkInterval: 60000, // 1 minute
    forceUpdateAfterDays: 7,
    showUpdateAvailable: true
  }
} as const;

/**
 * PWA capabilities detection
 */
export const PWA_CAPABILITIES = {
  isServiceWorkerSupported: (): boolean => 'serviceWorker' in navigator,
  
  isCacheSupported: (): boolean => 'caches' in window,
  
  isNotificationSupported: (): boolean => 'Notification' in window,
  
  isPushSupported: (): boolean => 
    'serviceWorker' in navigator && 'PushManager' in window,
  
  isBackgroundSyncSupported: (): boolean =>
    'serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype,
  
  isPersistentStorageSupported: (): boolean =>
    'storage' in navigator && 'persist' in navigator.storage,
  
  isInstallSupported: (): boolean =>
    'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window,
  
  isFullySupported: (): boolean => {
    const capabilities = PWA_CAPABILITIES;
    return capabilities.isServiceWorkerSupported() && 
           capabilities.isCacheSupported() &&
           capabilities.isNotificationSupported() &&
           capabilities.isPushSupported();
  }
};

/**
 * PWA metrics and analytics
 */
export interface PWAMetrics {
  installationRate: number;
  offlineUsage: number;
  cacheHitRate: number;
  updateAdoptionRate: number;
  backgroundSyncSuccess: number;
  notificationEngagement: number;
}

/**
 * PWA event types
 */
export type PWAEventType = 
  | 'install'
  | 'update-available'
  | 'update-installed'
  | 'offline'
  | 'online'
  | 'background-sync'
  | 'push-received'
  | 'notification-clicked';

export interface PWAEvent {
  type: PWAEventType;
  timestamp: number;
  data?: any;
}

/**
 * PWA analytics helper
 */
export class PWAAnalytics {
  private events: PWAEvent[] = [];

  track(type: PWAEventType, data?: any): void {
    const event: PWAEvent = {
      type,
      timestamp: Date.now(),
      data
    };
    
    this.events.push(event);
    
    // Send to analytics service (would be implemented)
    console.log('[PWA Analytics]', event);
  }

  getMetrics(): PWAMetrics {
    // Calculate metrics from events
    return {
      installationRate: 0,
      offlineUsage: 0,
      cacheHitRate: 0,
      updateAdoptionRate: 0,
      backgroundSyncSuccess: 0,
      notificationEngagement: 0
    };
  }

  getEvents(type?: PWAEventType): PWAEvent[] {
    if (type) {
      return this.events.filter(event => event.type === type);
    }
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }
}

// Create singleton analytics instance
export const pwaAnalytics = new PWAAnalytics();
/**
 * Progressive Web App (PWA) Integration
 * Handles service worker registration, installation prompts, and offline capabilities
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAStatus {
  isInstalled: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  serviceWorkerReady: boolean;
  updateAvailable: boolean;
}

class PWAManager {
  private installPrompt: BeforeInstallPromptEvent | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private statusCallbacks: ((status: PWAStatus) => void)[] = [];

  constructor() {
    this.init();
  }

  /**
   * Initialize PWA functionality
   */
  private async init() {
    // Register service worker
    await this.registerServiceWorker();
    
    // Setup installation prompt handling
    this.setupInstallPrompt();
    
    // Setup online/offline detection
    this.setupNetworkDetection();
    
    // Setup update detection
    this.setupUpdateDetection();
    
    // Notify status change
    this.notifyStatusChange();
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Worker not supported');
      return;
    }

    // Ensure the service worker script is reachable on the current origin before attempting to register.
    // This prevents noisy errors when the app is previewed under a different host that doesn't serve /sw.js.
    try {
      const controllerUrl = '/sw.js';
      // Use a short HEAD request to verify existence. Some environments may not allow HEAD; fall back to GET.
      let headOk = false;
      try {
        const headResp = await fetch(controllerUrl, { method: 'HEAD' });
        headOk = headResp.ok;
      } catch (headErr) {
        // HEAD might be blocked by some proxies; try a GET without downloading the body (only used as a probe).
        try {
          const getResp = await fetch(controllerUrl, { method: 'GET' });
          headOk = getResp.ok;
        } catch (getErr) {
          headOk = false;
        }
      }

      if (!headOk) {
        console.warn('[PWA] /sw.js not found on this origin — skipping service worker registration');
        return;
      }
    } catch (error) {
      console.warn('[PWA] Could not verify /sw.js existence — skipping service worker registration', error);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      this.swRegistration = registration;
      console.log('[PWA] Service Worker registered successfully');

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New service worker available');
              this.notifyStatusChange();
            }
          });
        }
      });

      // Initial update check
      this.checkForUpdates();

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  }

  /**
   * Setup install prompt handling
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as BeforeInstallPromptEvent;
      console.log('[PWA] Install prompt available');
      this.notifyStatusChange();
    });

    // Handle successful installation
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.installPrompt = null;
      this.notifyStatusChange();
    });
  }

  /**
   * Setup network detection
   */
  private setupNetworkDetection(): void {
    const updateOnlineStatus = () => {
      console.log('[PWA] Network status changed:', navigator.onLine ? 'online' : 'offline');
      this.notifyStatusChange();
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  /**
   * Setup update detection
   */
  private setupUpdateDetection(): void {
    // Check for updates periodically
    setInterval(() => {
      this.checkForUpdates();
    }, 60000); // Check every minute
  }

  /**
   * Check for service worker updates
   */
  private async checkForUpdates(): Promise<void> {
    if (!this.swRegistration) return;

    try {
      await this.swRegistration.update();
    } catch (error) {
      console.error('[PWA] Update check failed:', error);
    }
  }

  /**
   * Get current PWA status
   */
  public getStatus(): PWAStatus {
    return {
      isInstalled: this.isInstalled(),
      isInstallable: this.installPrompt !== null,
      isOnline: navigator.onLine,
      serviceWorkerReady: this.swRegistration !== null,
      updateAvailable: this.isUpdateAvailable()
    };
  }

  /**
   * Check if app is installed
   */
  public isInstalled(): boolean {
    // Check for various installation indicators
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
    
    return isStandalone || isFullscreen || isMinimalUI || 
           (window.navigator as any).standalone === true;
  }

  /**
   * Check if update is available
   */
  public isUpdateAvailable(): boolean {
    if (!this.swRegistration) return false;
    
    return !!(this.swRegistration.waiting || 
             (this.swRegistration.installing && 
              navigator.serviceWorker.controller));
  }

  /**
   * Prompt user to install app
   */
  public async promptInstall(): Promise<boolean> {
    if (!this.installPrompt) {
      console.warn('[PWA] Install prompt not available');
      return false;
    }

    try {
      await this.installPrompt.prompt();
      const choiceResult = await this.installPrompt.userChoice;
      
      const accepted = choiceResult.outcome === 'accepted';
      console.log('[PWA] Install prompt result:', choiceResult.outcome);
      
      if (accepted) {
        this.installPrompt = null;
        this.notifyStatusChange();
      }
      
      return accepted;
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      return false;
    }
  }

  /**
   * Apply available update
   */
  public async applyUpdate(): Promise<void> {
    if (!this.swRegistration?.waiting) {
      console.warn('[PWA] No update available');
      return;
    }

    // Send message to waiting service worker to skip waiting
    this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload page when new service worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  /**
   * Clear all caches (useful for debugging)
   */
  public async clearCaches(): Promise<void> {
    if (!('caches' in window)) {
      console.warn('[PWA] Cache API not supported');
      return;
    }

    try {
      const cacheNames = await caches.keys();
      const codemateCaches = cacheNames.filter(name => name.startsWith('codemate-'));
      
      await Promise.all(
        codemateCaches.map(name => caches.delete(name))
      );
      
      console.log('[PWA] All caches cleared');
    } catch (error) {
      console.error('[PWA] Failed to clear caches:', error);
    }
  }

  /**
   * Get cache usage statistics
   */
  public async getCacheInfo(): Promise<{ size: number; count: number }> {
    if (!('caches' in window)) {
      return { size: 0, count: 0 };
    }

    try {
      const cacheNames = await caches.keys();
      const codemateCaches = cacheNames.filter(name => name.startsWith('codemate-'));
      
      let totalSize = 0;
      let totalCount = 0;

      for (const cacheName of codemateCaches) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        totalCount += requests.length;

        // Estimate cache size (rough calculation)
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const arrayBuffer = await response.clone().arrayBuffer();
            totalSize += arrayBuffer.byteLength;
          }
        }
      }

      return { 
        size: totalSize, 
        count: totalCount 
      };
    } catch (error) {
      console.error('[PWA] Failed to get cache info:', error);
      return { size: 0, count: 0 };
    }
  }

  /**
   * Subscribe to PWA status changes
   */
  public onStatusChange(callback: (status: PWAStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all status change callbacks
   */
  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[PWA] Status callback error:', error);
      }
    });
  }

  /**
   * Send message to service worker
   */
  public sendMessageToSW(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!navigator.serviceWorker.controller) {
        reject(new Error('No active service worker'));
        return;
      }

      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      navigator.serviceWorker.controller.postMessage(message, [channel.port2]);
    });
  }

  /**
   * Request persistent storage (for important data)
   */
  public async requestPersistentStorage(): Promise<boolean> {
    if (!('storage' in navigator) || !('persist' in navigator.storage)) {
      console.warn('[PWA] Persistent storage not supported');
      return false;
    }

    try {
      const isPersistent = await navigator.storage.persist();
      console.log('[PWA] Persistent storage:', isPersistent ? 'granted' : 'denied');
      return isPersistent;
    } catch (error) {
      console.error('[PWA] Failed to request persistent storage:', error);
      return false;
    }
  }

  /**
   * Get storage usage estimate
   */
  public async getStorageEstimate(): Promise<StorageEstimate | null> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      console.warn('[PWA] Storage estimate not supported');
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      console.log('[PWA] Storage estimate:', estimate);
      return estimate;
    } catch (error) {
      console.error('[PWA] Failed to get storage estimate:', error);
      return null;
    }
  }
}

// Create singleton instance
export const pwaManager = new PWAManager();

// Export types
export type { PWAStatus, BeforeInstallPromptEvent };

// Utility functions
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isPWACapable = (): boolean => {
  return 'serviceWorker' in navigator && 'caches' in window;
};

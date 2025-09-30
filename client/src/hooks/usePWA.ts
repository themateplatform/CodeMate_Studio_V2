/**
 * React hooks for PWA functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { pwaManager, type PWAStatus } from '@/lib/pwa';

/**
 * Hook for managing PWA status and installation
 */
export function usePWA() {
  const [status, setStatus] = useState<PWAStatus>(() => pwaManager.getStatus());
  const [isInstalling, setIsInstalling] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = pwaManager.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  const promptInstall = useCallback(async () => {
    if (!status.isInstallable || isInstalling) return false;

    setIsInstalling(true);
    try {
      const result = await pwaManager.promptInstall();
      return result;
    } finally {
      setIsInstalling(false);
    }
  }, [status.isInstallable, isInstalling]);

  const applyUpdate = useCallback(async () => {
    if (!status.updateAvailable || isUpdating) return;

    setIsUpdating(true);
    try {
      await pwaManager.applyUpdate();
    } catch (error) {
      console.error('Failed to apply update:', error);
      setIsUpdating(false);
    }
  }, [status.updateAvailable, isUpdating]);

  return {
    ...status,
    isInstalling,
    isUpdating,
    promptInstall,
    applyUpdate
  };
}

/**
 * Hook for network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}

/**
 * Hook for cache management
 */
export function useCache() {
  const [cacheInfo, setCacheInfo] = useState<{ size: number; count: number }>({
    size: 0,
    count: 0
  });
  const [isClearing, setIsClearing] = useState(false);

  const refreshCacheInfo = useCallback(async () => {
    try {
      const info = await pwaManager.getCacheInfo();
      setCacheInfo(info);
    } catch (error) {
      console.error('Failed to get cache info:', error);
    }
  }, []);

  const clearCache = useCallback(async () => {
    if (isClearing) return;

    setIsClearing(true);
    try {
      await pwaManager.clearCaches();
      await refreshCacheInfo();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
    }
  }, [isClearing, refreshCacheInfo]);

  useEffect(() => {
    refreshCacheInfo();
  }, [refreshCacheInfo]);

  return {
    ...cacheInfo,
    isClearing,
    clearCache,
    refreshCacheInfo
  };
}

/**
 * Hook for persistent storage
 */
export function usePersistentStorage() {
  const [isPersistent, setIsPersistent] = useState<boolean | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);

  useEffect(() => {
    const checkPersistence = async () => {
      if ('storage' in navigator && 'persisted' in navigator.storage) {
        try {
          const persistent = await navigator.storage.persisted();
          setIsPersistent(persistent);
        } catch (error) {
          console.error('Failed to check persistence:', error);
        }
      }
    };

    const getEstimate = async () => {
      try {
        const estimate = await pwaManager.getStorageEstimate();
        setStorageEstimate(estimate);
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
      }
    };

    checkPersistence();
    getEstimate();
  }, []);

  const requestPersistence = useCallback(async () => {
    try {
      const granted = await pwaManager.requestPersistentStorage();
      setIsPersistent(granted);
      return granted;
    } catch (error) {
      console.error('Failed to request persistence:', error);
      return false;
    }
  }, []);

  return {
    isPersistent,
    storageEstimate,
    requestPersistence
  };
}

/**
 * Hook for background sync
 */
export function useBackgroundSync() {
  const [isSupported] = useState(
    'serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype
  );

  const queueSync = useCallback(async (tag: string, data?: any) => {
    if (!isSupported) {
      console.warn('Background sync not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Type assertion for sync API
      const syncRegistration = registration as any;
      if (syncRegistration.sync) {
        await syncRegistration.sync.register(tag);
      } else {
        console.warn('Background sync not available');
        return false;
      }
      
      // Store data if provided (would typically use IndexedDB)
      if (data) {
        console.log('Background sync queued:', tag, data);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to queue background sync:', error);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    queueSync
  };
}

/**
 * Hook for push notifications
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    // Check initial permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Check existing subscription
    const checkSubscription = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const existingSubscription = await registration.pushManager.getSubscription();
          
          if (existingSubscription) {
            setIsSubscribed(true);
            setSubscription(existingSubscription);
          }
        } catch (error) {
          console.error('Failed to check push subscription:', error);
        }
      }
    };

    checkSubscription();
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, []);

  const subscribe = useCallback(async (vapidPublicKey?: string) => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey // Would need actual VAPID key
      });

      setIsSubscribed(true);
      setSubscription(pushSubscription);
      
      return pushSubscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }, [permission, requestPermission]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;

    try {
      await subscription.unsubscribe();
      setIsSubscribed(false);
      setSubscription(null);
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }, [subscription]);

  return {
    permission,
    isSubscribed,
    subscription,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window,
    requestPermission,
    subscribe,
    unsubscribe
  };
}
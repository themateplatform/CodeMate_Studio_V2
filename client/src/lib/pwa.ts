// client/src/lib/pwa.ts
// Dev/Codespaces: disable Service Worker; provide safe stubs the app expects.

function isCodespaceHost() {
  return typeof window !== "undefined" &&
    window.location.hostname.endsWith(".app.github.dev");
}

export interface PWAStatus {
  isInstalled: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  serviceWorkerReady: boolean;
  updateAvailable: boolean;
}

export async function registerServiceWorker() {
  const isProd = import.meta.env.MODE === "production";

  // In dev or Codespaces: unregister and bail to avoid reload loops and CORS weirdness.
  if (!isProd || isCodespaceHost()) {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        console.debug("[PWA] Dev/Codespaces: SW unregistered and caches cleared");
      }
    } catch (e) {
      console.debug("[PWA] Dev/Codespaces cleanup warning:", e);
    }
    return;
  }

  // Production-only registration
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      console.debug("[PWA] SW registered", reg);
    } catch (err) {
      console.warn("[PWA] SW registration failed", err);
    }
  }
}

// Minimal stub object so existing imports keep working.
export const pwaManager = {
  getStatus: (): PWAStatus => ({
    isInstalled: false,
    isInstallable: false,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    serviceWorkerReady: false,
    updateAvailable: false
  }),
  onStatusChange: (_cb: (status: PWAStatus) => void) => () => {},
  promptInstall: async () => false,
  applyUpdate: async () => {},
  getCacheInfo: async () => {
    if (typeof window === "undefined" || !("caches" in window)) {
      return { size: 0, count: 0 };
    }

    try {
      const cacheNames = await caches.keys();
      const sizes = await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          let total = 0;
          for (const request of requests) {
            const response = await cache.match(request);
            if (response && response.headers.has("content-length")) {
              total += Number(response.headers.get("content-length")) || 0;
            }
          }
          return total;
        })
      );

      const totalSize = sizes.reduce((acc, size) => acc + size, 0);
      return { size: totalSize, count: cacheNames.length };
    } catch (error) {
      console.debug("[PWA] Unable to inspect caches", error);
      return { size: 0, count: 0 };
    }
  },
  clearCaches: async () => {
    if (typeof window === "undefined" || !("caches" in window)) return;
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch (error) {
      console.debug("[PWA] Unable to clear caches", error);
    }
  },
  getStorageEstimate: async (): Promise<StorageEstimate | null> => {
    try {
      if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
        return await navigator.storage.estimate();
      }
    } catch (error) {
      console.debug("[PWA] storage.estimate failed", error);
    }
    return null;
  },
  requestPersistentStorage: async (): Promise<boolean> => {
    try {
      if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
        return await navigator.storage.persist();
      }
    } catch (error) {
      console.debug("[PWA] storage.persist failed", error);
    }
    return false;
  }
};

// Utilities expected elsewhere in the app
export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Bytes";
  const units = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 && i > 0 ? 2 : 0)} ${units[i]}`;
};

export const isPWACapable = (): boolean => {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && "caches" in window;
};

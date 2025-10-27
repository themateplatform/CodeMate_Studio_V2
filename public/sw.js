/**
 * BuildMate Studio Service Worker
 * Provides offline capabilities, background sync, and push notifications
 */

const CACHE_NAME = 'buildmate-v1.0.0';
const OFFLINE_URL = '/offline.html';
const API_CACHE_NAME = 'buildmate-api-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  // Add critical assets that should be cached
];

// API endpoints that should be cached
const CACHEABLE_API_ROUTES = [
  '/api/auth/user',
  '/api/projects',
  '/api/health',
  '/api/ready',
  '/api/live'
];

// Background sync tags
const SYNC_TAGS = {
  PROJECT_SAVE: 'project-save',
  FILE_UPLOAD: 'file-upload',
  CHAT_MESSAGE: 'chat-message',
  GITHUB_SYNC: 'github-sync'
};

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    (async () => {
      try {
        // Cache static assets
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(STATIC_ASSETS);
        
        // Create offline page
        await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
        
        console.log('[SW] Static assets cached successfully');
        
        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Failed to cache static assets:', error);
      }
    })()
  );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          name.startsWith('buildmate-') && name !== CACHE_NAME && name !== API_CACHE_NAME
        );
        
        await Promise.all(
          oldCaches.map(name => caches.delete(name))
        );
        
        console.log('[SW] Old caches cleaned up');
        
        // Claim all clients
        await self.clients.claim();
        
        console.log('[SW] Service worker activated and claimed clients');
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

/**
 * Fetch Event Handler - Network requests interception
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (request.destination === 'document') {
    event.respondWith(handleDocumentRequest(request));
  } else {
    event.respondWith(handleAssetRequest(request));
  }
});

/**
 * Handle API requests with caching and offline fallback
 */
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route));
  
  try {
    // Try network first for API requests
    const response = await fetch(request);
    
    // Cache successful GET requests
    if (response.ok && request.method === 'GET' && isCacheable) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache:', url.pathname);
    
    // Fall back to cache for GET requests
    if (request.method === 'GET' && isCacheable) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('[SW] Serving API request from cache:', url.pathname);
        return cachedResponse;
      }
    }
    
    // For failed non-GET requests, queue for background sync
    if (request.method !== 'GET') {
      await queueBackgroundSync(request);
      return new Response(
        JSON.stringify({
          message: 'Request queued for background sync',
          queued: true,
          offline: true
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Return offline response for failed requests
    return new Response(
      JSON.stringify({
        message: 'Offline - request failed',
        offline: true,
        error: error.message
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle document (HTML) requests
 */
async function handleDocumentRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed for document, trying cache');
    
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fall back to offline page
    console.log('[SW] Serving offline page');
    return await caches.match(OFFLINE_URL);
  }
}

/**
 * Handle static asset requests
 */
async function handleAssetRequest(request) {
  try {
    // Try cache first for assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try network
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Asset request failed:', request.url);
    
    // Return a fallback for failed asset requests
    if (request.destination === 'image') {
      // Return a simple SVG placeholder for failed images
      return new Response(
        '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#f0f0f0"/><text x="50" y="50" text-anchor="middle">Offline</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

/**
 * Background Sync Event Handler
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case SYNC_TAGS.PROJECT_SAVE:
      event.waitUntil(syncProjectSaves());
      break;
    case SYNC_TAGS.FILE_UPLOAD:
      event.waitUntil(syncFileUploads());
      break;
    case SYNC_TAGS.CHAT_MESSAGE:
      event.waitUntil(syncChatMessages());
      break;
    case SYNC_TAGS.GITHUB_SYNC:
      event.waitUntil(syncGitHubOperations());
      break;
    default:
      console.log('[SW] Unknown sync tag:', event.tag);
  }
});

/**
 * Push Notification Event Handler
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      notificationData = { title: 'BuildMate Studio', body: event.data.text() };
    }
  }
  
  const options = {
    title: notificationData.title || 'BuildMate Studio',
    body: notificationData.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: notificationData.data || {},
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icons/action-open.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ],
    requireInteraction: notificationData.requireInteraction || false,
    silent: notificationData.silent || false,
    tag: notificationData.tag || 'default'
  };
  
  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

/**
 * Notification Click Event Handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Default action or 'open' action
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Queue request for background sync
 */
async function queueBackgroundSync(request) {
  try {
    const url = new URL(request.url);
    const body = await request.text();
    
    // Store request data in IndexedDB for background sync
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
      timestamp: Date.now()
    };
    
    // Determine sync tag based on URL
    let syncTag = SYNC_TAGS.PROJECT_SAVE; // default
    
    if (url.pathname.includes('/projects')) {
      syncTag = SYNC_TAGS.PROJECT_SAVE;
    } else if (url.pathname.includes('/files')) {
      syncTag = SYNC_TAGS.FILE_UPLOAD;
    } else if (url.pathname.includes('/chat')) {
      syncTag = SYNC_TAGS.CHAT_MESSAGE;
    } else if (url.pathname.includes('/github')) {
      syncTag = SYNC_TAGS.GITHUB_SYNC;
    }
    
    // Store in IndexedDB (simplified for now)
    console.log('[SW] Queuing request for background sync:', syncTag);
    
    // Register background sync
    if ('serviceWorker' in self && 'sync' in self.registration) {
      await self.registration.sync.register(syncTag);
    }
    
  } catch (error) {
    console.error('[SW] Failed to queue background sync:', error);
  }
}

/**
 * Background sync implementations
 */
async function syncProjectSaves() {
  console.log('[SW] Syncing project saves...');
  // Implementation would retrieve queued saves from IndexedDB and sync to server
}

async function syncFileUploads() {
  console.log('[SW] Syncing file uploads...');
  // Implementation would retry failed file uploads
}

async function syncChatMessages() {
  console.log('[SW] Syncing chat messages...');
  // Implementation would sync offline chat messages
}

async function syncGitHubOperations() {
  console.log('[SW] Syncing GitHub operations...');
  // Implementation would retry GitHub API calls
}

/**
 * Message handler for communication with main thread
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
      case 'CLEAR_CACHE':
        clearAllCaches().then(() => {
          event.ports[0].postMessage({ success: true });
        });
        break;
      default:
        console.log('[SW] Unknown message type:', event.data.type);
    }
  }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(name => name.startsWith('buildmate-'))
      .map(name => caches.delete(name))
  );
  console.log('[SW] All caches cleared');
}
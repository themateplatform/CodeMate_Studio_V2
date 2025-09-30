import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Clear any existing service workers to prevent caching issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('[DEBUG] Unregistered service worker:', registration);
    }
  });
}

// Initialize PWA functionality - TEMPORARILY DISABLED FOR DEBUGGING
// import { pwaManager } from "./lib/pwa";

// Clear any cached data
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
      console.log('[DEBUG] Cleared cache:', name);
    });
  });
}

console.log('[DEBUG] Starting React app initialization...');
console.log('[DEBUG] Window location:', window.location.href);
console.log('[DEBUG] Document ready state:', document.readyState);

try {
  const rootElement = document.getElementById("root");
  console.log('[DEBUG] Root element found:', !!rootElement);
  console.log('[DEBUG] Root element innerHTML:', rootElement?.innerHTML);
  
  if (rootElement) {
    const root = createRoot(rootElement);
    console.log('[DEBUG] React root created successfully');
    
    root.render(<App />);
    console.log('[DEBUG] React app rendered successfully');
  } else {
    console.error('[DEBUG] Root element not found!');
    console.error('[DEBUG] Document body:', document.body);
  }
} catch (error) {
  console.error('[DEBUG] Error initializing React app:', error);
  if (error instanceof Error) {
    console.error('[DEBUG] Error stack:', error.stack);
  }
}

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initDesignTokenSync } from "./lib/design-tokens";

// Initialize design token sync (only active in dev with flag)
initDesignTokenSync();

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

// Check if CSS is loaded
const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style');
console.log('[DEBUG] Stylesheets found:', stylesheets.length);
stylesheets.forEach((sheet, index) => {
  console.log(`[DEBUG] Stylesheet ${index}:`, sheet.outerHTML);
});

// Check if Tailwind classes are working
const testElement = document.createElement('div');
testElement.className = 'bg-primary text-primary-foreground p-4';
document.body.appendChild(testElement);
const computedStyle = window.getComputedStyle(testElement);
console.log('[DEBUG] Tailwind test - background color:', computedStyle.backgroundColor);
console.log('[DEBUG] Tailwind test - color:', computedStyle.color);
document.body.removeChild(testElement);

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

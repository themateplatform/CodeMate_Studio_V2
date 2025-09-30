import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize PWA functionality - TEMPORARILY DISABLED FOR DEBUGGING
// import { pwaManager } from "./lib/pwa";

// Initialize PWA (this happens automatically when imported)
console.log('[DEBUG] Starting React app initialization...');

try {
  const rootElement = document.getElementById("root");
  console.log('[DEBUG] Root element found:', !!rootElement);
  
  if (rootElement) {
    createRoot(rootElement).render(<App />);
    console.log('[DEBUG] React app rendered successfully');
  } else {
    console.error('[DEBUG] Root element not found!');
  }
} catch (error) {
  console.error('[DEBUG] Error initializing React app:', error);
}

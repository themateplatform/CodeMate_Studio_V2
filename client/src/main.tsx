import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize PWA functionality
import { pwaManager } from "./lib/pwa";

// Initialize PWA (this happens automatically when imported)
console.log('[PWA] Initializing Progressive Web App features...');

createRoot(document.getElementById("root")!).render(<App />);

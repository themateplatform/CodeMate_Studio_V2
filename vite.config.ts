import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { componentTagger } from "lovable-tagger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('[Vite Config] Loading vite.config.ts');
console.log('[Vite Config] __dirname:', __dirname);

export default defineConfig(async ({ mode }) => {
  console.log('[Vite Config] Mode:', mode);
  console.log('[Vite Config] NODE_ENV:', process.env.NODE_ENV);
  
  const aliases = {
    "@": path.resolve(__dirname, "client", "src"),
    "@shared": path.resolve(__dirname, "shared"),
    "@assets": path.resolve(__dirname, "attached_assets"),
  };
  
  console.log('[Vite Config] Aliases configured:', aliases);
  
  return {
    plugins: [
      react(),
      runtimeErrorOverlay(),
      mode === 'development' && componentTagger(),
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer(),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ].filter(Boolean),
    resolve: {
      alias: aliases,
    },
    build: {
      outDir: "dist/public",
      emptyOutDir: true,
    },
    server: {
      port: 8080,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});

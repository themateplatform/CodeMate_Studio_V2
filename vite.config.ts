import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { componentTagger } from "lovable-tagger";

export default defineConfig(async ({ mode }) => ({
  plugins: [
    react(),
    // Only enable the replit runtime error overlay when running inside Replit (REPL_ID present)
    (process.env.REPL_ID !== undefined ? runtimeErrorOverlay() : null),
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
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
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
}));

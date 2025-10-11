import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

const viteLogger = createLogger();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  log('Loading Vite configuration from vite.config.ts...');
  
  const vite = await createViteServer({
    // Let Vite load vite.config.ts - critical for React, Tailwind, aliases, etc.
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // Don't exit - allow HMR to recover from transient errors
      },
    },
  });
  
  log('Vite server created successfully with React + Tailwind processing');

  app.use(vite.middlewares);

  // Serve service worker and other public assets
  app.use("/sw.js", (req, res) => {
    const swPath = path.resolve(__dirname, "..", "public", "sw.js");
    if (fs.existsSync(swPath)) {
      res.setHeader("Content-Type", "application/javascript");
      res.sendFile(swPath);
    } else {
      res.status(404).send("Service worker not found");
    }
  });

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(__dirname, "..", "index.html");

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/client/src/main.tsx"`,
        `src="/client/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");
  const builtSwPath = path.resolve(distPath, "sw.js");
  const publicSwPath = path.resolve(__dirname, "..", "public", "sw.js");

  log(`Looking for build directory at: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Explicitly serve the service worker if present in the built output or the public folder.
  app.get('/sw.js', (req, res) => {
    if (fs.existsSync(builtSwPath)) {
      res.setHeader("Content-Type", "application/javascript");
      res.sendFile(builtSwPath);
      return;
    }

    if (fs.existsSync(publicSwPath)) {
      res.setHeader("Content-Type", "application/javascript");
      res.sendFile(publicSwPath);
      return;
    }

    res.status(404).send('Service worker not found');
  });

  log('Serving static files from dist/public');
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    log(`Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath);
  });
}

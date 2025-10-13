import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import fs from "fs";
import path from "path";
// import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { healthRouter, trackRequest } from "./health";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    const isError = res.statusCode >= 400;
    
    // Track performance metrics for observability
    trackRequest(duration, isError);
    
    if (requestPath.startsWith("/api")) {
      // Safe logging without exposing sensitive response data
      let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
      
      // Only log response metadata, never actual response bodies to prevent secret exposure
      if (capturedJsonResponse && typeof capturedJsonResponse === 'object') {
        const responseSize = JSON.stringify(capturedJsonResponse).length;
        logLine += ` :: ${responseSize}b response`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Add health check routes
  app.use('/', healthRouter);

  // Mount API routes
  try {
    // Auth routes (supabase-backed)
    const authRouter = await import('./routes/auth');
    app.use('/api/auth', authRouter.default);
  } catch (err) {
    console.warn('Auth routes not available:', err);
  }
  try {
    const supaCfg = await import('./routes/supabase-config');
    app.use(supaCfg.default);
  } catch (err) {
    console.warn('Supabase config route not available:', err);
  }
  try {
    const adminRouter = await import('./routes/admin');
    app.use('/api/admin', adminRouter.default);
  } catch (err) {
    console.warn('Admin routes not available:', err);
  }

  // const server = await registerRoutes(app);
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  const hasBuiltAssets = fs.existsSync(distPath);
  const isProductionEnv = process.env.NODE_ENV === "production";
  const shouldUseDevServer = !isProductionEnv || !hasBuiltAssets;

  log(
    `Environment: ${process.env.NODE_ENV || "not set"}, Running in: ${
      shouldUseDevServer ? "DEVELOPMENT" : "PRODUCTION"
    } mode`,
  );

  if (shouldUseDevServer) {
    if (isProductionEnv && !hasBuiltAssets) {
      log(
        "Production environment detected but build output missing – falling back to Vite dev server for compatibility.",
      );
    }

    log("Setting up Vite development server...");
    await setupVite(app, server);
    log("Vite development server ready");
  } else {
    log("Serving static files from dist...");
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
  
})();

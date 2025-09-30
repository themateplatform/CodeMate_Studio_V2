import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { healthRouter, trackRequest } from "./health";
import { WorkerManager } from "./jobs/worker";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
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
    
    if (path.startsWith("/api")) {
      // Safe logging without exposing sensitive response data
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
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
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
    // Setup WebSocket server after Vite setup to avoid conflicts
    if ((server as any).setupWebSocket) {
      await (server as any).setupWebSocket();
      log("WebSocket server setup completed after Vite");
    }
  } else {
    serveStatic(app);
    // Setup WebSocket server in production as well
    if ((server as any).setupWebSocket) {
      await (server as any).setupWebSocket();
      log("WebSocket server setup completed");
    }
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start background workers for workflow execution
    startBackgroundWorkers();
  });
  
  // Initialize and start background workers
  function startBackgroundWorkers() {
    const workerManager = new WorkerManager();
    
    // Schedule workflow execution every 30 seconds
    setInterval(async () => {
      try {
        await workerManager.runJob('workflow-executor');
      } catch (error) {
        console.error('Workflow executor job failed:', error);
      }
    }, 30000);
    
    // Schedule workflow retry every 1 minute
    setInterval(async () => {
      try {
        await workerManager.runJob('workflow-retry');
      } catch (error) {
        console.error('Workflow retry job failed:', error);
      }
    }, 60000);
    
    log('✅ Background workers initialized - workflow execution every 30s, retry every 1min');
  }
})();

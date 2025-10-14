import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { healthRouter, trackRequest } from "./health";
import { yjsServer } from "./collaboration/yjs-server";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const databaseUrl = process.env.DATABASE_URL?.trim();
const PgSession = connectPgSimple(session);
const sessionPool = databaseUrl
  ? new pg.Pool({ connectionString: databaseUrl })
  : null;

if (!databaseUrl) {
  console.warn("[session] DATABASE_URL not set — using in-memory session store");
  if (process.env.DISABLE_DB !== "1") {
    process.env.DISABLE_DB = "1";
  }
}

const sessionStore = sessionPool
  ? new PgSession({
      pool: sessionPool,
      tableName: "sessions",
      createTableIfMissing: false, // Table already exists in schema
    })
  : new session.MemoryStore();

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
    },
  })
);

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
  try {
    const appBuilderRouter = await import('./routes/appBuilder');
    app.use('/api/app-builder', appBuilderRouter.default);
  } catch (err) {
    console.warn('App builder routes not available:', err);
  }

  // const server = await registerRoutes(app);
  
  // Register all API routes
  registerRoutes(app);
  
  const server = createServer(app);

  // Set up WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ 
    server,
    path: "/collaboration"
  });

  // Initialize Yjs collaboration server
  yjsServer.initialize(wss);

  // Handle WebSocket connections
  wss.on("connection", (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const roomId = url.searchParams.get("room");
    const userId = url.searchParams.get("user");
    const projectId = url.searchParams.get("project");
    const fileId = url.searchParams.get("file");

    if (!roomId || !userId || !projectId || !fileId) {
      ws.close(1008, "Missing required parameters");
      return;
    }

    yjsServer.handleConnection(ws, roomId, userId, projectId, fileId);
  });

  log("WebSocket collaboration server initialized");

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
  const port = Number(process.env.PORT) || 5001;
  server.listen(port, () => {
    log(`serving on port ${port}`);
    log(`WebSocket collaboration available at ws://localhost:${port}/collaboration`);
  });

  // Handle graceful shutdown
  process.on("SIGTERM", async () => {
    log("SIGTERM received, shutting down gracefully");
    await yjsServer.shutdown();
    if (sessionPool) {
      try {
        await sessionPool.end();
      } catch (error) {
        log(
          `Error closing session pool: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
    server.close(() => {
      log("Server closed");
      process.exit(0);
    });
  });

})();

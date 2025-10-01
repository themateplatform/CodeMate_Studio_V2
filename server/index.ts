import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { healthRouter, trackRequest } from "./health";
import { storage } from "./storage";

const app = express();

/**
 * CRITICAL: Trust proxy headers when behind Lovable/HTTPS edge
 * This allows secure cookies to work properly
 */
app.set("trust proxy", 1);

/**
 * Session middleware - MUST be before any route that uses req.session
 * Provides authentication state for both HTTP and WebSocket connections
 */
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "dev_fallback_change_in_production",
  store: storage.sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
  name: "codemate.sid", // Custom session cookie name
});

app.use(cookieParser());
app.use(sessionMiddleware);

/**
 * IMPORTANT: Do NOT add body parsers here!
 * Body parsing is handled in registerRoutes() to ensure:
 * 1. Webhooks get raw bytes for signature verification
 * 2. API routes get parsed JSON
 */

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
  // Add health check routes (basic, no auth)
  app.use('/', healthRouter);
  
  // Register all application routes with session support
  const server = await registerRoutes(app, { sessionMiddleware });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const isDevelopment = process.env.NODE_ENV !== "production";
  log(`Environment: ${process.env.NODE_ENV || 'not set'}, Running in: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);
  
  if (isDevelopment) {
    log('Setting up Vite development server...');
    await setupVite(app, server);
    log('Vite development server ready');
  } else {
    log('Serving static files from dist...');
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

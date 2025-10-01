import type { Express, RequestHandler } from "express";
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import crypto from "crypto";
import csurf from "csurf";

/**
 * Register all application routes with proper middleware ordering:
 * 1. Raw body parsing for webhooks (MUST be first)
 * 2. Standard body parsers for API routes
 * 3. CSRF protection
 * 4. Application routes
 */
export async function registerRoutes(
  app: Express,
  deps: { sessionMiddleware: RequestHandler }
): Promise<ReturnType<typeof createServer>> {
  const { sessionMiddleware } = deps;

  /**
   * PHASE 1: Raw body parsing for webhooks
   * This MUST come before json/urlencoded parsers to preserve raw bytes
   * for signature verification (Stripe, GitHub, etc.)
   */
  app.use(
    "/api/webhooks/*",
    express.raw({ type: "*/*", limit: "2mb" })
  );

  /**
   * PHASE 2: Standard body parsers for all other routes
   * Now that webhooks have raw bytes, parse JSON/forms elsewhere
   */
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  /**
   * PHASE 3: CSRF Protection
   * Protect state-changing operations from cross-site attacks
   */
  const csrfProtection = csurf({ cookie: false }); // Use session-based tokens

  /**
   * PHASE 4: API Routes
   */

  // CSRF token endpoint (no CSRF protection on GET)
  app.get("/api/csrf-token", (req, res) => {
    if (!req.session) {
      return res.status(500).json({ error: "Session not initialized" });
    }
    
    const token =
      (req.session as any).csrfToken ?? ((req.session as any).csrfToken = crypto.randomUUID());
    res.json({ token });
  });

  // Health check (no auth required)
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Session info endpoint
  app.get("/api/session", (req, res) => {
    res.json({
      authenticated: !!(req.session as any)?.user,
      user: (req.session as any)?.user || null,
    });
  });

  // Example protected route with CSRF
  app.post("/api/protected", csrfProtection, (req, res) => {
    if (!(req.session as any)?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.json({ message: "Protected action completed", user: (req.session as any).user });
  });

  /**
   * PHASE 5: WebSocket Setup with Session Sharing
   * Create HTTP server and WebSocket server with shared session auth
   */
  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Store wss on app for access in other modules
  app.set("wss", wss);
  app.set("server", server);

  /**
   * Handle WebSocket upgrades with session authentication
   * The session middleware runs on the upgrade request, giving us req.session
   */
  server.on("upgrade", (req, socket, head) => {
    // Run session middleware on upgrade request
    sessionMiddleware(req as any, {} as any, () => {
      const typedReq = req as any;
      
      // Verify authentication before accepting WebSocket connection
      if (!typedReq.session?.user) {
        console.log("WebSocket upgrade rejected: no authenticated session");
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      console.log(
        `WebSocket upgrade accepted for user: ${typedReq.session.user.email}`
      );

      // Accept the WebSocket connection
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    });
  });

  /**
   * WebSocket connection handler
   * At this point, the connection is authenticated
   */
  wss.on("connection", (ws, req) => {
    const session = (req as any).session;
    const userId = session?.user?.id;

    console.log(`WebSocket connected: user ${userId}`);

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`WebSocket message from ${userId}:`, message.type);

        // Echo back for now (implement your WS logic here)
        ws.send(
          JSON.stringify({
            type: "ack",
            originalType: message.type,
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format",
          })
        );
      }
    });

    ws.on("close", () => {
      console.log(`WebSocket disconnected: user ${userId}`);
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
    });

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: "welcome",
        user: session.user,
        timestamp: Date.now(),
      })
    );
  });

  return server;
}

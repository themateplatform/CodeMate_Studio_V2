import type { Application } from "express";
import WebSocket, { WebSocketServer } from "ws";

/**
 * WebSocket proxy for OpenAI Realtime API
 * Handles authentication and message forwarding between client and OpenAI
 */
export function setupVoiceProxy(app: Application, server: any) {
  const wss = new WebSocketServer({ 
    server,
    path: "/api/voice-proxy",
  });

  wss.on("connection", (clientWs, req) => {
    console.log("[VoiceProxy] Client connected from:", req.headers.origin);

    // Extract model from query params
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const model = url.searchParams.get("model") || "gpt-4o-realtime-preview";
    console.log("[VoiceProxy] Requested model:", model);

    // Get API key from environment
    const apiKey = process.env.OPEN_AI_KEY;
    if (!apiKey) {
      console.error("[VoiceProxy] ERROR: OPEN_AI_KEY not set in environment");
      clientWs.close(1008, "Server configuration error: Missing OpenAI API key");
      return;
    }

    console.log("[VoiceProxy] API key found, connecting to OpenAI...");

    // Connect to OpenAI Realtime API
    const openaiWsUrl = `wss://api.openai.com/v1/realtime?model=${model}`;
    console.log("[VoiceProxy] Connecting to:", openaiWsUrl);

    const openaiWs = new WebSocket(openaiWsUrl, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    // Forward messages from client to OpenAI
    clientWs.on("message", (data) => {
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.send(data);
      }
    });

    // Forward messages from OpenAI to client
    openaiWs.on("message", (data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
    });

    // Handle OpenAI connection open
    openaiWs.on("open", () => {
      console.log("[VoiceProxy] Connected to OpenAI Realtime API");
    });

    // Handle errors
    openaiWs.on("error", (error) => {
      console.error("[VoiceProxy] OpenAI WebSocket error:", error);
      console.error("[VoiceProxy] Error details:", {
        message: error.message,
        stack: error.stack,
      });
      clientWs.close(1011, `Upstream connection error: ${error.message}`);
    });

    clientWs.on("error", (error) => {
      console.error("[VoiceProxy] Client WebSocket error:", error);
      console.error("[VoiceProxy] Client error details:", {
        message: error.message,
        stack: error.stack,
      });
      if (openaiWs.readyState === WebSocket.OPEN || openaiWs.readyState === WebSocket.CONNECTING) {
        openaiWs.close();
      }
    });

    // Handle disconnections
    openaiWs.on("close", () => {
      console.log("[VoiceProxy] OpenAI connection closed");
      clientWs.close();
    });

    clientWs.on("close", () => {
      console.log("[VoiceProxy] Client disconnected");
      openaiWs.close();
    });
  });

  console.log("[VoiceProxy] WebSocket proxy initialized at /api/voice-proxy");
}

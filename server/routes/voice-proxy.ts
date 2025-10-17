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
    console.log("[VoiceProxy] Client connected");

    // Extract model from query params
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const model = url.searchParams.get("model") || "gpt-4o-realtime-preview";

    // Get API key from environment
    const apiKey = process.env.OPEN_AI_KEY;
    if (!apiKey) {
      clientWs.close(1008, "Server configuration error: Missing OpenAI API key");
      return;
    }

    // Connect to OpenAI Realtime API
    const openaiWs = new WebSocket("wss://api.openai.com/v1/realtime", {
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
      clientWs.close(1011, "Upstream connection error");
    });

    clientWs.on("error", (error) => {
      console.error("[VoiceProxy] Client WebSocket error:", error);
      openaiWs.close();
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

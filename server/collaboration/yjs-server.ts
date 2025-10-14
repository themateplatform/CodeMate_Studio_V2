import { WebSocket, WebSocketServer } from "ws";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { db } from "../db";
import { collaborationRooms, roomParticipants, yDocStates, collaborationCursors, collaborationTimeline } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface CollaborationRoom {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  connections: Set<WebSocket>;
  lastActivity: Date;
  roomId: string;
  projectId: string;
  fileId: string;
}

interface CollaborationMessage {
  type: "sync" | "awareness" | "cursor" | "operation";
  roomId: string;
  userId?: string;
  payload: any;
}

export class YjsCollaborationServer {
  private rooms: Map<string, CollaborationRoom> = new Map();
  private wss: WebSocketServer | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Initialize WebSocket server for Yjs collaboration
   */
  initialize(wss: WebSocketServer) {
    this.wss = wss;
    console.log("[Yjs] Collaboration server initialized");
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws: WebSocket, roomId: string, userId: string, projectId: string, fileId: string) {
    console.log(`[Yjs] User ${userId} joining room ${roomId}`);

    // Get or create room
    const room = await this.getOrCreateRoom(roomId, projectId, fileId);
    
    // Add connection to room
    room.connections.add(ws);
    room.lastActivity = new Date();

    // Register user in database
    await this.registerParticipant(roomId, userId);

    // Set up message handler
    ws.on("message", async (message: Buffer) => {
      try {
        await this.handleMessage(ws, room, userId, message);
      } catch (error) {
        console.error("[Yjs] Error handling message:", error);
        this.sendError(ws, "Failed to process message");
      }
    });

    // Handle disconnect
    ws.on("close", async () => {
      await this.handleDisconnect(ws, room, userId);
    });

    // Send initial sync
    this.sendInitialSync(ws, room);
  }

  /**
   * Get or create a collaboration room
   */
  private async getOrCreateRoom(roomId: string, projectId: string, fileId: string): Promise<CollaborationRoom> {
    // Check if room exists in memory
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!;
    }

    // Create new Yjs document
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);

    // Load persisted state from database if exists
    await this.loadDocumentState(doc, roomId);

    // Create room object
    const room: CollaborationRoom = {
      doc,
      awareness,
      connections: new Set(),
      lastActivity: new Date(),
      roomId,
      projectId,
      fileId,
    };

    // Set up document update handler
    doc.on("update", async (update: Uint8Array, origin: any) => {
      // Broadcast update to all clients except origin
      this.broadcastUpdate(room, update, origin);
      
      // Persist to database (debounced)
      await this.persistDocumentState(room);
    });

    // Set up awareness change handler
    awareness.on("change", () => {
      const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys()));
      this.broadcastAwareness(room, awarenessUpdate);
    });

    // Store room in memory
    this.rooms.set(roomId, room);

    // Ensure room exists in database
    await this.ensureRoomInDatabase(roomId, projectId, fileId);

    console.log(`[Yjs] Room ${roomId} created`);
    return room;
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(ws: WebSocket, room: CollaborationRoom, userId: string, message: Buffer) {
    try {
      // Convert to Uint8Array
      const messageArray = new Uint8Array(message);
      
      // Try to parse as JSON first (custom messages)
      if (messageArray[0] > 1) {
        try {
          const data: CollaborationMessage = JSON.parse(message.toString());
          await this.handleCustomMessage(room, userId, data);
          return;
        } catch {
          // Not JSON, ignore
        }
      }

      // Handle binary Yjs messages
      const messageType = messageArray[0];

      if (messageType === 0) { 
        // Sync message - just broadcast to others
        this.broadcastRaw(room, messageArray, ws);
      } else if (messageType === 1) {
        // Awareness message  
        awarenessProtocol.applyAwarenessUpdate(
          room.awareness,
          messageArray.slice(1),
          ws
        );
      }

      room.lastActivity = new Date();
    } catch (error) {
      console.error("[Yjs] Error handling message:", error);
    }
  }

  /**
   * Handle custom collaboration messages
   */
  private async handleCustomMessage(room: CollaborationRoom, userId: string, message: CollaborationMessage) {
    switch (message.type) {
      case "cursor":
        await this.handleCursorUpdate(room, userId, message.payload);
        break;
      case "operation":
        await this.logOperation(room, userId, message.payload);
        break;
    }
  }

  /**
   * Handle cursor position update
   */
  private async handleCursorUpdate(room: CollaborationRoom, userId: string, cursor: any) {
    // Update cursor in database
    await db.insert(collaborationCursors)
      .values({
        roomId: room.roomId,
        userId,
        clientId: cursor.clientId,
        position: cursor.position,
        color: cursor.color,
        label: cursor.label,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [collaborationCursors.roomId, collaborationCursors.userId, collaborationCursors.clientId],
        set: {
          position: cursor.position,
          isActive: true,
          lastUpdated: new Date(),
        },
      });

    // Broadcast to other connections
    this.broadcast(room, {
      type: "cursor",
      userId,
      payload: cursor,
    });
  }

  /**
   * Log collaboration operation to timeline
   */
  private async logOperation(room: CollaborationRoom, userId: string, operation: any) {
    await db.insert(collaborationTimeline).values({
      roomId: room.roomId,
      userId,
      operationType: operation.type,
      operation: operation.data,
      position: operation.position,
      content: operation.content,
      clientClock: operation.clock || 0,
      dependencies: operation.dependencies || [],
    });
  }

  /**
   * Handle client disconnect
   */
  private async handleDisconnect(ws: WebSocket, room: CollaborationRoom, userId: string) {
    console.log(`[Yjs] User ${userId} leaving room ${room.roomId}`);

    // Remove connection
    room.connections.delete(ws);

    // Update participant status
    await db.update(roomParticipants)
      .set({ isOnline: false, lastSeen: new Date() })
      .where(and(
        eq(roomParticipants.roomId, room.roomId),
        eq(roomParticipants.userId, userId)
      ));

    // Deactivate cursors
    await db.update(collaborationCursors)
      .set({ isActive: false })
      .where(and(
        eq(collaborationCursors.roomId, room.roomId),
        eq(collaborationCursors.userId, userId)
      ));

    // Remove from awareness
    const awarenessStates = Array.from(room.awareness.getStates().entries());
    const clientIds = awarenessStates
      .filter(([_, state]) => (state as any).user?.id === userId)
      .map(([clientId]) => clientId);
    
    if (clientIds.length > 0) {
      awarenessProtocol.removeAwarenessStates(room.awareness, clientIds, null);
    }

    // Clean up room if empty
    if (room.connections.size === 0) {
      await this.scheduleRoomCleanup(room.roomId);
    }
  }

  /**
   * Send initial sync to new connection
   */
  private sendInitialSync(ws: WebSocket, room: CollaborationRoom) {
    // Send current document state as update
    const stateVector = Y.encodeStateVector(room.doc);
    const update = Y.encodeStateAsUpdate(room.doc, stateVector);
    
    if (update.length > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint8Array(encoder, update);
      const syncMessage = new Uint8Array([0, ...encoding.toUint8Array(encoder)]);
      ws.send(syncMessage);
    }

    // Send awareness states
    const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(
      room.awareness,
      Array.from(room.awareness.getStates().keys())
    );
    if (awarenessUpdate.length > 0) {
      const awarenessMessage = new Uint8Array([1, ...awarenessUpdate]);
      ws.send(awarenessMessage);
    }
  }

  /**
   * Broadcast document update to all connections
   */
  private broadcastUpdate(room: CollaborationRoom, update: Uint8Array, origin: any) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint8Array(encoder, update);
    const message = new Uint8Array([0, ...encoding.toUint8Array(encoder)]);
    
    room.connections.forEach((conn) => {
      if (conn !== origin && conn.readyState === WebSocket.OPEN) {
        conn.send(message);
      }
    });
  }

  /**
   * Broadcast raw message to all connections except origin
   */
  private broadcastRaw(room: CollaborationRoom, message: Uint8Array, origin: WebSocket) {
    room.connections.forEach((conn) => {
      if (conn !== origin && conn.readyState === WebSocket.OPEN) {
        conn.send(message);
      }
    });
  }

  /**
   * Broadcast awareness update to all connections
   */
  private broadcastAwareness(room: CollaborationRoom, update: Uint8Array) {
    const message = new Uint8Array([1, ...update]);
    room.connections.forEach((conn) => {
      if (conn.readyState === WebSocket.OPEN) {
        conn.send(message);
      }
    });
  }

  /**
   * Broadcast custom message to all connections
   */
  private broadcast(room: CollaborationRoom, message: any) {
    const payload = JSON.stringify(message);
    room.connections.forEach((conn) => {
      if (conn.readyState === WebSocket.OPEN) {
        conn.send(payload);
      }
    });
  }

  /**
   * Send sync message to connection
   */
  private send(ws: WebSocket, data: Uint8Array) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }

  /**
   * Send awareness message to connection
   */
  private sendAwareness(ws: WebSocket, update: Uint8Array) {
    if (ws.readyState === WebSocket.OPEN) {
      const message = new Uint8Array([1, ...update]);
      ws.send(message);
    }
  }

  /**
   * Send error message to connection
   */
  private sendError(ws: WebSocket, error: string) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "error", message: error }));
    }
  }

  /**
   * Load document state from database
   */
  private async loadDocumentState(doc: Y.Doc, roomId: string) {
    try {
      const [state] = await db.select()
        .from(yDocStates)
        .where(eq(yDocStates.roomId, roomId))
        .orderBy(yDocStates.version)
        .limit(1);

      if (state && state.documentUpdate) {
        const update = Buffer.from(state.documentUpdate, "base64");
        Y.applyUpdate(doc, update);
        console.log(`[Yjs] Loaded document state for room ${roomId}`);
      }
    } catch (error) {
      console.error("[Yjs] Error loading document state:", error);
    }
  }

  /**
   * Persist document state to database
   */
  private async persistDocumentState(room: CollaborationRoom) {
    try {
      const update = Y.encodeStateAsUpdate(room.doc);
      const stateVector = Y.encodeStateVector(room.doc);

      await db.insert(yDocStates)
        .values({
          roomId: room.roomId,
          docName: "main",
          stateVector: Buffer.from(stateVector).toString("base64"),
          documentUpdate: Buffer.from(update).toString("base64"),
          version: 1,
          isSnapshot: true,
        })
        .onConflictDoUpdate({
          target: [yDocStates.roomId, yDocStates.docName, yDocStates.version],
          set: {
            stateVector: Buffer.from(stateVector).toString("base64"),
            documentUpdate: Buffer.from(update).toString("base64"),
            updatedAt: new Date(),
          },
        });

      // Update room activity
      await db.update(collaborationRooms)
        .set({ lastActivity: new Date() })
        .where(eq(collaborationRooms.id, room.roomId));
    } catch (error) {
      console.error("[Yjs] Error persisting document state:", error);
    }
  }

  /**
   * Ensure room exists in database
   */
  private async ensureRoomInDatabase(roomId: string, projectId: string, fileId: string) {
    try {
      await db.insert(collaborationRooms)
        .values({
          id: roomId,
          projectId,
          fileId,
          roomName: `${projectId}:${fileId}`,
          isActive: true,
        })
        .onConflictDoNothing();
    } catch (error) {
      console.error("[Yjs] Error ensuring room in database:", error);
    }
  }

  /**
   * Register participant in database
   */
  private async registerParticipant(roomId: string, userId: string) {
    try {
      await db.insert(roomParticipants)
        .values({
          roomId,
          userId,
          clientId: `client_${Date.now()}`,
          isOnline: true,
          joinedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [roomParticipants.roomId, roomParticipants.userId],
          set: {
            isOnline: true,
            lastSeen: new Date(),
          },
        });
    } catch (error) {
      console.error("[Yjs] Error registering participant:", error);
    }
  }

  /**
   * Schedule room cleanup if inactive
   */
  private async scheduleRoomCleanup(roomId: string) {
    setTimeout(async () => {
      const room = this.rooms.get(roomId);
      if (room && room.connections.size === 0) {
        const timeSinceActivity = Date.now() - room.lastActivity.getTime();
        if (timeSinceActivity > this.ROOM_TIMEOUT) {
          await this.cleanupRoom(roomId);
        }
      }
    }, this.ROOM_TIMEOUT);
  }

  /**
   * Cleanup inactive room
   */
  private async cleanupRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    console.log(`[Yjs] Cleaning up room ${roomId}`);

    // Persist final state
    await this.persistDocumentState(room);

    // Mark room as inactive
    await db.update(collaborationRooms)
      .set({ isActive: false })
      .where(eq(collaborationRooms.id, roomId));

    // Remove from memory
    this.rooms.delete(roomId);
  }

  /**
   * Start periodic cleanup of inactive rooms
   */
  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      this.rooms.forEach(async (room, roomId) => {
        if (room.connections.size === 0) {
          const timeSinceActivity = now - room.lastActivity.getTime();
          if (timeSinceActivity > this.ROOM_TIMEOUT) {
            await this.cleanupRoom(roomId);
          }
        }
      });
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Shutdown collaboration server
   */
  async shutdown() {
    console.log("[Yjs] Shutting down collaboration server");

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Persist all active rooms
    const persistPromises = Array.from(this.rooms.values()).map((room) =>
      this.persistDocumentState(room)
    );
    await Promise.all(persistPromises);

    // Close all connections
    this.rooms.forEach((room) => {
      room.connections.forEach((ws) => {
        ws.close(1001, "Server shutting down");
      });
    });

    this.rooms.clear();
  }

  /**
   * Get room statistics
   */
  getRoomStats() {
    return {
      totalRooms: this.rooms.size,
      activeConnections: Array.from(this.rooms.values()).reduce(
        (sum, room) => sum + room.connections.size,
        0
      ),
      rooms: Array.from(this.rooms.entries()).map(([roomId, room]) => ({
        roomId,
        connections: room.connections.size,
        lastActivity: room.lastActivity,
      })),
    };
  }
}

// Export singleton instance
export const yjsServer = new YjsCollaborationServer();

import * as Y from 'yjs';
import { WebSocketServer, WebSocket } from 'ws';
import { applyUpdate, encodeStateAsUpdate, encodeStateVector } from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { storage } from '../storage';
import { 
  InsertCollaborationRoom, 
  InsertRoomParticipant, 
  InsertCollaborationTimeline,
  InsertYDocState,
  InsertCollaborationCursor,
  CollaborationRoom,
  RoomParticipant 
} from '@shared/schema';

// Types for collaboration events
export interface CollaborationEvent {
  type: 'join' | 'leave' | 'cursor_move' | 'presence_update' | 'document_update' | 'sync_request' | 'sync_response';
  roomId: string;
  userId: string;
  clientId: string;
  data?: any;
  timestamp: number;
}

export interface CursorPosition {
  line: number;
  column: number;
  selectionStart?: number;
  selectionEnd?: number;
}

export interface UserPresence {
  userId: string;
  name: string;
  avatar?: string;
  color: string;
  isOnline: boolean;
  lastSeen: Date;
  cursor?: CursorPosition;
}

// Main collaboration service class
export class CollaborationService {
  private rooms: Map<string, Y.Doc> = new Map();
  private roomAwareness: Map<string, Awareness> = new Map();
  private roomParticipants: Map<string, Set<string>> = new Map();
  private clientSockets: Map<string, WebSocket> = new Map();
  private userColors: Map<string, string> = new Map();
  
  // Color palette for user cursors
  private readonly colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    console.log('🤝 Collaboration Service initialized');
  }

  // Generate room name from project and file
  private generateRoomName(projectId: string, filePath: string): string {
    return `${projectId}:${filePath}`;
  }

  // Get or assign a color for a user
  private getUserColor(userId: string): string {
    if (!this.userColors.has(userId)) {
      const colorIndex = this.userColors.size % this.colors.length;
      this.userColors.set(userId, this.colors[colorIndex]);
    }
    return this.userColors.get(userId)!;
  }

  // Create or get a collaboration room
  async createOrGetRoom(projectId: string, fileId: string, filePath: string): Promise<CollaborationRoom> {
    const roomName = this.generateRoomName(projectId, filePath);
    
    try {
      // Try to get existing room
      const existingRoom = await storage.getCollaborationRoom(projectId, fileId);
      if (existingRoom) {
        // Initialize Y.Doc if not already loaded
        if (!this.rooms.has(existingRoom.id)) {
          await this.loadRoomDocument(existingRoom);
        }
        return existingRoom;
      }

      // Create new room
      const roomData: InsertCollaborationRoom = {
        projectId,
        fileId,
        roomName,
        yDocState: null,
        stateVector: null,
        lastActivity: new Date(),
        isActive: true,
        maxParticipants: 10
      };

      const room = await storage.createCollaborationRoom(roomData);
      
      // Initialize Y.Doc for the room
      const ydoc = new Y.Doc();
      const awareness = new Awareness(ydoc);
      this.rooms.set(room.id, ydoc);
      this.roomAwareness.set(room.id, awareness);
      this.roomParticipants.set(room.id, new Set());

      // Set up document update handlers
      this.setupDocumentHandlers(room.id, ydoc, awareness);

      console.log(`📁 Created collaboration room: ${roomName}`);
      return room;
    } catch (error) {
      console.error('Error creating/getting room:', error);
      throw error;
    }
  }

  // Load existing Y.Doc state from database
  private async loadRoomDocument(room: CollaborationRoom): Promise<void> {
    try {
      const ydoc = new Y.Doc();
      
      // Load persisted state if available
      if (room.yDocState && room.stateVector) {
        const update = Buffer.from(room.yDocState, 'base64');
        applyUpdate(ydoc, update);
      }

      const awareness = new Awareness(ydoc);
      this.rooms.set(room.id, ydoc);
      this.roomAwareness.set(room.id, awareness);
      this.roomParticipants.set(room.id, new Set());
      this.setupDocumentHandlers(room.id, ydoc, awareness);

      console.log(`📂 Loaded room document: ${room.roomName}`);
    } catch (error) {
      console.error('Error loading room document:', error);
      throw error;
    }
  }

  // Set up Y.Doc event handlers
  private setupDocumentHandlers(roomId: string, ydoc: Y.Doc, awareness: Awareness): void {
    // Handle document updates
    ydoc.on('update', async (update: Uint8Array, origin: any) => {
      try {
        // PRODUCTION FIX: Binary file filter to prevent Yjs corruption
        if (this.isBinaryUpdate(update, origin)) {
          console.warn(`🚫 Skipping binary file update for room ${roomId} - origin: ${origin?.filePath || 'unknown'}`);
          return;
        }
        
        // Persist the document state
        await this.persistDocumentState(roomId, ydoc);
        
        // Broadcast update to all participants
        this.broadcastToRoom(roomId, {
          type: 'document_update',
          roomId,
          userId: origin?.userId || 'system',
          clientId: origin?.clientId || 'system',
          data: { update: Array.from(update) }, // Use Array format for consistency with client
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error handling document update:', error);
      }
    });

    // Handle awareness changes (cursors, presence) - FIXED: Use proper y-protocols/awareness
    awareness.on('change', ({ added, updated, removed }: { added: number[], updated: number[], removed: number[] }) => {
      try {
        const changes = { added, updated, removed };
        const awarenessStates = awareness.getStates();
        
        this.broadcastToRoom(roomId, {
          type: 'presence_update',
          roomId,
          userId: 'system',
          clientId: 'system',
          data: { 
            awareness: Object.fromEntries(awarenessStates.entries()),
            changes
          },
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error handling awareness change:', error);
      }
    });
  }

  // Join a user to a collaboration room
  async joinRoom(roomId: string, userId: string, clientId: string, socket: WebSocket): Promise<RoomParticipant> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Store socket reference
      this.clientSockets.set(clientId, socket);

      // Add to room participants
      let participants = this.roomParticipants.get(roomId);
      if (!participants) {
        participants = new Set();
        this.roomParticipants.set(roomId, participants);
      }
      participants.add(clientId);

      // Get user color
      const userColor = this.getUserColor(userId);

      // Create participant record
      const participantData: InsertRoomParticipant = {
        roomId,
        userId,
        clientId,
        isOnline: true,
        cursorPosition: null,
        presence: {
          color: userColor,
          name: user.firstName ? `${user.firstName} ${user.lastName}` : user.username,
          avatar: user.profileImageUrl,
          status: 'active'
        },
        permissions: 'edit',
        metadata: {}
      };

      const participant = await storage.createRoomParticipant(participantData);

      // Send current document state to the new participant
      const ydoc = this.rooms.get(roomId);
      if (ydoc) {
        const stateVector = encodeStateVector(ydoc);
        const documentUpdate = encodeStateAsUpdate(ydoc);
        
        socket.send(JSON.stringify({
          type: 'sync_response',
          roomId,
          data: {
            stateVector: Buffer.from(stateVector).toString('base64'),
            documentUpdate: Buffer.from(documentUpdate).toString('base64')
          }
        }));
      }

      // Broadcast user join to other participants
      this.broadcastToRoom(roomId, {
        type: 'join',
        roomId,
        userId,
        clientId,
        data: { participant: participantData },
        timestamp: Date.now()
      }, clientId);

      console.log(`👤 User ${user.username} joined room ${roomId}`);
      return participant;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  // Remove user from room
  async leaveRoom(roomId: string, userId: string, clientId: string): Promise<void> {
    try {
      // Remove from participants
      const participants = this.roomParticipants.get(roomId);
      if (participants) {
        participants.delete(clientId);
      }

      // Remove socket reference
      this.clientSockets.delete(clientId);

      // Update participant status
      await storage.updateRoomParticipant(roomId, userId, { isOnline: false });

      // Broadcast user leave
      this.broadcastToRoom(roomId, {
        type: 'leave',
        roomId,
        userId,
        clientId,
        data: {},
        timestamp: Date.now()
      });

      console.log(`👋 User ${userId} left room ${roomId}`);
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  }

  // Update cursor position
  async updateCursor(roomId: string, userId: string, clientId: string, position: CursorPosition): Promise<void> {
    try {
      const userColor = this.getUserColor(userId);
      
      // Update cursor in database
      const cursorData: InsertCollaborationCursor = {
        roomId,
        userId,
        clientId,
        position,
        color: userColor,
        isActive: true,
        metadata: {}
      };

      await storage.upsertCollaborationCursor(cursorData);

      // Broadcast cursor update
      this.broadcastToRoom(roomId, {
        type: 'cursor_move',
        roomId,
        userId,
        clientId,
        data: { position, color: userColor },
        timestamp: Date.now()
      }, clientId);
    } catch (error) {
      console.error('Error updating cursor:', error);
      throw error;
    }
  }

  // Apply Y.js document update
  async applyDocumentUpdate(roomId: string, userId: string, clientId: string, update: Uint8Array): Promise<void> {
    try {
      const ydoc = this.rooms.get(roomId);
      if (!ydoc) {
        throw new Error('Room document not found');
      }

      // Apply the update to the document
      applyUpdate(ydoc, update, { userId, clientId });

      // Log the operation in timeline
      await this.logTimelineOperation(roomId, userId, 'document_update', {
        update: Buffer.from(update).toString('base64'),
        clientId
      });
    } catch (error) {
      console.error('Error applying document update:', error);
      throw error;
    }
  }

  // Get room participants
  async getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
    try {
      return await storage.getRoomParticipants(roomId);
    } catch (error) {
      console.error('Error getting room participants:', error);
      return [];
    }
  }

  // Get room by ID (using internal map)
  async getRoom(roomId: string): Promise<CollaborationRoom | null> {
    try {
      // For now, return null as we'll get room info from the existing Y.js document
      // The sync request handler will check if the Y.js document exists instead
      return null; 
    } catch (error) {
      console.error('Error getting room:', error);
      return null;
    }
  }

  // Get Y.js document for a room - MISSING METHOD IMPLEMENTATION
  getRoomDocument(roomId: string): Y.Doc | null {
    return this.rooms.get(roomId) || null;
  }

  // Get awareness instance for a room
  getRoomAwareness(roomId: string): Awareness | null {
    return this.roomAwareness.get(roomId) || null;
  }

  // Get collaboration timeline
  async getCollaborationTimeline(roomId: string, limit: number = 100): Promise<any[]> {
    try {
      return await storage.getCollaborationTimeline(roomId, limit);
    } catch (error) {
      console.error('Error getting collaboration timeline:', error);
      return [];
    }
  }

  // Persist document state to database
  private async persistDocumentState(roomId: string, ydoc: Y.Doc): Promise<void> {
    try {
      const stateVector = encodeStateVector(ydoc);
      const documentUpdate = encodeStateAsUpdate(ydoc);

      const docStateData: InsertYDocState = {
        roomId,
        docName: `room_${roomId}`,
        stateVector: Buffer.from(stateVector).toString('base64'),
        documentUpdate: Buffer.from(documentUpdate).toString('base64'),
        version: 1,
        isSnapshot: true
      };

      await storage.upsertYDocState(docStateData);
    } catch (error) {
      console.error('Error persisting document state:', error);
    }
  }

  // Log operation to timeline
  private async logTimelineOperation(roomId: string, userId: string, type: string, data: any): Promise<void> {
    try {
      const timelineData: InsertCollaborationTimeline = {
        roomId,
        userId,
        operationType: type,
        operation: data,
        position: data.position || null,
        content: data.content || null,
        clientClock: data.clientClock || Date.now(),
        dependencies: [],
        metadata: data.metadata || {}
      };

      await storage.createCollaborationTimeline(timelineData);
    } catch (error) {
      console.error('Error logging timeline operation:', error);
    }
  }

  // PRODUCTION FIX: Binary file filter to prevent Yjs corruption  
  private isBinaryUpdate(update: Uint8Array, origin: any): boolean {
    try {
      // Check if origin indicates a binary file
      if (origin?.filePath) {
        const filePath = origin.filePath.toLowerCase();
        const binaryExtensions = [
          '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico', '.webp',
          '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv', '.webm',
          '.zip', '.rar', '.7z', '.tar', '.gz', '.pdf', '.doc', '.docx',
          '.exe', '.bin', '.dmg', '.iso', '.woff', '.woff2', '.ttf', '.otf'
        ];
        
        if (binaryExtensions.some(ext => filePath.endsWith(ext))) {
          return true;
        }
      }
      
      // Check for binary content in the update itself (basic heuristic)
      if (update.length > 1024 * 1024) { // Files larger than 1MB likely binary
        return true;
      }
      
      // Check for null bytes (common in binary files)
      for (let i = 0; i < Math.min(update.length, 1024); i++) {
        if (update[i] === 0) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking if update is binary:', error);
      return false; // Default to allowing the update
    }
  }

  // Broadcast message to all room participants
  private broadcastToRoom(roomId: string, message: CollaborationEvent, excludeClientId?: string): void {
    const participants = this.roomParticipants.get(roomId);
    if (!participants) return;

    const messageStr = JSON.stringify(message);
    
    participants.forEach(clientId => {
      if (excludeClientId && clientId === excludeClientId) return;
      
      const socket = this.clientSockets.get(clientId);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(messageStr);
      }
    });
  }

  // Clean up inactive rooms and participants
  async cleanup(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Remove inactive participants
      for (const [roomId, participants] of this.roomParticipants.entries()) {
        const activeParticipants = new Set<string>();
        
        for (const clientId of participants) {
          const socket = this.clientSockets.get(clientId);
          if (socket && socket.readyState === WebSocket.OPEN) {
            activeParticipants.add(clientId);
          } else {
            this.clientSockets.delete(clientId);
          }
        }
        
        this.roomParticipants.set(roomId, activeParticipants);
        
        // If room is empty, mark as inactive
        if (activeParticipants.size === 0) {
          await storage.updateCollaborationRoom(roomId, { isActive: false });
        }
      }
      
      const duration = Date.now() - startTime;
      if (this.roomParticipants.size > 0 || duration > 1000) {
        console.log(`🧹 Collaboration cleanup completed: ${this.roomParticipants.size} active rooms, took ${duration}ms`);
      }
    } catch (error) {
      console.error('Error during collaboration cleanup:', error);
    }
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService();

// Cleanup interval (every 5 minutes)
setInterval(() => {
  collaborationService.cleanup();
}, 5 * 60 * 1000);
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import type * as Monaco from 'monaco-editor';

// Collaboration types
export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  isOnline: boolean;
}

export interface CursorPosition {
  line: number;
  column: number;
  selectionStart?: number;
  selectionEnd?: number;
}

export interface CollaborationEvent {
  type: 'user_joined' | 'user_left' | 'cursor_moved' | 'presence_changed' | 'document_updated';
  user?: CollaborationUser;
  cursor?: CursorPosition;
  data?: any;
}

export interface CollaborationState {
  isConnected: boolean;
  isAuthenticated: boolean;
  users: Map<string, CollaborationUser>;
  roomId?: string;
  clientId?: string;
  currentUser?: CollaborationUser;
}

// Main collaboration manager class
export class CollaborationManager {
  private ydoc: Y.Doc;
  private websocket: WebSocket | null = null;
  private monacoBinding: MonacoBinding | null = null;
  private state: CollaborationState;
  private eventListeners: Map<string, ((event: CollaborationEvent) => void)[]> = new Map();
  private connectPromiseResolve?: () => void;
  private connectPromiseReject?: (error: any) => void;
  private documentUpdateHandler: (update: Uint8Array, origin: any) => void;
  
  // Color palette for users
  private readonly userColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  constructor() {
    this.ydoc = new Y.Doc();
    this.state = {
      isConnected: false,
      isAuthenticated: false,
      users: new Map()
    };
    
    this.setupDocument();
  }

  // Set up Y.js document with awareness
  private setupDocument() {
    // Create document update handler
    this.documentUpdateHandler = (update: Uint8Array, origin: any) => {
      if (origin !== this) {
        this.emit('document_updated', { data: { update: Array.from(update) } });
      }
    };
    
    // Handle document updates
    this.ydoc.on('update', this.documentUpdateHandler);
  }

  // Get or assign a color for a user (deterministic based on user ID)
  private getUserColor(userId: string): string {
    const colorIndex = Math.abs(userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a; // Convert to 32bit integer
    }, 0)) % this.userColors.length;
    return this.userColors[colorIndex];
  }

  // Connect to collaboration server - SECURITY: No client authentication needed
  async connect(userId: string, token?: string): Promise<void> {
    try {
      // Create WebSocket connection - authentication happens at upgrade via HTTP session
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // FIXED: Use location.host which includes port if non-standard
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      this.websocket = new WebSocket(wsUrl);
      
      return new Promise((resolve, reject) => {
        if (!this.websocket) {
          reject(new Error('Failed to create WebSocket connection'));
          return;
        }

        // Store resolve/reject for use when authenticated message is received
        this.connectPromiseResolve = resolve;
        this.connectPromiseReject = reject;

        this.websocket.onopen = () => {
          console.log('🔌 WebSocket connected for collaboration');
          this.state.isConnected = true;
          // SECURITY: No client-side authentication - server authenticates via HTTP session
          // Wait for 'authenticated' message from server to resolve Promise
        };

        this.websocket.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };

        this.websocket.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          this.state.isConnected = false;
          this.state.isAuthenticated = false;
          // Reject connection promise if still pending
          if (this.connectPromiseReject) {
            this.connectPromiseReject(new Error('WebSocket connection closed'));
            this.connectPromiseReject = undefined;
            this.connectPromiseResolve = undefined;
          }
        };

        this.websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.connectPromiseReject) {
            this.connectPromiseReject(error);
            this.connectPromiseReject = undefined;
            this.connectPromiseResolve = undefined;
          }
        };
      });
    } catch (error) {
      console.error('Failed to connect to collaboration server:', error);
      throw error;
    }
  }

  // SECURITY: Authentication handler removed - server authenticates via HTTP session
  // This eliminates client-sent userId vulnerability and prevents impersonation

  // Join a collaboration room for a specific file
  async joinRoom(projectId: string, fileId: string, filePath: string): Promise<void> {
    if (!this.websocket || !this.state.isAuthenticated) {
      throw new Error('Must be connected and authenticated to join room');
    }

    return new Promise((resolve, reject) => {
      const handleRoomResponse = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'room_joined') {
          this.state.roomId = message.roomId;
          console.log(`🏠 Joined collaboration room: ${this.state.roomId}`);
          
          // Set up custom Y.js sync for this room
          this.setupCustomSync(message.roomId);
          
          this.websocket?.removeEventListener('message', handleRoomResponse);
          resolve();
        } else if (message.type === 'error') {
          this.websocket?.removeEventListener('message', handleRoomResponse);
          reject(new Error(message.message || 'Failed to join room'));
        }
      };

      this.websocket.addEventListener('message', handleRoomResponse);

      // Send join room request - SECURITY: No userId needed, server knows from session
      this.websocket.send(JSON.stringify({
        type: 'join_room',
        data: { projectId, fileId, filePath },
        clientId: this.state.clientId,
        timestamp: Date.now()
      }));
    });
  }

  // PERFORMANCE: Use custom protocol instead of mixing y-websocket
  // This eliminates protocol conflicts and gives us full control over sync
  private setupCustomSync(roomId: string) {
    console.log(`📡 Setting up custom Y.js sync for room: ${roomId}`);
    
    // Remove existing handler first to avoid duplicates
    this.ydoc.off('update', this.documentUpdateHandler);
    
    // Set up custom document update handler to send updates via our WebSocket
    const customUpdateHandler = (update: Uint8Array, origin: any) => {
      // FIXED: Only send updates that didn't originate from network or remote sources
      if (origin !== 'remote' && origin !== 'sync' && origin !== this && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({
          type: 'document_update',
          roomId: this.state.roomId,
          clientId: this.state.clientId,
          data: { 
            update: Array.from(update),
            timestamp: Date.now()
          }
        }));
      }
      
      // Also emit for local listeners
      if (origin !== this) {
        this.emit('document_updated', { data: { update: Array.from(update) } });
      }
    };
    
    this.ydoc.on('update', customUpdateHandler);
    // Store reference for cleanup
    this.documentUpdateHandler = customUpdateHandler;

    // Request initial sync state from server
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'sync_request',
        roomId: this.state.roomId,
        clientId: this.state.clientId,
        data: {
          stateVector: Array.from(Y.encodeStateVector(this.ydoc))
        }
      }));
    }

    console.log('🔧 Custom Y.js sync setup complete');
  }

  // Update users list from Y.js awareness
  private updateUsersFromAwareness(states: Map<number, any>) {
    const newUsers = new Map<string, CollaborationUser>();
    
    states.forEach((state, clientId) => {
      if (state.user && state.user.id !== this.state.currentUser?.id) {
        newUsers.set(state.user.id, {
          ...state.user,
          isOnline: true
        });
      }
    });

    this.state.users = newUsers;
    this.emit('presence_changed', { data: { users: Array.from(newUsers.values()) } });
  }

  // Bind Y.js document to Monaco Editor (custom protocol)
  bindToMonaco(editor: Monaco.editor.IStandaloneCodeEditor, yText?: Y.Text): MonacoBinding | null {
    if (!this.state.roomId) {
      console.warn('Cannot bind to Monaco: Not connected to a collaboration room');
      return null;
    }

    try {
      // Get or create the shared text type
      const sharedText = yText || this.ydoc.getText('monaco');
      
      // Create Monaco binding without awareness (custom protocol)
      this.monacoBinding = new MonacoBinding(
        sharedText,
        editor.getModel()!,
        new Set([editor])
      );

      // Handle cursor changes
      editor.onDidChangeCursorPosition((e) => {
        this.updateCursor({
          line: e.position.lineNumber,
          column: e.position.column
        });
      });

      // Handle selection changes
      editor.onDidChangeCursorSelection((e) => {
        this.updateCursor({
          line: e.selection.startLineNumber,
          column: e.selection.startColumn,
          selectionStart: e.selection.startLineNumber,
          selectionEnd: e.selection.endLineNumber
        });
      });

      console.log('📝 Monaco editor bound to Y.js document (custom protocol)');
      return this.monacoBinding;
    } catch (error) {
      console.error('Failed to bind Monaco to Y.js:', error);
      return null;
    }
  }

  // Update cursor position with throttling
  private lastCursorUpdate = 0;
  private readonly CURSOR_UPDATE_THROTTLE = 100; // 100ms throttle
  
  private updateCursor(position: CursorPosition) {
    if (!this.websocket || !this.state.roomId) return;

    // PERFORMANCE: Throttle cursor updates
    const now = Date.now();
    if (now - this.lastCursorUpdate < this.CURSOR_UPDATE_THROTTLE) {
      return;
    }
    this.lastCursorUpdate = now;

    this.websocket.send(JSON.stringify({
      type: 'cursor_move',
      roomId: this.state.roomId,
      clientId: this.state.clientId,
      data: { position },
      timestamp: now
    }));

    // Emit cursor event for custom awareness handling
    this.emit('cursor_moved', { cursor: position });
  }

  // Leave current room
  async leaveRoom(): Promise<void> {
    if (!this.websocket || !this.state.roomId) return;

    this.websocket.send(JSON.stringify({
      type: 'leave_room',
      roomId: this.state.roomId,
      clientId: this.state.clientId,
      timestamp: Date.now()
    }));

    // Clean up Y.js document listeners
    this.ydoc.off('update', this.documentUpdateHandler);

    // Clean up Monaco binding
    if (this.monacoBinding) {
      this.monacoBinding.destroy();
      this.monacoBinding = null;
    }

    this.state.roomId = undefined;
    this.state.users.clear();
  }

  // Disconnect from collaboration server
  disconnect() {
    this.leaveRoom();
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.state.isConnected = false;
    this.state.isAuthenticated = false;
  }

  // Get current collaboration state
  getState(): CollaborationState {
    return { ...this.state };
  }

  // Get Y.js document
  getDocument(): Y.Doc {
    return this.ydoc;
  }

  // Get shared text for Monaco
  getSharedText(name: string = 'monaco'): Y.Text {
    return this.ydoc.getText(name);
  }

  // Handle WebSocket messages
  private handleWebSocketMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'authenticated':
          // SECURITY: Server sends authenticated message with user data from HTTP session
          this.handleAuthenticated(message);
          break;
        case 'participant_joined':
          this.handleUserJoined(message);
          break;
        case 'participant_left':
          this.handleUserLeft(message);
          break;
        case 'cursor_move':
          this.handleCursorMove(message);
          break;
        case 'presence_update':
          this.handlePresenceUpdate(message);
          break;
        case 'document_update':
          // PERFORMANCE: Handle document updates through custom protocol
          this.handleDocumentUpdate(message);
          break;
        case 'sync_response':
          // Handle sync response from server with document state
          this.handleSyncResponse(message);
          break;
        case 'room_joined':
          this.handleRoomJoined(message);
          break;
        default:
          console.log('Unhandled collaboration message:', message);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  // Handle authenticated message from server - SECURITY: Server provides user identity
  private handleAuthenticated(message: any) {
    this.state.isAuthenticated = true;
    this.state.clientId = message.clientId;
    this.state.currentUser = {
      id: message.user.id,
      name: message.user.firstName ? `${message.user.firstName} ${message.user.lastName}` : message.user.username,
      color: this.getUserColor(message.user.id),
      avatar: message.user.profileImageUrl,
      isOnline: true
    };
    
    console.log('🔐 Authenticated for collaboration via HTTP session');
    
    // CRITICAL: Resolve the connect() Promise to unblock connection flow
    if (this.connectPromiseResolve) {
      this.connectPromiseResolve();
      this.connectPromiseResolve = undefined;
      this.connectPromiseReject = undefined;
    }
    
    // Emit state change event for hooks to react
    this.emit('state_changed', {});
  }

  // Handle room joined event
  private handleRoomJoined(message: any) {
    this.state.roomId = message.roomId;
    console.log(`🏠 Joined collaboration room: ${this.state.roomId}`);
    
    // PERFORMANCE: Set up custom Y.js sync instead of y-websocket provider
    this.setupCustomSync(message.roomId);
    
    // Emit state change event
    this.emit('state_changed', {});
  }

  // Handle user joined event
  private handleUserJoined(message: any) {
    if (message.participant && message.participant.userId !== this.state.currentUser?.id) {
      const user: CollaborationUser = {
        id: message.participant.userId,
        name: message.participant.presence?.name || 'Unknown User',
        color: message.participant.presence?.color || this.getUserColor(message.participant.userId),
        avatar: message.participant.presence?.avatar,
        isOnline: true
      };
      
      this.state.users.set(user.id, user);
      this.emit('user_joined', { user });
    }
  }

  // Handle user left event
  private handleUserLeft(message: any) {
    if (message.userId && message.userId !== this.state.currentUser?.id) {
      const user = this.state.users.get(message.userId);
      if (user) {
        this.state.users.delete(message.userId);
        this.emit('user_left', { user });
      }
    }
  }

  // Handle cursor move event
  private handleCursorMove(message: any) {
    if (message.userId !== this.state.currentUser?.id) {
      this.emit('cursor_moved', {
        user: this.state.users.get(message.userId),
        cursor: message.data?.position
      });
    }
  }

  // Handle presence update event
  private handlePresenceUpdate(message: any) {
    this.emit('presence_changed', { data: message.data });
  }

  // PERFORMANCE: Handle document updates through custom protocol
  private handleDocumentUpdate(message: any) {
    if (message.data && message.data.update) {
      try {
        // Convert array back to Uint8Array and apply update
        const update = new Uint8Array(message.data.update);
        // FIXED: Use 'remote' origin to prevent update loops
        this.ydoc.transact(() => {
          Y.applyUpdate(this.ydoc, update, 'remote');
        }, 'remote');
        console.log('📄 Applied document update');
        this.emit('document_updated', { data: { update: message.data.update } });
      } catch (error) {
        console.error('Error applying document update:', error);
      }
    }
  }

  // Handle sync response with document state
  private handleSyncResponse(message: any) {
    if (message.data) {
      try {
        if (message.data.stateVector) {
          // Server sends base64-encoded data, decode it
          const stateVectorBase64 = message.data.stateVector;
          const stateVector = new Uint8Array(Buffer.from(stateVectorBase64, 'base64'));
          console.log('📡 Received sync response with state vector');
        }
        
        if (message.data.documentUpdate) {
          // Server sends base64-encoded data, decode it properly
          const documentUpdateBase64 = message.data.documentUpdate;
          const update = new Uint8Array(Buffer.from(documentUpdateBase64, 'base64'));
          
          // FIXED: Use 'sync' origin for initial state
          this.ydoc.transact(() => {
            Y.applyUpdate(this.ydoc, update, 'sync');
          }, 'sync');
          console.log('📄 Applied initial document state from server');
        }
      } catch (error) {
        console.error('Error handling sync response:', error);
      }
    }
  }

  // Event emitter functionality
  on(event: string, callback: (event: CollaborationEvent) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  off(event: string, callback: (event: CollaborationEvent) => void) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: Partial<CollaborationEvent>) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        callback({ type: event as any, ...data });
      });
    }
  }
}

// Export singleton instance
export const collaborationManager = new CollaborationManager();
import { useState, useEffect, useCallback, useRef } from 'react';
import { collaborationManager, type CollaborationEvent, type CollaborationState, type CollaborationUser } from '@/lib/collaborationManager';
import { useAuth } from './useAuth';

export interface UseCollaborationOptions {
  projectId?: string;
  fileId?: string;
  filePath?: string;
  autoConnect?: boolean;
}

export interface UseCollaborationReturn {
  // Connection state
  isConnected: boolean;
  isAuthenticated: boolean;
  isInRoom: boolean;
  
  // Users and presence
  currentUser?: CollaborationUser;
  otherUsers: CollaborationUser[];
  allUsers: CollaborationUser[];
  
  // Room info
  roomId?: string;
  clientId?: string;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  joinRoom: (projectId: string, fileId: string, filePath: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  
  // Events
  onUserJoined: (callback: (user: CollaborationUser) => void) => () => void;
  onUserLeft: (callback: (user: CollaborationUser) => void) => () => void;
  onCursorMoved: (callback: (event: { user?: CollaborationUser; cursor?: any }) => void) => () => void;
  onPresenceChanged: (callback: (users: CollaborationUser[]) => void) => () => void;
  onDocumentUpdated: (callback: () => void) => () => void;
  
  // Y.js integration
  getYjsDocument: () => any; // Y.Doc
  getSharedText: (name?: string) => any; // Y.Text
  bindToMonaco: (editor: any, yText?: any) => any; // MonacoBinding | null
}

export function useCollaboration(options: UseCollaborationOptions = {}): UseCollaborationReturn {
  const { user } = useAuth();
  const [state, setState] = useState<CollaborationState>(() => collaborationManager.getState());
  const [otherUsers, setOtherUsers] = useState<CollaborationUser[]>([]);
  const eventListenersRef = useRef<Map<string, (() => void)[]>>(new Map());

  // PERFORMANCE: Replace polling with event-based updates
  useEffect(() => {
    const updateState = () => {
      const newState = collaborationManager.getState();
      setState(newState);
      setOtherUsers(Array.from(newState.users.values()));
    };

    // Initial state update
    updateState();

    // PERFORMANCE: Use event listeners instead of polling every 1s
    const handleStateChange = () => {
      updateState();
    };

    // Subscribe to state change events from collaboration manager
    collaborationManager.on('state_changed', handleStateChange);
    collaborationManager.on('user_joined', handleStateChange);
    collaborationManager.on('user_left', handleStateChange);
    collaborationManager.on('presence_changed', handleStateChange);

    return () => {
      collaborationManager.off('state_changed', handleStateChange);
      collaborationManager.off('user_joined', handleStateChange);
      collaborationManager.off('user_left', handleStateChange);
      collaborationManager.off('presence_changed', handleStateChange);
    };
  }, []);

  // Auto-connect if user is available and autoConnect is enabled
  useEffect(() => {
    if (options.autoConnect && user && !state.isConnected) {
      connect();
    }
  }, [user, options.autoConnect, state.isConnected]);

  // Auto-join room if connected and room info is provided
  useEffect(() => {
    if (
      state.isAuthenticated && 
      !state.roomId && 
      options.projectId && 
      options.fileId && 
      options.filePath
    ) {
      joinRoom(options.projectId, options.fileId, options.filePath);
    }
  }, [
    state.isAuthenticated, 
    state.roomId, 
    options.projectId, 
    options.fileId, 
    options.filePath
  ]);

  // Connect to collaboration server
  const connect = useCallback(async (): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated to connect to collaboration');
    }

    try {
      await collaborationManager.connect(user.id);
      console.log('🤝 Connected to collaboration server');
    } catch (error) {
      console.error('Failed to connect to collaboration:', error);
      throw error;
    }
  }, [user]);

  // Disconnect from collaboration server
  const disconnect = useCallback(() => {
    collaborationManager.disconnect();
    console.log('🤝 Disconnected from collaboration server');
  }, []);

  // Join a collaboration room
  const joinRoom = useCallback(async (projectId: string, fileId: string, filePath: string): Promise<void> => {
    try {
      await collaborationManager.joinRoom(projectId, fileId, filePath);
      console.log(`🏠 Joined collaboration room for ${filePath}`);
    } catch (error) {
      console.error('Failed to join collaboration room:', error);
      throw error;
    }
  }, []);

  // Leave current room
  const leaveRoom = useCallback(async (): Promise<void> => {
    try {
      await collaborationManager.leaveRoom();
      console.log('🚪 Left collaboration room');
    } catch (error) {
      console.error('Failed to leave collaboration room:', error);
      throw error;
    }
  }, []);

  // Event subscription helpers
  const createEventSubscription = useCallback((
    eventType: string,
    callback: (event: CollaborationEvent) => void
  ) => {
    collaborationManager.on(eventType, callback);
    
    // Store cleanup function
    const cleanupFn = () => {
      collaborationManager.off(eventType, callback);
    };
    
    if (!eventListenersRef.current.has(eventType)) {
      eventListenersRef.current.set(eventType, []);
    }
    eventListenersRef.current.get(eventType)?.push(cleanupFn);
    
    return cleanupFn;
  }, []);

  // Event subscription methods
  const onUserJoined = useCallback((callback: (user: CollaborationUser) => void) => {
    return createEventSubscription('user_joined', (event) => {
      if (event.user) callback(event.user);
    });
  }, [createEventSubscription]);

  const onUserLeft = useCallback((callback: (user: CollaborationUser) => void) => {
    return createEventSubscription('user_left', (event) => {
      if (event.user) callback(event.user);
    });
  }, [createEventSubscription]);

  const onCursorMoved = useCallback((callback: (event: { user?: CollaborationUser; cursor?: any }) => void) => {
    return createEventSubscription('cursor_moved', (event) => {
      callback({ user: event.user, cursor: event.cursor });
    });
  }, [createEventSubscription]);

  const onPresenceChanged = useCallback((callback: (users: CollaborationUser[]) => void) => {
    return createEventSubscription('presence_changed', (event) => {
      if (event.data?.users) callback(event.data.users);
    });
  }, [createEventSubscription]);

  const onDocumentUpdated = useCallback((callback: () => void) => {
    return createEventSubscription('document_updated', () => {
      callback();
    });
  }, [createEventSubscription]);

  // Y.js integration methods
  const getYjsDocument = useCallback(() => {
    return collaborationManager.getDocument();
  }, []);

  const getSharedText = useCallback((name?: string) => {
    return collaborationManager.getSharedText(name);
  }, []);

  const bindToMonaco = useCallback((editor: any, yText?: any) => {
    return collaborationManager.bindToMonaco(editor, yText);
  }, []);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      eventListenersRef.current.forEach((cleanupFns) => {
        cleanupFns.forEach(cleanup => cleanup());
      });
      eventListenersRef.current.clear();
    };
  }, []);

  // Compute derived state
  const allUsers = [
    ...(state.currentUser ? [state.currentUser] : []),
    ...otherUsers
  ];

  return {
    // Connection state
    isConnected: state.isConnected,
    isAuthenticated: state.isAuthenticated,
    isInRoom: !!state.roomId,
    
    // Users and presence
    currentUser: state.currentUser,
    otherUsers,
    allUsers,
    
    // Room info
    roomId: state.roomId,
    clientId: state.clientId,
    
    // Actions
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    
    // Events
    onUserJoined,
    onUserLeft,
    onCursorMoved,
    onPresenceChanged,
    onDocumentUpdated,
    
    // Y.js integration
    getYjsDocument,
    getSharedText,
    bindToMonaco
  };
}

// Hook for getting collaboration statistics
export function useCollaborationStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    documentsOpen: 0,
    activeRooms: 0
  });

  // This could be extended to fetch real-time stats from the server
  useEffect(() => {
    const state = collaborationManager.getState();
    setStats({
      totalUsers: state.users.size + (state.currentUser ? 1 : 0),
      onlineUsers: Array.from(state.users.values()).filter(u => u.isOnline).length + (state.currentUser ? 1 : 0),
      documentsOpen: state.roomId ? 1 : 0,
      activeRooms: state.roomId ? 1 : 0
    });
  }, []);

  return stats;
}
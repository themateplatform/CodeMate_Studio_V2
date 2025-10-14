import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";
import { Awareness } from "y-protocols/awareness";

interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
}

interface CollaborationContextType {
  doc: Y.Doc | null;
  provider: WebsocketProvider | null;
  awareness: Awareness | null;
  isConnected: boolean;
  users: CollaborationUser[];
  joinRoom: (roomId: string, userId: string, userName: string, projectId: string, fileId: string) => void;
  leaveRoom: () => void;
  updateCursor: (line: number, column: number) => void;
  setText: (text: string) => void;
  getText: () => string;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error("useCollaboration must be used within CollaborationProvider");
  }
  return context;
}

interface CollaborationProviderProps {
  children: ReactNode;
}

export function CollaborationProvider({ children }: CollaborationProviderProps) {
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [indexeddbProvider, setIndexeddbProvider] = useState<IndexeddbPersistence | null>(null);

  const joinRoom = useCallback((roomId: string, userId: string, userName: string, projectId: string, fileId: string) => {
    // Clean up existing connection
    if (provider) {
      provider.disconnect();
    }
    if (indexeddbProvider) {
      indexeddbProvider.destroy();
    }

    // Create new Yjs document
    const newDoc = new Y.Doc();
    setDoc(newDoc);

    // Set up IndexedDB persistence for offline support
    const newIndexeddbProvider = new IndexeddbPersistence(roomId, newDoc);
    setIndexeddbProvider(newIndexeddbProvider);

    // Determine WebSocket URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
    const wsUrl = `${protocol}//${host}:${port}/collaboration?room=${roomId}&user=${userId}&project=${projectId}&file=${fileId}`;

    // Create WebSocket provider
    const newProvider = new WebsocketProvider(
      wsUrl,
      roomId,
      newDoc,
      {
        connect: true,
      }
    );

    // Set up awareness
    const newAwareness = newProvider.awareness;
    newAwareness.setLocalStateField("user", {
      id: userId,
      name: userName,
      color: generateUserColor(userId),
    });

    setProvider(newProvider);
    setAwareness(newAwareness);

    // Handle connection status
    newProvider.on("status", ({ status }: { status: string }) => {
      setIsConnected(status === "connected");
      console.log("[Collaboration] Connection status:", status);
    });

    // Handle synced state
    newProvider.on("sync", ({ synced }: any) => {
      console.log("[Collaboration] Synced:", synced);
    });

    // Handle awareness changes (users joining/leaving)
    newAwareness.on("change", () => {
      const states = Array.from(newAwareness.getStates().entries());
      const activeUsers = states
        .map(([clientId, state]: [number, any]) => {
          const user = state.user;
          if (!user) return null;
          return {
            id: user.id,
            name: user.name,
            email: user.email || "",
            color: user.color,
            cursor: state.cursor,
          } as CollaborationUser;
        })
        .filter((user): user is CollaborationUser => user !== null);
      
      setUsers(activeUsers);
      console.log("[Collaboration] Active users:", activeUsers.length);
    });

    console.log(`[Collaboration] Joined room ${roomId} as ${userName}`);
  }, [provider, indexeddbProvider]);

  const leaveRoom = useCallback(() => {
    if (provider) {
      provider.disconnect();
      setProvider(null);
    }
    if (indexeddbProvider) {
      indexeddbProvider.destroy();
      setIndexeddbProvider(null);
    }
    if (doc) {
      doc.destroy();
      setDoc(null);
    }
    setAwareness(null);
    setIsConnected(false);
    setUsers([]);
    console.log("[Collaboration] Left room");
  }, [provider, indexeddbProvider, doc]);

  const updateCursor = useCallback((line: number, column: number) => {
    if (awareness) {
      awareness.setLocalStateField("cursor", { line, column });
    }
  }, [awareness]);

  const setText = useCallback((text: string) => {
    if (!doc) return;
    const yText = doc.getText("content");
    doc.transact(() => {
      yText.delete(0, yText.length);
      yText.insert(0, text);
    });
  }, [doc]);

  const getText = useCallback(() => {
    if (!doc) return "";
    const yText = doc.getText("content");
    return yText.toString();
  }, [doc]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (provider) {
        provider.disconnect();
      }
      if (indexeddbProvider) {
        indexeddbProvider.destroy();
      }
      if (doc) {
        doc.destroy();
      }
    };
  }, [provider, indexeddbProvider, doc]);

  const value: CollaborationContextType = {
    doc,
    provider,
    awareness,
    isConnected,
    users,
    joinRoom,
    leaveRoom,
    updateCursor,
    setText,
    getText,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

/**
 * Generate a consistent color for a user based on their ID
 */
function generateUserColor(userId: string): string {
  const colors = [
    "#FF6B6B", // Red
    "#4ECDC4", // Cyan
    "#45B7D1", // Blue
    "#FFA07A", // Light Salmon
    "#98D8C8", // Mint
    "#F7DC6F", // Yellow
    "#BB8FCE", // Purple
    "#85C1E2", // Sky Blue
    "#F8B88B", // Peach
    "#AED6F1", // Light Blue
  ];

  // Generate hash from userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

// Offline document state
export interface OfflineDocumentState {
  fileId: string;
  filePath: string;
  projectId: string;
  content: string;
  lastSynced: number;
  localChanges: Uint8Array[];
  version: number;
  isOffline: boolean;
}

// Conflict resolution strategy
export type ConflictResolutionStrategy = 'local-wins' | 'remote-wins' | 'merge-changes' | 'ask-user';

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  localContent: string;
  remoteContent: string;
  mergedContent: string;
  timestamp: number;
}

// Offline operation tracking
export interface OfflineOperation {
  id: string;
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  timestamp: number;
  userId: string;
  applied: boolean;
}

export interface OfflineManagerOptions {
  persistencePrefix?: string;
  autoSyncInterval?: number;
  maxRetries?: number;
  conflictResolutionStrategy?: ConflictResolutionStrategy;
}

export class OfflineManager {
  private db: IndexeddbPersistence | null = null;
  private offlineDocuments: Map<string, OfflineDocumentState> = new Map();
  private pendingOperations: Map<string, OfflineOperation[]> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private options: Required<OfflineManagerOptions>;
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();

  constructor(options: OfflineManagerOptions = {}) {
    this.options = {
      persistencePrefix: 'codevibe-offline',
      autoSyncInterval: 30000, // 30 seconds
      maxRetries: 3,
      conflictResolutionStrategy: 'merge-changes',
      ...options
    };

    this.initializeStorage();
    this.startAutoSync();
  }

  // Initialize IndexedDB storage for offline persistence
  private async initializeStorage(): Promise<void> {
    try {
      // Load existing offline documents from localStorage as fallback
      const stored = localStorage.getItem(`${this.options.persistencePrefix}-documents`);
      if (stored) {
        const documents = JSON.parse(stored);
        for (const [key, doc] of Object.entries(documents)) {
          this.offlineDocuments.set(key, doc as OfflineDocumentState);
        }
      }

      console.log('📚 Offline storage initialized');
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
    }
  }

  // Get or create IndexedDB persistence for a document
  private getIndexedDBPersistence(docName: string): IndexeddbPersistence | null {
    try {
      const ydoc = new Y.Doc();
      return new IndexeddbPersistence(docName, ydoc);
    } catch (error) {
      console.error('Failed to create IndexedDB persistence:', error);
      return null;
    }
  }

  // Store document offline
  async storeDocumentOffline(
    fileId: string,
    filePath: string,
    projectId: string,
    ydoc: Y.Doc,
    content: string
  ): Promise<void> {
    try {
      const docKey = `${projectId}-${fileId}`;
      
      // Get document update for storage
      const update = Y.encodeStateAsUpdateV2(ydoc);
      
      const offlineDoc: OfflineDocumentState = {
        fileId,
        filePath,
        projectId,
        content,
        lastSynced: Date.now(),
        localChanges: [update],
        version: 1,
        isOffline: true
      };

      this.offlineDocuments.set(docKey, offlineDoc);
      await this.persistToStorage();

      // Create IndexedDB persistence for the document
      const persistence = this.getIndexedDBPersistence(docKey);
      if (persistence) {
        // Store Y.Doc state in IndexedDB
        await new Promise<void>((resolve) => {
          persistence.on('synced', () => resolve());
        });
      }

      console.log(`💾 Stored document offline: ${filePath}`);
      this.emit('document-stored-offline', { fileId, filePath, projectId });
    } catch (error) {
      console.error('Failed to store document offline:', error);
      throw error;
    }
  }

  // Load document from offline storage
  async loadDocumentOffline(fileId: string, projectId: string): Promise<OfflineDocumentState | null> {
    try {
      const docKey = `${projectId}-${fileId}`;
      const offlineDoc = this.offlineDocuments.get(docKey);
      
      if (offlineDoc) {
        console.log(`📖 Loaded document from offline storage: ${offlineDoc.filePath}`);
        return offlineDoc;
      }

      // Try to load from IndexedDB
      const persistence = this.getIndexedDBPersistence(docKey);
      if (persistence) {
        return new Promise((resolve) => {
          persistence.on('synced', () => {
            // Convert Y.Doc back to document state
            const ydoc = persistence.doc;
            const ytext = ydoc.getText('monaco');
            const content = ytext.toString();
            
            const doc: OfflineDocumentState = {
              fileId,
              filePath: docKey,
              projectId,
              content,
              lastSynced: Date.now(),
              localChanges: [],
              version: 1,
              isOffline: true
            };
            
            resolve(doc);
          });
        });
      }

      return null;
    } catch (error) {
      console.error('Failed to load document offline:', error);
      return null;
    }
  }

  // Track offline operation
  addOfflineOperation(
    fileId: string,
    projectId: string,
    operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'applied'>
  ): void {
    const docKey = `${projectId}-${fileId}`;
    const ops = this.pendingOperations.get(docKey) || [];
    
    const offlineOp: OfflineOperation = {
      ...operation,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      applied: false
    };

    ops.push(offlineOp);
    this.pendingOperations.set(docKey, ops);
    
    console.log(`📝 Added offline operation: ${operation.type} at ${operation.position}`);
  }

  // Sync document when coming back online
  async syncDocumentOnline(
    fileId: string,
    projectId: string,
    remoteYDoc: Y.Doc,
    localYDoc: Y.Doc
  ): Promise<ConflictResolution | null> {
    try {
      const docKey = `${projectId}-${fileId}`;
      const offlineDoc = this.offlineDocuments.get(docKey);
      
      if (!offlineDoc) {
        console.log('No offline document to sync');
        return null;
      }

      // Get local and remote content
      const localContent = localYDoc.getText('monaco').toString();
      const remoteContent = remoteYDoc.getText('monaco').toString();

      // Check if there are conflicts
      if (localContent === remoteContent) {
        console.log('✅ No conflicts - documents are in sync');
        offlineDoc.isOffline = false;
        offlineDoc.lastSynced = Date.now();
        await this.persistToStorage();
        return null;
      }

      // Apply conflict resolution strategy
      const resolution = await this.resolveConflict(
        localContent,
        remoteContent,
        this.options.conflictResolutionStrategy
      );

      // Apply resolved content to Y.Doc
      if (resolution.strategy === 'local-wins') {
        // Apply local changes to remote
        remoteYDoc.getText('monaco').delete(0, remoteContent.length);
        remoteYDoc.getText('monaco').insert(0, localContent);
      } else if (resolution.strategy === 'remote-wins') {
        // Apply remote changes to local
        localYDoc.getText('monaco').delete(0, localContent.length);
        localYDoc.getText('monaco').insert(0, remoteContent);
      } else {
        // Apply merged content to both
        const mergedContent = resolution.mergedContent;
        localYDoc.getText('monaco').delete(0, localContent.length);
        localYDoc.getText('monaco').insert(0, mergedContent);
        remoteYDoc.getText('monaco').delete(0, remoteContent.length);
        remoteYDoc.getText('monaco').insert(0, mergedContent);
      }

      // Mark as synced
      offlineDoc.isOffline = false;
      offlineDoc.lastSynced = Date.now();
      offlineDoc.localChanges = [];

      // Clear pending operations
      this.pendingOperations.delete(docKey);
      
      await this.persistToStorage();

      console.log(`🔄 Synced document online with ${resolution.strategy} strategy`);
      this.emit('document-synced-online', { fileId, projectId, resolution });

      return resolution;
    } catch (error) {
      console.error('Failed to sync document online:', error);
      throw error;
    }
  }

  // Resolve conflicts between local and remote content
  private async resolveConflict(
    localContent: string,
    remoteContent: string,
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolution> {
    const resolution: ConflictResolution = {
      strategy,
      localContent,
      remoteContent,
      mergedContent: localContent, // Default fallback
      timestamp: Date.now()
    };

    switch (strategy) {
      case 'local-wins':
        resolution.mergedContent = localContent;
        break;
        
      case 'remote-wins':
        resolution.mergedContent = remoteContent;
        break;
        
      case 'merge-changes':
        // Simple line-based merge (more sophisticated merging could be implemented)
        resolution.mergedContent = this.mergeContent(localContent, remoteContent);
        break;
        
      case 'ask-user':
        // In a real implementation, this would show a UI for user to choose
        // For now, fallback to merge
        resolution.mergedContent = this.mergeContent(localContent, remoteContent);
        break;
    }

    return resolution;
  }

  // Simple content merging algorithm
  private mergeContent(localContent: string, remoteContent: string): string {
    // Simple line-based merge
    const localLines = localContent.split('\n');
    const remoteLines = remoteContent.split('\n');
    const merged: string[] = [];

    const maxLines = Math.max(localLines.length, remoteLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const localLine = localLines[i] || '';
      const remoteLine = remoteLines[i] || '';
      
      if (localLine === remoteLine) {
        merged.push(localLine);
      } else if (localLine && remoteLine) {
        // Both have content - merge both with conflict markers
        merged.push(`<<<<<<< Local`);
        merged.push(localLine);
        merged.push(`=======`);
        merged.push(remoteLine);
        merged.push(`>>>>>>> Remote`);
      } else {
        // One is empty - use the non-empty one
        merged.push(localLine || remoteLine);
      }
    }

    return merged.join('\n');
  }

  // Get pending operations for a document
  getPendingOperations(fileId: string, projectId: string): OfflineOperation[] {
    const docKey = `${projectId}-${fileId}`;
    return this.pendingOperations.get(docKey) || [];
  }

  // Check if document has offline changes
  hasOfflineChanges(fileId: string, projectId: string): boolean {
    const docKey = `${projectId}-${fileId}`;
    const doc = this.offlineDocuments.get(docKey);
    return doc ? doc.localChanges.length > 0 : false;
  }

  // Get offline document status
  getOfflineStatus(fileId: string, projectId: string): {
    isOffline: boolean;
    hasChanges: boolean;
    lastSynced: number;
    pendingOperations: number;
  } {
    const docKey = `${projectId}-${fileId}`;
    const doc = this.offlineDocuments.get(docKey);
    const pendingOps = this.pendingOperations.get(docKey) || [];

    return {
      isOffline: doc?.isOffline || false,
      hasChanges: doc ? doc.localChanges.length > 0 : false,
      lastSynced: doc?.lastSynced || 0,
      pendingOperations: pendingOps.length
    };
  }

  // Persist to localStorage
  private async persistToStorage(): Promise<void> {
    try {
      const documents = Object.fromEntries(this.offlineDocuments);
      localStorage.setItem(`${this.options.persistencePrefix}-documents`, JSON.stringify(documents));
      
      const operations = Object.fromEntries(this.pendingOperations);
      localStorage.setItem(`${this.options.persistencePrefix}-operations`, JSON.stringify(operations));
    } catch (error) {
      console.error('Failed to persist to storage:', error);
    }
  }

  // Start auto-sync interval
  private startAutoSync(): void {
    this.syncInterval = setInterval(() => {
      this.emit('auto-sync-triggered', { timestamp: Date.now() });
    }, this.options.autoSyncInterval);
  }

  // Clear offline data for a document
  async clearOfflineData(fileId: string, projectId: string): Promise<void> {
    const docKey = `${projectId}-${fileId}`;
    this.offlineDocuments.delete(docKey);
    this.pendingOperations.delete(docKey);
    await this.persistToStorage();
    
    console.log(`🗑️ Cleared offline data for: ${docKey}`);
  }

  // Get all offline documents
  getAllOfflineDocuments(): OfflineDocumentState[] {
    return Array.from(this.offlineDocuments.values());
  }

  // Event emitter methods
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.offlineDocuments.clear();
    this.pendingOperations.clear();
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();
# Real-Time Collaboration System

## Overview
The Real-Time Collaboration System enables Google Docs-style multiplayer editing across CodeMate Studio. Multiple users can simultaneously edit specifications, code, and other content with live cursor tracking, presence indicators, and conflict-free merging powered by CRDTs (Conflict-Free Replicated Data Types).

## Features

### 1. **Multi-User Editing**
Multiple users can edit the same document simultaneously without conflicts.

**Capabilities:**
- Real-time text synchronization across all connected clients
- Automatic conflict resolution using Yjs CRDTs
- Offline support with IndexedDB persistence
- Automatic merge on reconnection

### 2. **Live Cursors & Presence**
See where collaborators are working in real-time.

**Features:**
- Live cursor positions with user names and colors
- Visual indicators showing who's editing which field
- User avatars with online/offline status
- Participant count and list

### 3. **Awareness Protocol**
Track user activity and presence information.

**Tracked Information:**
- User name, email, and avatar
- Current cursor position (line and column)
- Active editing field
- Connection status
- Last activity timestamp

### 4. **Offline Support**
Continue working even when disconnected.

**Features:**
- IndexedDB persistence for offline editing
- Automatic sync when connection restored
- Conflict-free merge of offline changes
- Visual connection status indicator

### 5. **Document Persistence**
All collaboration sessions are persisted to PostgreSQL.

**Database Storage:**
- Collaboration rooms (project and file context)
- Room participants with online status
- Yjs document states for recovery
- Live cursor positions
- Collaboration timeline (operation history)

## Architecture

### Technology Stack

**Frontend:**
- **Yjs**: CRDT-based document synchronization
- **y-websocket**: WebSocket provider for Yjs
- **y-indexeddb**: IndexedDB persistence for offline support
- **y-protocols/awareness**: User presence and cursor tracking
- **lib0**: Encoding/decoding utilities

**Backend:**
- **WebSocket (ws)**: Real-time bidirectional communication
- **Yjs**: Server-side CRDT document management
- **PostgreSQL/Drizzle**: Document state persistence
- **Express**: HTTP server integration

### Component Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Client Layer                        │
├─────────────────────────────────────────────────────┤
│  CollaborationProvider (React Context)               │
│  ├── Yjs Document                                    │
│  ├── WebSocket Provider                              │
│  ├── IndexedDB Provider (offline)                    │
│  └── Awareness Protocol                              │
├─────────────────────────────────────────────────────┤
│  UI Components                                       │
│  ├── CollaborativeCodeEditor                         │
│  ├── CollaborativeField                              │
│  ├── CollaborationPresence                           │
│  └── LiveCursors                                     │
└─────────────────────────────────────────────────────┘
                         ↕ WebSocket
┌─────────────────────────────────────────────────────┐
│                  Server Layer                        │
├─────────────────────────────────────────────────────┤
│  YjsCollaborationServer                              │
│  ├── Room Management                                 │
│  ├── Connection Handling                             │
│  ├── Message Broadcasting                            │
│  └── State Persistence                               │
├─────────────────────────────────────────────────────┤
│  PostgreSQL Database                                 │
│  ├── collaboration_rooms                             │
│  ├── room_participants                               │
│  ├── y_doc_states                                    │
│  ├── collaboration_cursors                           │
│  └── collaboration_timeline                          │
└─────────────────────────────────────────────────────┘
```

## Usage Guide

### Basic Setup

#### 1. Wrap App with CollaborationProvider

The `CollaborationProvider` is already integrated in `App.tsx`:

```tsx
import { CollaborationProvider } from "@/lib/collaboration-context";

function App() {
  return (
    <CollaborationProvider>
      {/* Your app content */}
    </CollaborationProvider>
  );
}
```

#### 2. Join a Collaboration Room

```tsx
import { useCollaboration } from "@/lib/collaboration-context";

function MyComponent() {
  const { joinRoom, leaveRoom, isConnected, users } = useCollaboration();

  useEffect(() => {
    // Join room when component mounts
    joinRoom(
      "room-123",           // Unique room ID
      "user-456",           // User ID
      "John Doe",           // User name
      "project-789",        // Project ID
      "file-001"            // File ID
    );

    return () => {
      leaveRoom();
    };
  }, []);

  return (
    <div>
      <p>Connected: {isConnected ? "Yes" : "No"}</p>
      <p>Active users: {users.length}</p>
    </div>
  );
}
```

### Collaborative Components

#### CollaborativeCodeEditor

Real-time code editing with live cursors:

```tsx
import { CollaborativeCodeEditor } from "@/components/collaboration/CollaborativeCodeEditor";

function CodeEditorPage() {
  return (
    <CollaborativeCodeEditor
      roomId="room-code-123"
      userId="user-456"
      userName="John Doe"
      projectId="project-789"
      fileId="file-001"
      initialCode="console.log('Hello');"
      language="typescript"
      onCodeChange={(code) => console.log("Code updated:", code)}
    />
  );
}
```

**Features:**
- Live cursor tracking for all users
- Real-time text synchronization
- Conflict-free concurrent editing
- User avatars showing who's editing
- Connection status badge

#### CollaborativeField

Real-time form field with visual editing indicators:

```tsx
import { CollaborativeField } from "@/components/collaboration/CollaborativeField";

function SpecEditorForm() {
  const [title, setTitle] = useState("");

  return (
    <CollaborativeField
      fieldName="spec-title"
      value={title}
      onChange={setTitle}
      type="input"
      placeholder="Enter specification title..."
    />
  );
}
```

**Features:**
- Syncs across all users
- Shows who's currently editing
- Visual ring highlight when others edit
- Badge showing editor names

#### CollaborationPresence

Shows all active users in the collaboration session:

```tsx
import { CollaborationPresence } from "@/components/collaboration/CollaborationPresence";

function EditorPage() {
  return (
    <>
      <CollaborationPresence />
      {/* Your editor content */}
    </>
  );
}
```

**Displays:**
- Connection status (online/offline)
- User count
- User avatars (up to 5, with overflow)
- User list with names and cursor positions

#### LiveCursors

Renders live cursor positions directly in the editor:

```tsx
import { LiveCursors } from "@/components/collaboration/LiveCursors";

function CustomEditor() {
  const editorRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={editorRef}>
      <LiveCursors editorRef={editorRef} />
      {/* Your editor content */}
    </div>
  );
}
```

**Features:**
- Animated cursor movement
- User name labels above cursors
- Color-coded per user
- Automatic cleanup when users leave

### Collaboration Context API

#### useCollaboration Hook

Access collaboration state and methods:

```tsx
const {
  doc,          // Y.Doc instance
  provider,     // WebSocket provider
  awareness,    // Awareness protocol
  isConnected,  // Connection status
  users,        // Array of active users
  joinRoom,     // Join collaboration room
  leaveRoom,    // Leave current room
  updateCursor, // Update cursor position
  setText,      // Set text content
  getText,      // Get text content
} = useCollaboration();
```

#### Methods

**joinRoom(roomId, userId, userName, projectId, fileId)**
- Creates or joins a collaboration room
- Sets up WebSocket connection
- Initializes local awareness state
- Returns: void

**leaveRoom()**
- Disconnects from current room
- Cleans up providers
- Destroys local document
- Returns: void

**updateCursor(line, column)**
- Updates local cursor position
- Broadcasts to all users
- Returns: void

**setText(text)**
- Sets document text content
- Triggers sync to all users
- Returns: void

**getText()**
- Gets current document text
- Returns: string

#### State

**doc: Y.Doc | null**
- Yjs document instance
- Contains all shared types (Text, Map, Array)

**provider: WebsocketProvider | null**
- WebSocket connection to server
- Handles sync and awareness

**awareness: Awareness | null**
- User presence protocol
- Tracks cursors and metadata

**isConnected: boolean**
- Current WebSocket connection status

**users: CollaborationUser[]**
- Array of active collaborators
- Each contains: id, name, email, color, cursor

## Server Implementation

### YjsCollaborationServer

The server manages collaboration rooms and handles WebSocket connections.

**Location:** `server/collaboration/yjs-server.ts`

#### Key Features

1. **Room Management**
   - Creates rooms on-demand
   - Maintains in-memory room state
   - Persists to PostgreSQL periodically

2. **Connection Handling**
   - Accepts WebSocket connections
   - Validates room parameters
   - Registers participants in database

3. **Message Broadcasting**
   - Sync messages (document updates)
   - Awareness messages (user presence)
   - Custom messages (cursors, operations)

4. **State Persistence**
   - Saves Yjs document state to PostgreSQL
   - Loads state on room creation
   - Implements debounced writes

5. **Cleanup**
   - Removes inactive rooms after timeout
   - Marks participants offline on disconnect
   - Periodic cleanup of stale rooms

#### Room Lifecycle

```
1. Client connects
   ↓
2. Server creates or retrieves room
   ↓
3. Load persisted state from DB
   ↓
4. Register participant
   ↓
5. Send initial sync to client
   ↓
6. Handle messages bidirectionally
   ↓
7. Client disconnects
   ↓
8. Mark participant offline
   ↓
9. Schedule room cleanup (if empty)
   ↓
10. Persist final state and remove from memory
```

### WebSocket URL Format

```
ws://hostname:port/collaboration?room={roomId}&user={userId}&project={projectId}&file={fileId}
```

**Parameters:**
- `room`: Unique room identifier
- `user`: User ID
- `project`: Project ID (for database context)
- `file`: File ID (for database context)

### Message Types

#### Sync Messages (Type 0)
Binary messages containing Yjs updates:
```
[0, ...encoded_update]
```

#### Awareness Messages (Type 1)
User presence and cursor information:
```
[1, ...encoded_awareness]
```

#### Custom Messages (Type 2+)
JSON-encoded custom messages:
```json
{
  "type": "cursor" | "operation",
  "roomId": "room-123",
  "userId": "user-456",
  "payload": { ... }
}
```

## Database Schema

### collaboration_rooms
Stores active collaboration rooms.

```sql
CREATE TABLE collaboration_rooms (
  id VARCHAR PRIMARY KEY,
  project_id VARCHAR NOT NULL,
  file_id VARCHAR NOT NULL,
  room_name TEXT NOT NULL,
  y_doc_state TEXT,
  state_vector TEXT,
  last_activity TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  max_participants INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### room_participants
Tracks users in each room.

```sql
CREATE TABLE room_participants (
  id VARCHAR PRIMARY KEY,
  room_id VARCHAR REFERENCES collaboration_rooms(id),
  user_id VARCHAR REFERENCES users(id),
  client_id TEXT NOT NULL,
  role TEXT DEFAULT 'editor',
  is_online BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);
```

### y_doc_states
Persists Yjs document states.

```sql
CREATE TABLE y_doc_states (
  id VARCHAR PRIMARY KEY,
  room_id VARCHAR REFERENCES collaboration_rooms(id),
  doc_name TEXT NOT NULL,
  state_vector TEXT NOT NULL,
  document_update TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  checksum TEXT,
  compaction_level INTEGER DEFAULT 0,
  is_snapshot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### collaboration_cursors
Stores live cursor positions.

```sql
CREATE TABLE collaboration_cursors (
  id VARCHAR PRIMARY KEY,
  room_id VARCHAR REFERENCES collaboration_rooms(id),
  user_id VARCHAR REFERENCES users(id),
  client_id TEXT NOT NULL,
  position JSONB NOT NULL,
  color TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_updated TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);
```

### collaboration_timeline
Logs all collaboration operations.

```sql
CREATE TABLE collaboration_timeline (
  id VARCHAR PRIMARY KEY,
  room_id VARCHAR REFERENCES collaboration_rooms(id),
  user_id VARCHAR REFERENCES users(id),
  operation_type TEXT NOT NULL,
  operation JSONB NOT NULL,
  position JSONB,
  content TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  client_clock INTEGER NOT NULL,
  dependencies TEXT[],
  metadata JSONB
);
```

## Configuration

### Environment Variables

No additional environment variables required. Uses existing:
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)

### Server Configuration

**File:** `server/index.ts`

```typescript
// WebSocket server runs on same port as HTTP
const server = createServer(app);
const wss = new WebSocketServer({ 
  server,
  path: "/collaboration"
});

// Initialize Yjs collaboration server
yjsServer.initialize(wss);
```

### Room Timeouts

**File:** `server/collaboration/yjs-server.ts`

```typescript
private readonly CLEANUP_INTERVAL = 5 * 60 * 1000;  // 5 minutes
private readonly ROOM_TIMEOUT = 30 * 60 * 1000;     // 30 minutes
```

## Testing Guide

### Manual Testing

#### Test 1: Multi-User Editing
1. Open the app in two browser windows
2. Navigate to spec editor or code editor
3. Join the same room in both windows
4. Type in one window
5. ✓ Verify changes appear instantly in other window

#### Test 2: Live Cursors
1. Open app in two windows with same room
2. Move cursor in one window
3. ✓ Verify cursor appears in other window with user name

#### Test 3: Presence Indicators
1. Join room in multiple windows
2. ✓ Verify user count increases
3. ✓ Verify avatars appear in presence widget
4. Close one window
5. ✓ Verify user count decreases

#### Test 4: Offline Support
1. Join a room and type some content
2. Disconnect from network
3. Continue typing
4. Reconnect to network
5. ✓ Verify changes sync automatically
6. ✓ Verify no data loss

#### Test 5: Conflict Resolution
1. Open in two windows
2. Disconnect both from network
3. Type different content in same location
4. Reconnect both
5. ✓ Verify both changes preserved (CRDT merge)
6. ✓ Verify no conflicts or errors

#### Test 6: Field Editing Indicators
1. Use CollaborativeField component
2. Focus field in one window
3. ✓ Verify "X is editing" badge appears in other window
4. ✓ Verify field highlights with blue ring

#### Test 7: Connection Status
1. Join a room
2. ✓ Verify "Connected" status shows
3. Disconnect network
4. ✓ Verify "Disconnected" status shows
5. Reconnect
6. ✓ Verify "Connected" status returns

#### Test 8: Room Persistence
1. Join a room and add content
2. Close all windows
3. Wait a few minutes
4. Rejoin the room
5. ✓ Verify content persists from database

### Automated Testing

#### Unit Tests (Future)
```typescript
describe("CollaborationProvider", () => {
  it("should create Y.Doc on mount", () => {});
  it("should connect to WebSocket", () => {});
  it("should sync text changes", () => {});
  it("should track user cursors", () => {});
  it("should cleanup on unmount", () => {});
});
```

#### Integration Tests (Future)
```typescript
describe("Real-Time Sync", () => {
  it("should sync changes between clients", () => {});
  it("should handle offline/online transitions", () => {});
  it("should resolve concurrent edits", () => {});
});
```

## Performance Considerations

### Optimization Strategies

1. **Debounced Persistence**
   - Document state saved to DB on update events
   - Natural debouncing via Yjs update cycle
   - Prevents excessive database writes

2. **Binary Protocol**
   - Yjs uses efficient binary encoding
   - Minimal bandwidth for sync messages
   - lib0 encoding utilities optimize size

3. **Incremental Sync**
   - Only changed portions transmitted
   - State vectors track what's already synced
   - Reduces redundant data transfer

4. **Room Cleanup**
   - Inactive rooms removed after 30 minutes
   - Periodic cleanup every 5 minutes
   - Prevents memory leaks

5. **IndexedDB Caching**
   - Local persistence for offline support
   - Reduces server load for repeated loads
   - Instant initial state

### Scalability

**Current Limitations:**
- In-memory room storage (single server instance)
- PostgreSQL as persistence layer
- WebSocket connections limited by server resources

**Future Enhancements:**
- Redis for distributed room state
- Multiple server instances with load balancing
- WebSocket server cluster with sticky sessions
- CDN for static assets

## Troubleshooting

### Common Issues

#### Issue: "WebSocket connection failed"
**Symptoms:** Connection status shows "Disconnected", users can't see each other

**Solutions:**
1. Check server is running: `npm run dev`
2. Verify WebSocket port is accessible
3. Check browser console for connection errors
4. Ensure firewall allows WebSocket connections

#### Issue: "Changes not syncing"
**Symptoms:** Edits in one window don't appear in another

**Solutions:**
1. Verify both clients are in the same room (same roomId)
2. Check connection status is "Connected"
3. Check browser console for Yjs errors
4. Verify database connection is healthy

#### Issue: "Cursors not appearing"
**Symptoms:** Can't see other users' cursors

**Solutions:**
1. Verify awareness protocol is active
2. Check cursor update calls are being made
3. Ensure editor ref is passed to LiveCursors
4. Check browser console for awareness errors

#### Issue: "Offline changes not syncing"
**Symptoms:** Changes made offline are lost on reconnect

**Solutions:**
1. Verify IndexedDB is enabled in browser
2. Check IndexeddbPersistence is initialized
3. Verify service worker is not interfering
4. Check browser storage quota

#### Issue: "Room cleanup too aggressive"
**Symptoms:** Rooms closing while users still active

**Solutions:**
1. Adjust `ROOM_TIMEOUT` in yjs-server.ts
2. Verify lastActivity is being updated
3. Check for connection keepalive issues

### Debug Mode

Enable detailed logging:

```typescript
// In collaboration-context.tsx
console.log("[Collaboration] Joined room:", roomId);
console.log("[Collaboration] Active users:", activeUsers);
console.log("[Collaboration] Connection status:", status);

// In yjs-server.ts
console.log("[Yjs] User ${userId} joining room ${roomId}");
console.log("[Yjs] Room ${roomId} created");
console.log("[Yjs] Message received:", messageType);
```

### Health Check

Check collaboration server health:

```bash
# Get room statistics
GET /api/collaboration/stats

Response:
{
  "totalRooms": 5,
  "activeConnections": 12,
  "rooms": [
    {
      "roomId": "room-123",
      "connections": 3,
      "lastActivity": "2025-10-13T10:30:00Z"
    }
  ]
}
```

## Security Considerations

### Authentication

**Current Implementation:**
- WebSocket connections require room, user, project, file parameters
- No authentication check on connection (planned)

**Future Enhancements:**
- Validate session token on WebSocket upgrade
- Check user permissions for project/file access
- Rate limiting per user
- Room access control lists (ACLs)

### Data Privacy

**Current:**
- All data transmitted via WebSocket (unencrypted in development)
- Document states stored in PostgreSQL
- User metadata tracked in awareness

**Production Requirements:**
- WSS (WebSocket Secure) in production
- TLS/SSL for all connections
- Encrypt sensitive document data at rest
- GDPR compliance for user tracking

### Input Validation

**Current:**
- Room parameters validated on connection
- Malformed messages caught and logged

**Enhancements:**
- Sanitize all user input
- Validate message structure
- Rate limit message frequency
- Prevent injection attacks

## API Reference

### CollaborationProvider

```tsx
interface CollaborationProviderProps {
  children: ReactNode;
}

function CollaborationProvider(props: CollaborationProviderProps): JSX.Element
```

### useCollaboration

```tsx
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

function useCollaboration(): CollaborationContextType
```

### CollaborativeCodeEditor

```tsx
interface CollaborativeCodeEditorProps {
  roomId: string;
  userId: string;
  userName: string;
  projectId: string;
  fileId: string;
  initialCode?: string;
  language?: string;
  onCodeChange?: (code: string) => void;
}

function CollaborativeCodeEditor(props: CollaborativeCodeEditorProps): JSX.Element
```

### CollaborativeField

```tsx
interface CollaborativeFieldProps {
  fieldName: string;
  value: string;
  onChange: (value: string) => void;
  type?: "input" | "textarea";
  placeholder?: string;
  rows?: number;
  className?: string;
}

function CollaborativeField(props: CollaborativeFieldProps): JSX.Element
```

### CollaborationPresence

```tsx
function CollaborationPresence(): JSX.Element | null
```

### LiveCursors

```tsx
interface LiveCursorProps {
  editorRef?: React.RefObject<HTMLElement>;
}

function LiveCursors(props: LiveCursorProps): null
```

## Future Enhancements

### Planned Features

1. **Rich Text Editing**
   - y-prosemirror or y-quill integration
   - Formatted text with CRDT support
   - Comments and annotations

2. **Voice/Video Chat**
   - WebRTC integration for voice
   - In-app video conferencing
   - Screen sharing for pair programming

3. **Presence Avatars**
   - User profile pictures
   - Status indicators (typing, idle, away)
   - Custom status messages

4. **Activity Feed**
   - Real-time activity log
   - Who edited what and when
   - Replay edit history

5. **Permissions System**
   - Read-only vs. edit access
   - Lock sections while editing
   - Request edit permissions

6. **Mobile Support**
   - Touch-optimized cursors
   - Mobile-friendly presence UI
   - Offline sync for mobile

7. **Analytics**
   - Collaboration metrics
   - User engagement tracking
   - Performance monitoring

8. **Advanced Conflict Resolution**
   - Manual conflict resolution UI
   - Diff viewer for conflicts
   - Accept/reject changes

## Related Documentation

- [Architecture Overview](../README.md)
- [Authentication System](./AUTHENTICATION.md)
- [Projects Management](./PROJECTS.md)
- [AI Suggestions](./AI-SUGGESTIONS.md)

## Support

For issues or questions:
- GitHub Issues: [themateplatform/fertile-ground-base](https://github.com/themateplatform/fertile-ground-base/issues)
- Documentation: `/docs`
- API Reference: This document

## License

Part of CodeMate Studio platform - see main LICENSE file.

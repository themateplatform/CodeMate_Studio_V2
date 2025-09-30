import { useEffect, useRef, useState, useCallback } from "react";
import { Project, FileTreeNode } from "@/types";
import { useCollaboration } from "@/hooks/useCollaboration";
import { Users, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MonacoEditorProps {
  file: FileTreeNode;
  project: Project | null;
}

export function MonacoEditor({ file, project }: MonacoEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editor, setEditor] = useState<any>(null);
  const [monacoBinding, setMonacoBinding] = useState<any>(null);
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(false);

  // Use collaboration hook
  const {
    isConnected,
    isAuthenticated,
    isInRoom,
    currentUser,
    otherUsers,
    allUsers,
    connect,
    joinRoom,
    leaveRoom,
    bindToMonaco,
    getSharedText,
    onUserJoined,
    onUserLeft,
    onCursorMoved,
    onPresenceChanged
  } = useCollaboration({
    projectId: project?.id,
    fileId: file.id,
    filePath: file.path,
    autoConnect: true
  });

  // Handle collaboration events
  useEffect(() => {
    const unsubscribeUserJoined = onUserJoined((user) => {
      console.log(`👤 User joined: ${user.name}`);
    });

    const unsubscribeUserLeft = onUserLeft((user) => {
      console.log(`👋 User left: ${user.name}`);
    });

    const unsubscribeCursorMoved = onCursorMoved((event) => {
      // Handle live cursors in Monaco Editor
      if (event.user && event.cursor && editor) {
        renderUserCursor(event.user, event.cursor);
      }
    });

    const unsubscribePresenceChanged = onPresenceChanged((users) => {
      console.log(`👥 Presence updated: ${users.length} users online`);
    });

    return () => {
      unsubscribeUserJoined();
      unsubscribeUserLeft();
      unsubscribeCursorMoved();
      unsubscribePresenceChanged();
    };
  }, [onUserJoined, onUserLeft, onCursorMoved, onPresenceChanged, editor]);

  // PERFORMANCE: Track decorations and styles to prevent memory leaks
  const cursorDecorations = useRef<Map<string, string[]>>(new Map()); // userId -> decorationIds
  const cursorStyles = useRef<Map<string, HTMLStyleElement>>(new Map()); // userId -> styleElement
  const [monacoInstance, setMonacoInstance] = useState<any>(null);

  // PERFORMANCE: Render user cursor with proper cleanup and tracking
  const renderUserCursor = useCallback((user: any, cursor: any) => {
    if (!editor || !cursor || !monacoInstance) return;

    try {
      // Clean up previous decorations for this user
      const existingDecorations = cursorDecorations.current.get(user.id) || [];
      
      // Create new decoration
      const decoration = {
        range: new monacoInstance.Range(cursor.line, cursor.column, cursor.line, cursor.column),
        options: {
          className: `user-cursor-${user.id}`,
          hoverMessage: { value: `${user.name} is here` },
          beforeContentClassName: `user-cursor-line user-cursor-${user.id}`,
          stickiness: monacoInstance.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      };

      // PERFORMANCE: Use deltaDecorations to replace old decorations atomically
      const newDecorationIds = editor.deltaDecorations(existingDecorations, [decoration]);
      cursorDecorations.current.set(user.id, newDecorationIds);

      // PERFORMANCE: Reuse or create style element for this user
      let styleElement = cursorStyles.current.get(user.id);
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.setAttribute('data-user-cursor', user.id); // For debugging/cleanup
        document.head.appendChild(styleElement);
        cursorStyles.current.set(user.id, styleElement);
      }

      // Update style content
      styleElement.textContent = `
        .user-cursor-${user.id}::before {
          content: '';
          position: absolute;
          width: 2px;
          height: 20px;
          background-color: ${user.color};
          z-index: 1000;
        }
        .user-cursor-line.user-cursor-${user.id} {
          border-left: 2px solid ${user.color};
        }
      `;
    } catch (error) {
      console.error('Error rendering user cursor:', error);
    }
  }, [editor, monacoInstance]);

  useEffect(() => {
    const loadMonaco = async () => {
      try {
        // Load Monaco Editor dynamically
        const monaco = await import('monaco-editor');
        
        // PERFORMANCE: Store monaco instance to avoid using window.monaco
        setMonacoInstance(monaco);
        
        // Configure Monaco with collaboration-aware theme
        monaco.editor.defineTheme('vscode-dark-collaborative', {
          base: 'vs-dark',
          inherit: true,
          rules: [
            { token: 'keyword', foreground: 'A78BFA' }, // purple
            { token: 'string', foreground: '4ADE80' }, // green
            { token: 'comment', foreground: '6B7280' }, // gray
            { token: 'function', foreground: '06B6D4' }, // cyan
            { token: 'variable', foreground: 'FBBF24' }, // yellow
          ],
          colors: {
            'editor.background': '#1a1a1a',
            'editor.foreground': '#ffffff',
            'editorLineNumber.foreground': '#6B7280',
            'editorLineNumber.activeForeground': '#A78BFA',
            'editor.selectionBackground': '#A78BFA40',
            'editor.lineHighlightBackground': '#ffffff08',
            'editorCursor.foreground': '#A78BFA', // Main cursor color
          }
        });

        if (editorRef.current) {
          // Create editor with initial content
          const initialContent = file.content || '// Welcome to CodeVibe\n// Start coding here...';
          
          const newEditor = monaco.editor.create(editorRef.current, {
            value: initialContent,
            language: getLanguageFromFile(file.name),
            theme: 'vscode-dark-collaborative',
            fontSize: 14,
            lineHeight: 1.5,
            fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            glyphMargin: false,
            folding: true,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
            renderLineHighlight: 'line',
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            }
          });

          setEditor(newEditor);
          setIsLoading(false);

          // Set up Y.js collaboration binding once we have both editor and room
          if (isInRoom && isAuthenticated) {
            setupCollaboration(newEditor);
          }
        }
      } catch (error) {
        console.error('Failed to load Monaco Editor:', error);
        setIsLoading(false);
      }
    };

    loadMonaco();

    return () => {
      // PERFORMANCE: Clean up cursor decorations and styles to prevent memory leaks
      if (editor) {
        // Remove all cursor decorations
        cursorDecorations.current.forEach((decorationIds) => {
          editor.deltaDecorations(decorationIds, []);
        });
        cursorDecorations.current.clear();
        
        editor.dispose();
      }
      
      // Remove all cursor style elements
      cursorStyles.current.forEach((styleElement) => {
        if (styleElement.parentNode) {
          styleElement.parentNode.removeChild(styleElement);
        }
      });
      cursorStyles.current.clear();
      
      if (monacoBinding) {
        monacoBinding.destroy();
      }
    };
  }, [file]);

  // Set up Y.js collaboration when editor and room are ready
  useEffect(() => {
    if (editor && isInRoom && isAuthenticated && !monacoBinding) {
      setupCollaboration(editor);
    }
  }, [editor, isInRoom, isAuthenticated, monacoBinding]);

  // Set up Y.js collaboration binding
  const setupCollaboration = useCallback(async (editorInstance: any) => {
    try {
      // Get shared text from Y.js document
      const sharedText = getSharedText('monaco');
      
      // If this is a new document, initialize with file content
      if (sharedText.length === 0 && file.content) {
        sharedText.insert(0, file.content);
      }

      // Bind Y.js to Monaco Editor
      const binding = bindToMonaco(editorInstance, sharedText);
      setMonacoBinding(binding);

      console.log('🤝 Y.js collaboration binding established');

      // Handle content changes for auto-save (debounced)
      let saveTimeout: NodeJS.Timeout;
      editorInstance.onDidChangeModelContent(() => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          const content = editorInstance.getValue();
          // TODO: Implement auto-save to server
          console.log('📝 Content changed (auto-save):', content.length, 'characters');
        }, 1000);
      });

    } catch (error) {
      console.error('Failed to set up collaboration:', error);
    }
  }, [getSharedText, bindToMonaco, file.content]);

  // Connect to collaboration if not connected
  const handleConnect = useCallback(async () => {
    try {
      if (!isConnected) {
        await connect();
      }
      if (project && file && !isInRoom) {
        await joinRoom(project.id, file.id, file.path);
      }
    } catch (error) {
      console.error('Failed to connect to collaboration:', error);
    }
  }, [isConnected, isInRoom, connect, joinRoom, project, file]);

  // Auto-connect when component mounts
  useEffect(() => {
    if (project && file && !isConnected) {
      handleConnect();
    }
  }, [project, file, isConnected, handleConnect]);

  const getLanguageFromFile = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'py':
        return 'python';
      case 'sql':
        return 'sql';
      default:
        return 'plaintext';
    }
  };

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Collaboration Toolbar */}
      <div className="flex items-center justify-between p-2 bg-background border-b border-border">
        <div className="flex items-center space-x-2">
          {/* Connection Status */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant={isConnected ? "default" : "destructive"}
                  className="flex items-center space-x-1"
                >
                  {isConnected ? (
                    <Wifi className="w-3 h-3" />
                  ) : (
                    <WifiOff className="w-3 h-3" />
                  )}
                  <span>{isConnected ? 'Connected' : 'Offline'}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isConnected ? 'Connected to collaboration server' : 'Disconnected from collaboration server'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Room Status */}
          {isAuthenticated && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge 
                    variant={isInRoom ? "default" : "secondary"}
                    className="flex items-center space-x-1"
                  >
                    <Users className="w-3 h-3" />
                    <span>{isInRoom ? 'In Room' : 'Solo'}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isInRoom ? 'Collaborating in real-time' : 'Working alone'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* File Info */}
          <span className="text-sm text-muted-foreground">
            {file.name}
          </span>
        </div>

        {/* Active Users */}
        <div className="flex items-center space-x-2">
          {allUsers.length > 0 && (
            <div className="flex items-center space-x-1">
              <span className="text-xs text-muted-foreground">
                {allUsers.length} user{allUsers.length !== 1 ? 's' : ''}
              </span>
              <div className="flex -space-x-1">
                {allUsers.slice(0, 5).map((user) => (
                  <TooltipProvider key={user.id}>
                    <Tooltip>
                      <TooltipTrigger>
                        <Avatar className="w-6 h-6 ring-2 ring-background">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback 
                            className="text-xs"
                            style={{ backgroundColor: user.color + '20', color: user.color }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{user.name} {user.id === currentUser?.id ? '(You)' : ''}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.isOnline ? 'Online' : 'Offline'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {allUsers.length > 5 && (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center ring-2 ring-background">
                    <span className="text-xs text-muted-foreground">
                      +{allUsers.length - 5}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collaboration Panel Toggle */}
          <button
            onClick={() => setShowCollaborationPanel(!showCollaborationPanel)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle collaboration panel"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 relative">
        <div ref={editorRef} className="h-full w-full" />
        
        {/* Collaboration Panel */}
        {showCollaborationPanel && (
          <div className="absolute top-0 right-0 w-64 h-full bg-background border-l border-border shadow-lg">
            <div className="p-4">
              <h3 className="font-semibold mb-4 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Collaboration
              </h3>
              
              {/* Connection Actions */}
              {!isConnected && (
                <div className="mb-4">
                  <button
                    onClick={handleConnect}
                    className="w-full p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                  >
                    Connect to Collaboration
                  </button>
                </div>
              )}

              {/* Active Users List */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Active Users ({allUsers.length})
                </h4>
                {allUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback 
                        style={{ backgroundColor: user.color + '20', color: user.color }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.name}
                        {user.id === currentUser?.id && ' (You)'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: user.color }}
                    />
                  </div>
                ))}
                {allUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No other users online
                  </p>
                )}
              </div>

              {/* Collaboration Stats */}
              {isInRoom && (
                <div className="mt-6 p-3 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Session Info</h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Room: {file.path}</div>
                    <div>Users: {allUsers.length}</div>
                    <div>Status: {isConnected ? 'Synced' : 'Offline'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live Cursors Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Live cursors will be rendered here via CSS */}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useCollaboration } from "@/lib/collaboration-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, Users } from "lucide-react";
import * as Y from "yjs";

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

export function CollaborativeCodeEditor({
  roomId,
  userId,
  userName,
  projectId,
  fileId,
  initialCode = "",
  language = "typescript",
  onCodeChange,
}: CollaborativeCodeEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const { doc, joinRoom, leaveRoom, isConnected, users, updateCursor } = useCollaboration();
  const [code, setCode] = useState(initialCode);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Join collaboration room
    if (!isInitializedRef.current) {
      joinRoom(roomId, userId, userName, projectId, fileId);
      isInitializedRef.current = true;
    }

    return () => {
      leaveRoom();
    };
  }, [roomId, userId, userName, projectId, fileId, joinRoom, leaveRoom]);

  useEffect(() => {
    if (!doc) return;

    const yText = doc.getText("content");

    // Initialize with initial code if text is empty
    if (yText.length === 0 && initialCode) {
      yText.insert(0, initialCode);
    }

    // Sync text to local state
    const updateHandler = () => {
      const newCode = yText.toString();
      setCode(newCode);
      if (onCodeChange) {
        onCodeChange(newCode);
      }
    };

    yText.observe(updateHandler);
    updateHandler(); // Initial sync

    return () => {
      yText.unobserve(updateHandler);
    };
  }, [doc, initialCode, onCodeChange]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!doc) return;

    const newValue = e.target.value;
    const yText = doc.getText("content");

    // Calculate diff and apply changes
    doc.transact(() => {
      const oldValue = yText.toString();
      const commonStart = getCommonStart(oldValue, newValue);
      const commonEnd = getCommonEnd(
        oldValue.slice(commonStart),
        newValue.slice(commonStart)
      );

      const deleteLength = oldValue.length - commonStart - commonEnd;
      const insertText = newValue.slice(commonStart, newValue.length - commonEnd);

      if (deleteLength > 0) {
        yText.delete(commonStart, deleteLength);
      }
      if (insertText.length > 0) {
        yText.insert(commonStart, insertText);
      }
    });

    setCode(newValue);
  };

  const handleCursorMove = (e: React.MouseEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!editorRef.current) return;

    const textarea = editorRef.current;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = code.slice(0, cursorPosition);
    const lines = textBeforeCursor.split("\n");
    const line = lines.length - 1;
    const column = lines[lines.length - 1].length;

    updateCursor(line, column);
  };

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Collaborative Editor
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">{users.length} active</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          {users.length > 0 && (
            <div className="absolute top-2 right-2 z-10 flex -space-x-2">
              {users.slice(0, 3).map((user) => (
                <div
                  key={user.id}
                  className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                  style={{ backgroundColor: user.color }}
                  title={user.name}
                >
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
              ))}
              {users.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">
                  +{users.length - 3}
                </div>
              )}
            </div>
          )}
          <textarea
            ref={editorRef}
            value={code}
            onChange={handleChange}
            onKeyUp={handleCursorMove}
            onClick={handleCursorMove}
            className="w-full min-h-[400px] p-4 font-mono text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-b-lg resize-y"
            placeholder="Start typing or wait for collaborators..."
            spellCheck={false}
            style={{
              tabSize: 2,
              lineHeight: "1.5",
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Find common start between two strings
 */
function getCommonStart(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) {
    i++;
  }
  return i;
}

/**
 * Find common end between two strings
 */
function getCommonEnd(a: string, b: string): number {
  let i = 0;
  while (
    i < a.length &&
    i < b.length &&
    a[a.length - 1 - i] === b[b.length - 1 - i]
  ) {
    i++;
  }
  return i;
}

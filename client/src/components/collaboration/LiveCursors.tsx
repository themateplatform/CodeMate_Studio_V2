import { useEffect, useRef } from "react";
import { useCollaboration } from "@/lib/collaboration-context";

interface LiveCursorProps {
  editorRef?: React.RefObject<HTMLElement>;
}

export function LiveCursors({ editorRef }: LiveCursorProps) {
  const { users } = useCollaboration();
  const cursorsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!editorRef?.current) return;

    const editor = editorRef.current;
    const cursorContainer = document.createElement("div");
    cursorContainer.className = "live-cursors-container";
    cursorContainer.style.position = "absolute";
    cursorContainer.style.top = "0";
    cursorContainer.style.left = "0";
    cursorContainer.style.width = "100%";
    cursorContainer.style.height = "100%";
    cursorContainer.style.pointerEvents = "none";
    cursorContainer.style.zIndex = "1000";
    
    editor.style.position = "relative";
    editor.appendChild(cursorContainer);

    // Update cursors
    users.forEach((user) => {
      if (!user.cursor) return;

      let cursorEl = cursorsRef.current.get(user.id);
      if (!cursorEl) {
        cursorEl = document.createElement("div");
        cursorEl.className = "live-cursor";
        cursorEl.style.position = "absolute";
        cursorEl.style.width = "2px";
        cursorEl.style.height = "20px";
        cursorEl.style.transition = "all 0.1s ease";
        cursorEl.style.pointerEvents = "none";
        
        const label = document.createElement("div");
        label.className = "cursor-label";
        label.textContent = user.name;
        label.style.position = "absolute";
        label.style.top = "-20px";
        label.style.left = "0";
        label.style.padding = "2px 6px";
        label.style.borderRadius = "4px";
        label.style.fontSize = "11px";
        label.style.fontWeight = "500";
        label.style.whiteSpace = "nowrap";
        label.style.color = "white";
        label.style.backgroundColor = user.color;
        
        cursorEl.appendChild(label);
        cursorContainer.appendChild(cursorEl);
        cursorsRef.current.set(user.id, cursorEl);
      }

      // Update cursor position and color
      cursorEl.style.backgroundColor = user.color;
      cursorEl.style.top = `${user.cursor.line * 20}px`;
      cursorEl.style.left = `${user.cursor.column * 8}px`;
      
      const label = cursorEl.querySelector(".cursor-label") as HTMLElement;
      if (label) {
        label.style.backgroundColor = user.color;
      }
    });

    // Remove cursors for users who left
    cursorsRef.current.forEach((cursorEl, userId) => {
      if (!users.find((u) => u.id === userId)) {
        cursorEl.remove();
        cursorsRef.current.delete(userId);
      }
    });

    return () => {
      cursorContainer.remove();
      cursorsRef.current.clear();
    };
  }, [users, editorRef]);

  return null; // Cursors are rendered directly in the DOM
}

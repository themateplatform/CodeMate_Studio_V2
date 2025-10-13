import { useEffect, useState, useRef } from "react";
import { useCollaboration } from "@/lib/collaboration-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import * as Y from "yjs";

interface CollaborativeFieldProps {
  fieldName: string;
  value: string;
  onChange: (value: string) => void;
  type?: "input" | "textarea";
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function CollaborativeField({
  fieldName,
  value,
  onChange,
  type = "input",
  placeholder,
  rows = 3,
  className,
}: CollaborativeFieldProps) {
  const { doc, users } = useCollaboration();
  const [localValue, setLocalValue] = useState(value);
  const [editingUsers, setEditingUsers] = useState<string[]>([]);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (!doc) return;

    const yMap = doc.getMap("fields");
    const fieldKey = fieldName;

    // Initialize field if it doesn't exist
    if (!yMap.has(fieldKey)) {
      yMap.set(fieldKey, value);
    }

    // Observe changes from other users
    const observer = () => {
      if (!isUpdatingRef.current) {
        const newValue = yMap.get(fieldKey) as string || "";
        setLocalValue(newValue);
        onChange(newValue);
      }
    };

    yMap.observe(observer);

    // Initial sync
    const initialValue = yMap.get(fieldKey) as string;
    if (initialValue !== undefined) {
      setLocalValue(initialValue);
    }

    return () => {
      yMap.unobserve(observer);
    };
  }, [doc, fieldName, value, onChange]);

  // Track users editing this field
  useEffect(() => {
    if (!doc) return;

    const awareness = doc.getMap("awareness");
    const updateEditingUsers = () => {
      const editing = users.filter((user) => {
        const userAwareness = awareness.get(user.id) as any;
        return userAwareness?.editingField === fieldName;
      });
      setEditingUsers(editing.map((u) => u.name));
    };

    awareness.observe(updateEditingUsers);
    updateEditingUsers();

    return () => {
      awareness.unobserve(updateEditingUsers);
    };
  }, [doc, users, fieldName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (doc) {
      isUpdatingRef.current = true;
      const yMap = doc.getMap("fields");
      yMap.set(fieldName, newValue);
      isUpdatingRef.current = false;
    }

    onChange(newValue);
  };

  const handleFocus = () => {
    if (doc) {
      const awareness = doc.getMap("awareness");
      awareness.set("local", { editingField: fieldName });
    }
  };

  const handleBlur = () => {
    if (doc) {
      const awareness = doc.getMap("awareness");
      awareness.delete("local");
    }
  };

  const commonProps = {
    value: localValue,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    placeholder,
    className: `${className} ${editingUsers.length > 0 ? "ring-2 ring-blue-300" : ""}`,
  };

  return (
    <div className="relative">
      {type === "textarea" ? (
        <Textarea {...commonProps} rows={rows} />
      ) : (
        <Input {...commonProps} />
      )}
      {editingUsers.length > 0 && (
        <div className="absolute -top-2 right-2 flex gap-1">
          {editingUsers.map((name, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs px-2 py-0.5"
            >
              {name} is editing
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

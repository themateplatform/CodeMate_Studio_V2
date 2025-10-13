import { useCollaboration } from "@/lib/collaboration-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Users, Wifi, WifiOff } from "lucide-react";

export function CollaborationPresence() {
  const { users, isConnected } = useCollaboration();

  if (users.length === 0) {
    return null;
  }

  return (
    <Card className="fixed top-4 right-4 z-50 p-3 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-600" />
          )}
          <span className="text-sm font-medium">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="h-4 w-px bg-gray-300" />

        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-600">{users.length}</span>
        </div>

        <div className="flex -space-x-2">
          {users.slice(0, 5).map((user) => (
            <Avatar
              key={user.id}
              className="w-8 h-8 border-2 border-white"
              style={{ backgroundColor: user.color }}
            >
              <AvatarFallback style={{ backgroundColor: user.color, color: "white" }}>
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          ))}
          {users.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
              <span className="text-xs text-gray-600">+{users.length - 5}</span>
            </div>
          )}
        </div>
      </div>

      {users.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-1">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: user.color }}
              />
              <span className="text-xs text-gray-700">{user.name}</span>
              {user.cursor && (
                <Badge variant="outline" className="text-xs">
                  Line {user.cursor.line}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

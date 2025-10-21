import { cn } from "@/lib/utils";
import { JesseAvatar } from "./JesseAvatar";

interface MessageBubbleProps {
  role: "assistant" | "user";
  content: string;
  isLoading?: boolean;
}

export function MessageBubble({ role, content, isLoading }: MessageBubbleProps) {
  if (isLoading) {
    return (
      <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
        <JesseAvatar state="thinking" size="md" />
        <div className="flex items-center gap-1 rounded-2xl bg-white/10 px-4 py-3">
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2",
        role === "user" && "justify-end"
      )}
    >
      {role === "assistant" && <JesseAvatar state="neutral" size="md" />}

      <div
        className={cn(
          "max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
          role === "assistant"
            ? "bg-gradient-to-br from-white/15 to-white/5 text-white border border-white/10"
            : "bg-white/20 text-white"
        )}
      >
        {content}
      </div>

      {role === "user" && <div className="w-6 h-6 rounded-full bg-white/30 flex-shrink-0" />}
    </div>
  );
}

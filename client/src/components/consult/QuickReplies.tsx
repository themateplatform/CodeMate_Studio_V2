import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickReply {
  label: string;
  value: string;
}

interface QuickRepliesProps {
  replies: QuickReply[];
  onSelect: (value: string) => void;
  isLoading?: boolean;
  customPrompt?: string;
}

export function QuickReplies({
  replies,
  onSelect,
  isLoading = false,
  customPrompt = "Type your own..."
}: QuickRepliesProps) {
  return (
    <div className={cn(
      "grid gap-2 animate-in fade-in slide-in-from-bottom-2",
      replies.length === 2 ? "grid-cols-2" :
      replies.length === 3 ? "grid-cols-3" :
      "grid-cols-1"
    )}>
      {replies.map((reply) => (
        <Button
          key={reply.value}
          onClick={() => onSelect(reply.value)}
          disabled={isLoading}
          className={cn(
            "rounded-2xl h-auto py-2 px-3 text-sm font-medium",
            "bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40",
            "transition-all duration-200 hover:scale-105"
          )}
        >
          {reply.label}
        </Button>
      ))}
      <Button
        onClick={() => {
          const value = prompt(customPrompt);
          if (value?.trim()) onSelect(value.trim());
        }}
        disabled={isLoading}
        className={cn(
          "rounded-2xl h-auto py-2 px-3 text-sm font-medium",
          "bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 hover:border-white/20",
          "transition-all duration-200 italic"
        )}
      >
        {customPrompt}
      </Button>
    </div>
  );
}

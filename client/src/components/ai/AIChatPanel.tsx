import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Project, ChatMessage } from "@/types";
import { cn } from "@/lib/utils";

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project | null;
  className?: string;
}

export function AIChatPanel({ isOpen, onClose, currentProject, className }: AIChatPanelProps) {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: chatMessages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/projects', currentProject?.id, 'chat'],
    enabled: !!currentProject?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, context }: { content: string; context?: string }) => {
      const response = await apiRequest(
        'POST', 
        `/api/projects/${currentProject?.id}/chat`,
        { content, context }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', currentProject?.id, 'chat'] 
      });
      setMessage("");
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!message.trim() || !currentProject) return;

    const context = `Project: ${currentProject.name}${currentProject.description ? ` - ${currentProject.description}` : ''}`;
    
    sendMessageMutation.mutate({
      content: message,
      context
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-heading font-semibold neon-text">AI Assistant</h2>
        </div>
        {onClose && (
          <Button
            size="sm"
            variant="ghost"
            className="hover-neon-purple"
            onClick={onClose}
            data-testid="button-close-ai-chat"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {!currentProject ? (
            <div className="text-center text-muted-foreground p-8">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Create or select a project to start chatting with AI</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex items-start space-x-2">
              <Avatar className="w-6 h-6 bg-primary">
                <AvatarFallback>
                  <Bot className="w-3 h-3 text-primary-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-secondary/30 rounded-lg p-3">
                <p className="text-sm">
                  I can help you generate components, explain code, integrate with APIs, and more. 
                  What would you like to build for <strong>{currentProject.name}</strong>?
                </p>
              </div>
            </div>
          ) : (
            chatMessages.map((msg: ChatMessage) => (
              <div key={msg.id} className="flex items-start space-x-2">
                <Avatar className={cn(
                  "w-6 h-6",
                  msg.role === 'assistant' ? "bg-primary" : "bg-secondary"
                )}>
                  <AvatarFallback>
                    {msg.role === 'assistant' ? (
                      <Bot className="w-3 h-3 text-primary-foreground" />
                    ) : (
                      <User className="w-3 h-3" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "flex-1 rounded-lg p-3",
                  msg.role === 'assistant' ? "bg-secondary/30" : "bg-primary/10"
                )}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex space-x-2">
          <Input
            placeholder="Describe what you want to build..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!currentProject || sendMessageMutation.isPending}
            className="flex-1"
            data-testid="input-ai-chat-message"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || !currentProject || sendMessageMutation.isPending}
            className="btn-primary hover-neon"
            data-testid="button-send-chat-message"
          >
            {sendMessageMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
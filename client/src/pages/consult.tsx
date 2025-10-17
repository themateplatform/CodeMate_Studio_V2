import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { JesseAvatar } from "@/components/consult/JesseAvatar";
import { MessageBubble } from "@/components/consult/MessageBubble";
import { QuickReplies } from "@/components/consult/QuickReplies";
import { SpecSidebar } from "@/components/consult/SpecSidebar";
import { Send, X, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  ConsultationPhase,
  ConsultationState,
  ChatMessage,
  initialSpec,
  phaseConfig,
  extractIntent,
  updateSpec,
  getAdaptiveFollowUp,
} from "@/lib/consultation-flow";

export default function ConsultPage() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const initialBrief = decodeURIComponent(params.get("brief") || "");

  // State
  const [phase, setPhase] = useState<ConsultationPhase>(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [spec, setSpec] = useState(() => ({ ...initialSpec, goal: initialBrief }));
  const [inputValue, setInputValue] = useState("");
  const [showSpec, setShowSpec] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // API mutation for getting Jesse responses
  const responsesMutation = useMutation({
    mutationFn: async (data: { message: string; phase: ConsultationPhase; spec: typeof spec }) =>
      apiRequest("POST", "/api/consult/jesse-response", data),
    onSuccess: (response: any) => {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: response.message || response.content,
        timestamp: Date.now(),
      };
      setMessages((m) => [...m, msg]);
    },
  });

  // Initialize with Jesse's first message
  useEffect(() => {
    if (messages.length === 0) {
      // Always start with generic greeting
      const firstMessage: ChatMessage = {
        id: "msg-init",
        role: "assistant",
        content: phaseConfig[1].prompt,
        timestamp: Date.now(),
      };
      setMessages([firstMessage]);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, responsesMutation.isPending]);

  // Handle quick reply selection
  const handleQuickReply = useCallback(
    (value: string) => {
      if (responsesMutation.isPending) return;
      handleSendMessage(value);
    },
    [responsesMutation.isPending]
  );

  // Handle sending message
  const handleSendMessage = useCallback(
    (messageText?: string) => {
      const content = messageText || inputValue.trim();
      if (!content || responsesMutation.isPending) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content,
        timestamp: Date.now(),
      };
      setMessages((m) => [...m, userMsg]);
      setInputValue("");

      // Extract intent and update spec
      const intent = extractIntent(content, phase);
      const updatedSpec = updateSpec(spec, phase, content, intent);
      setSpec(updatedSpec);

      // Get Jesse's response
      responsesMutation.mutate(
        { message: content, phase, spec: updatedSpec },
        {
          onSuccess: (response: any) => {
            // Check if we should advance phase
            if (response.nextPhase && response.nextPhase > phase) {
              setPhase(response.nextPhase);
              if (response.nextPhase === 6) {
                setIsComplete(true);
              }
            }

            // Focus input for next message
            setTimeout(() => inputRef.current?.focus(), 100);
          },
        }
      );
    },
    [inputValue, phase, spec, responsesMutation]
  );

  // Get current phase config
  const config = phaseConfig[phase];

  // Get quick replies for current phase
  const quickReplies = config.quickReplies;

  // Show ready to build
  if (isComplete) {
    return (
      <div className="h-screen bg-[color:var(--deep-navy)] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[color:var(--core-brand-primary)] to-[color:var(--core-brand-secondary)] flex items-center justify-center animate-bounce">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-10 h-10 text-white"
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Spec Ready! 🎉</h1>
            <p className="text-lg text-white/70 max-w-md mx-auto">
              Your design specification is complete. Let's move to the builder where we'll create your concept and start building.
            </p>
          </div>
          <Button
            onClick={() => {
              const qs = new URLSearchParams();
              qs.set("mode", "guided");
              qs.set("spec", JSON.stringify(spec));
              setLocation(`/app-builder?${qs.toString()}`);
            }}
            className="rounded-2xl px-8 py-6 text-lg font-semibold bg-gradient-to-r from-[color:var(--core-brand-primary)] to-[color:var(--core-brand-secondary)]"
          >
            Start Building <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[color:var(--deep-navy)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <JesseAvatar state="listening" size="md" />
          <div>
            <h1 className="font-semibold text-white">Design Consultation</h1>
            <p className="text-xs text-white/60">
              Phase {phase}/6 · {config.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowSpec(!showSpec)}
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            {showSpec ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Hide Spec
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Show Spec
              </>
            )}
          </Button>
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6 max-w-2xl">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                />
              ))}
              {responsesMutation.isPending && (
                <MessageBubble role="assistant" content="" isLoading={true} />
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Quick replies */}
          {!responsesMutation.isPending && messages.length > 0 && (
            <div className="px-6 py-4 space-y-3">
              <QuickReplies
                replies={quickReplies}
                onSelect={handleQuickReply}
                isLoading={responsesMutation.isPending}
              />
            </div>
          )}

          {/* Input */}
          <div className="px-6 py-4 border-t border-white/10">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Describe goals, users, vibe, integrations…"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={responsesMutation.isPending}
                className="flex-1 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/15 focus:border-white/40"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || responsesMutation.isPending}
                className="rounded-2xl bg-gradient-to-r from-[color:var(--core-brand-primary)] to-[color:var(--core-brand-secondary)] hover:shadow-lg"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-white/50 mt-2">
              Press Enter to send • Or pick a quick reply above
            </p>
          </div>
        </div>

        {/* Spec sidebar */}
        {showSpec && (
          <SpecSidebar
            spec={spec}
            phase={phase}
            onClose={() => setShowSpec(false)}
            className="w-80 border-l border-white/10"
          />
        )}
      </div>
    </div>
  );
}

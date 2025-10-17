import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Bot, Send, User, Sparkles, ListChecks, Palette, Workflow } from "lucide-react";

// Lightweight local spec model for the consultation flow
interface PlanSummary {
  goal: string;
  sections: string[];
  actions: string[];
  niceToHaves: string[];
  combinedBrief: string;
}

function createPlanSummary(text: string): PlanSummary {
  const trimmed = (text || "").trim();
  const sentences = trimmed
    .split(/[\n\.]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const goal = sentences[0] || "Clarify your idea and shape a launch-ready plan.";
  const inferred = sentences.slice(1, 6).map((s) => s.replace(/^[\-•\d\s]+/, "")).filter(Boolean);
  const fallback = [
    "Hero section with clear value prop",
    "Problem/solution overview",
    "Key features grid",
    "Pricing or CTA",
    "Contact or signup",
  ];
  const actions = [
    "Collect brand assets",
    "Define primary user journey",
    "Choose tech stack & integrations",
    "Stage a shareable preview",
  ];
  return {
    goal,
    sections: inferred.length ? inferred : fallback,
    actions,
    niceToHaves: ["Analytics", "CMS edits", "Responsive polish"],
    combinedBrief: sentences.join(". ") || goal,
  };
}

interface ChatItem { role: "assistant" | "user"; content: string }

export default function ConsultPage() {
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const initial = decodeURIComponent(params.get("brief") || "");

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [spec, setSpec] = useState(() => createPlanSummary(initial));
  const endRef = useRef<HTMLDivElement>(null);

  // seed conversation
  useEffect(() => {
    const plan = createPlanSummary(initial);
    setSpec(plan);
    setMessages([
      {
        role: "assistant",
        content:
          `Hi! I'm Jesse. I read your idea and drafted a quick starting spec.\n\n` +
          `Goal: ${plan.goal}\n` +
          `Pages/Sections: \n- ${plan.sections.join("\n- ")}\n` +
          `Key actions: \n- ${plan.actions.join("\n- ")}\n\n` +
          `Tell me about your audience, success metrics, and any integrations you need. I’ll adapt the plan and style.`,
      },
    ]);
  }, [initial]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const askFollowups = (user: string) => {
    const updates: ChatItem[] = [
      { role: "user", content: user },
      {
        role: "assistant",
        content:
          "Great. A few quick things so this feels custom: \n" +
          "1) Who is this for? \n2) What’s the day‑one success metric? \n3) Any must‑have integrations (Auth, Stripe, CMS)? \n4) Preferred vibe (Minimal, Bold, Elegant, Playful)?",
      },
    ];
    setMessages((m) => [...m, ...updates]);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    // Update spec heuristically (client-only)
    if (/stripe|payment/i.test(input)) {
      setSpec((s) => ({ ...s, actions: Array.from(new Set(["Set up payments", ...s.actions])) }));
    }
    if (/blog|posts|cms/i.test(input)) {
      setSpec((s) => ({ ...s, sections: Array.from(new Set(["Blog", ...s.sections])) }));
    }
    askFollowups(input.trim());
    setInput("");
  };

  const startBuild = () => {
    const qs = new URLSearchParams();
    qs.set("mode", "guided");
    qs.set("prompt", spec.combinedBrief);
    setLocation(`/app-builder?${qs.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[color:var(--deep-navy)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[color:var(--core-brand-primary)] to-[color:var(--core-brand-secondary)] flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-semibold">Consultation</h1>
            <Badge className="ml-2 bg-white/10">Live</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="rounded-2xl bg-white/10 hover:bg-white/20" onClick={() => setLocation("/")}>Exit</Button>
            <Button className="rounded-2xl bg-gradient-to-r from-[color:var(--core-brand-primary)] to-[color:var(--core-brand-secondary)]" onClick={startBuild}>Start Building</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Chat */}
          <Card className="rounded-2xl border border-white/10 bg-white/5">
            <div className="flex h-[70vh] flex-col">
              <div className="flex items-center gap-2 border-b border-white/10 p-4">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm opacity-80">Jesse · Design Assistant</p>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((m, i) => (
                    <div key={i} className={cn("flex items-start gap-2", m.role === "user" && "justify-end")}>                      
                      {m.role === "assistant" && (
                        <Avatar className="h-6 w-6 bg-white/20">
                          <AvatarFallback><Bot className="h-3 w-3" /></AvatarFallback>
                        </Avatar>
                      )}
                      <div className={cn("max-w-[32rem] rounded-2xl p-3 text-sm", m.role === "assistant" ? "bg-white/10" : "bg-white/20 ml-auto")}>                        
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                      {m.role === "user" && (
                        <Avatar className="h-6 w-6 bg-white/20">
                          <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
              </ScrollArea>
              <div className="border-t border-white/10 p-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Describe goals, users, vibe, integrations…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    className="flex-1 rounded-2xl bg-white/10 text-white placeholder:text-white/60"
                  />
                  <Button onClick={handleSend} className="rounded-2xl bg-white/20 hover:bg-white/30">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Spec Preview */}
          <div className="space-y-4">
            <Card className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                <h2 className="text-lg font-semibold">Spec Preview</h2>
              </div>
              <div className="space-y-4 text-sm text-white/80">
                <div>
                  <p className="text-white/60 text-xs">Goal</p>
                  <p className="mt-1 text-white">{spec.goal}</p>
                </div>
                <div>
                  <p className="text-white/60 text-xs">Pages / Sections</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {spec.sections.map((s, i) => (<li key={i}>{s}</li>))}
                  </ul>
                </div>
                <div>
                  <p className="text-white/60 text-xs">Key Actions</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {spec.actions.map((s, i) => (<li key={i}>{s}</li>))}
                  </ul>
                </div>
                <div>
                  <p className="text-white/60 text-xs">Nice to Haves</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {spec.niceToHaves.map((s, i) => (<li key={i}>{s}</li>))}
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <h3 className="font-semibold">Design Direction</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {(["Minimal", "Bold", "Elegant", "Playful"]).map((style) => (
                  <button key={style} onClick={() => setMessages((m) => [...m, { role: "assistant", content: `Locked in ${style} direction. I’ll tune components and motion to match.` }])} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10">
                    {style}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Workflow className="h-4 w-4" />
                <h3 className="font-semibold">Next</h3>
              </div>
              <p className="text-sm text-white/80">When you’re happy, continue to the builder. Your spec carries over as living context.</p>
              <div className="mt-3"><Button onClick={startBuild} className="w-full rounded-2xl bg-gradient-to-r from-[color:var(--core-brand-primary)] to-[color:var(--core-brand-secondary)]">Start Building</Button></div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

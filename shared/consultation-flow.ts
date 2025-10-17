// Shared types for consultation flow between client and server

export type ConsultationPhase = 1 | 2 | 3 | 4 | 5 | 6;

export interface LiveSpec {
  goal: string;
  audience: string[];
  successMetric: string;
  differentiator: string;
  pages: string[];
  integrations: string[];
  timeline: string;
  techLevel: "beginner" | "intermediate" | "expert" | "team";
  designVibe: "minimal" | "bold" | "elegant" | "playful" | "custom";
  scope: "mvp" | "full" | "phased";
  notes: string[];
}

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: number;
}

export interface ConsultationState {
  phase: ConsultationPhase;
  messages: ChatMessage[];
  spec: LiveSpec;
  responses: Record<string, string>;
}

export const initialSpec: LiveSpec = {
  goal: "",
  audience: [],
  successMetric: "",
  differentiator: "",
  pages: [],
  integrations: [],
  timeline: "",
  techLevel: "intermediate",
  designVibe: "elegant",
  scope: "mvp",
  notes: [],
};

export interface QuickReply {
  label: string;
  value: string;
}

export interface PhaseConfig {
  title: string;
  prompt: string;
  quickReplies: QuickReply[];
  customPrompt: string;
  followUp: string;
  nextPhase: ConsultationPhase;
}

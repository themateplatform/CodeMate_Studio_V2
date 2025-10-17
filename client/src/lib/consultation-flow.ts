// Consultation flow engine: manages phases, questions, and adaptive routing
import type {
  ConsultationPhase,
  ConsultationState,
  ChatMessage,
  LiveSpec,
  PhaseConfig,
  QuickReply,
} from "@shared/consultation-flow";
export { initialSpec } from "@shared/consultation-flow";
export type { ConsultationPhase, ConsultationState, ChatMessage, LiveSpec, PhaseConfig, QuickReply };

// Phase configs: prompts, quick replies, and routing logic
export const phaseConfig = {
  1: {
    title: "Understanding Your Idea",
    prompt: `Hi! I'm Jesse, your design partner. Let's turn your idea into something launch-ready. I'll ask questions to really understand what you need—no forms, just conversation.\n\nFirst up: what problem does this solve for your users?`,
    quickReplies: [
      { label: "Makes work easier", value: "makes_work_easier" },
      { label: "Saves time/money", value: "saves_time_money" },
      { label: "Builds community", value: "builds_community" },
      { label: "Enables new capability", value: "new_capability" },
    ],
    customPrompt: "Describe the problem...",
    followUp: "Got it. And who are these users? Paint me a picture.",
    nextPhase: 2 as ConsultationPhase,
  },
  2: {
    title: "Understanding Your Audience",
    prompt: "Who is this for? (e.g., small business owners, freelancers, enterprise teams, students)",
    quickReplies: [
      { label: "Small business owners", value: "small_biz" },
      { label: "Freelancers", value: "freelancers" },
      { label: "Enterprise teams", value: "enterprise" },
      { label: "Consumers/general", value: "consumers" },
    ],
    customPrompt: "Describe your audience...",
    followUp: "Perfect. So if this works, what changes for them?",
    nextPhase: 3 as ConsultationPhase,
  },
  3: {
    title: "Goals & Success",
    prompt: "When this launches, what's the ONE action you need users to take?",
    quickReplies: [
      { label: "Sign up", value: "signup" },
      { label: "Make a purchase", value: "purchase" },
      { label: "Book a call", value: "booking" },
      { label: "Download", value: "download" },
    ],
    customPrompt: "Define the primary action...",
    followUp: "Great. In 90 days, what does success look like? (Revenue? Users? Credibility?)",
    nextPhase: 4 as ConsultationPhase,
  },
  4: {
    title: "Technical Reality Check",
    prompt: "What's your comfort level with tech?",
    quickReplies: [
      { label: "I write code", value: "expert" },
      { label: "I can muddle through", value: "intermediate" },
      { label: "Total beginner", value: "beginner" },
      { label: "I have a team", value: "team" },
    ],
    customPrompt: "Describe your setup...",
    followUp: "Got it. Any must-have integrations? (Stripe, Auth, CMS, etc.)",
    nextPhase: 5 as ConsultationPhase,
  },
  5: {
    title: "Design & Vibe",
    prompt: "If you described your brand in 3 words, what would they be?",
    quickReplies: [
      { label: "Minimal & Clean", value: "minimal" },
      { label: "Bold & Vibrant", value: "bold" },
      { label: "Elegant & Refined", value: "elegant" },
      { label: "Playful & Friendly", value: "playful" },
    ],
    customPrompt: "Describe your vibe...",
    followUp: "Love it. Do you have any reference sites you love?",
    nextPhase: 6 as ConsultationPhase,
  },
  6: {
    title: "Review & Handoff",
    prompt: "Perfect! Here's what I've captured. Let me know if anything needs adjustment.",
    quickReplies: [
      { label: "Looks great!", value: "approve" },
      { label: "Let me edit", value: "edit" },
    ],
    customPrompt: "",
    followUp: "Awesome! Ready to start building? Your spec carries over as living context.",
    nextPhase: 1 as ConsultationPhase,
  },
} as const;

// Extract intent from user message
export function extractIntent(message: string, phase: ConsultationPhase): string {
  const lower = message.toLowerCase();

  // Simple intent extraction - in production, use LLM
  if (phase === 1) {
    if (/stripe|payment|commerce|shop|sell/.test(lower)) return "ecommerce";
    if (/blog|content|media|publication/.test(lower)) return "content";
    if (/booking|appointment|schedule|calendar/.test(lower)) return "booking";
    if (/community|social|network|connect/.test(lower)) return "community";
  }

  if (phase === 4) {
    if (/stripe|payment|paypal/.test(lower)) return "integrations_payment";
    if (/auth|login|auth0|supabase/.test(lower)) return "integrations_auth";
    if (/cms|contentful|strapi|sanity/.test(lower)) return "integrations_cms";
  }

  return "custom";
}

// Update spec based on response
export function updateSpec(spec: LiveSpec, phase: ConsultationPhase, response: string, intent: string): LiveSpec {
  const updated = { ...spec };

  switch (phase) {
    case 1:
      updated.goal = response;
      updated.notes.push(`Goal intent: ${intent}`);
      break;
    case 2:
      updated.audience = [response, ...updated.audience];
      break;
    case 3:
      updated.successMetric = response;
      if (intent === "purchase") updated.integrations.push("Stripe");
      if (intent === "booking") updated.pages.push("Calendar/Booking");
      break;
    case 4:
      const techMap: Record<string, LiveSpec["techLevel"]> = {
        expert: "expert",
        intermediate: "intermediate",
        beginner: "beginner",
        team: "team",
      };
      updated.techLevel = techMap[intent] || "intermediate";
      break;
    case 5:
      const vibeMap: Record<string, LiveSpec["designVibe"]> = {
        minimal: "minimal",
        bold: "bold",
        elegant: "elegant",
        playful: "playful",
      };
      updated.designVibe = vibeMap[intent] || "custom";
      break;
    case 6:
      if (intent === "approve") updated.scope = "mvp";
      break;
  }

  return updated;
}

// Generate contextual follow-up based on responses
export function getAdaptiveFollowUp(phase: ConsultationPhase, spec: LiveSpec): string {
  const config = phaseConfig[phase];

  if (phase === 3) {
    if (spec.successMetric.toLowerCase().includes("revenue")) {
      return "Great—what's realistic? $1k MRR? $100k? Help me set expectations.";
    }
    if (spec.successMetric.toLowerCase().includes("users")) {
      return "Got it. How many users is success? Hundreds? Thousands?";
    }
  }

  if (phase === 4) {
    if (spec.techLevel === "beginner") {
      return "No worries! We'll keep it simple. Any existing code, or starting fresh?";
    }
    if (spec.techLevel === "expert") {
      return "Nice. Any specific tech stack preferences? (React, Next, Svelte, etc.)";
    }
  }

  return config.followUp;
}

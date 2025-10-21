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

  // Phase 2: After audience, ask about their specific needs
  if (phase === 2) {
    if (spec.audience.length > 0) {
      const audience = spec.audience[0].toLowerCase();
      if (audience.includes("freelancer") || audience.includes("solopreneur")) {
        return `Perfect for freelancers. What's the biggest pain point they face that your idea solves?`;
      }
      if (audience.includes("small business") || audience.includes("startup")) {
        return `Small business owners get it. What workflow are you trying to simplify or improve for them?`;
      }
      if (audience.includes("enterprise")) {
        return `Enterprise audiences are tough to please. What's the main outcome they need from this?`;
      }
    }
  }

  // Phase 3: After success metric, probe deeper
  if (phase === 3) {
    if (spec.successMetric) {
      const metric = spec.successMetric.toLowerCase();
      if (metric.includes("revenue")) {
        return `Revenue-driven—that's clear. In your first 90 days, what's a realistic target?`;
      }
      if (metric.includes("user") || metric.includes("signup")) {
        return `User acquisition is your north star. How many users would feel like a win in the first quarter?`;
      }
      if (metric.includes("book") || metric.includes("appointment") || metric.includes("purchase")) {
        return `So conversions matter. What conversion rate would make this a success for you?`;
      }
      if (metric.includes("credibility") || metric.includes("brand") || metric.includes("awareness")) {
        return `Building credibility is the goal. How will you measure that? Reviews, testimonials, press mentions?`;
      }
    }
  }

  // Phase 4: Based on tech level and goal, ask specific questions
  if (phase === 4) {
    if (spec.techLevel === "beginner") {
      if (spec.goal.toLowerCase().includes("payment") || spec.goal.toLowerCase().includes("stripe")) {
        return `No worries! We'll use Stripe for payments—it's straightforward. Do you have a Stripe account, or should we set one up?`;
      }
      return `Perfect. We'll keep the tech stack simple. Any platforms you already use that we should integrate with?`;
    }
    if (spec.techLevel === "expert" || spec.techLevel === "team") {
      if (spec.goal.toLowerCase().includes("real-time") || spec.goal.toLowerCase().includes("collaboration")) {
        return `Nice. For real-time features like this, are you leaning toward WebSocket, Server-Sent Events, or a service like Firebase?`;
      }
      return `Great. Any specific frameworks or tech you want to use? (React, Next.js, etc.)`;
    }
  }

  // Phase 5: Design vibe follow-up based on their choice
  if (phase === 5) {
    if (spec.designVibe) {
      const vibe = spec.designVibe.toLowerCase();
      if (vibe.includes("minimal")) {
        return `Minimal and clean—love that. Whitespace-heavy, or do you want subtle color accents?`;
      }
      if (vibe.includes("bold")) {
        return `Bold and vibrant! Are you thinking neon/gradient heavy, or more muted bold tones?`;
      }
      if (vibe.includes("elegant")) {
        return `Elegant and refined—classy. Serif fonts, or keeping it modern sans-serif?`;
      }
      if (vibe.includes("playful")) {
        return `Playful and friendly! Do you have a color palette in mind, or should we explore what works?`;
      }
    }
  }

  // Fallback to standard follow-up for the phase
  return config.followUp;
}

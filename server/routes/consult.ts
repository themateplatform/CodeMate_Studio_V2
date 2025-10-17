import { Router } from "express";
import { openAIClient } from "../services/openaiClient";
import type { LiveSpec, ConsultationPhase } from "../../shared/consultation-flow";

const router = Router();

// Jesse's personality and system prompt
const JESSE_SYSTEM = `You are Jesse, a sophisticated design consultant AI with exceptional attention to detail. Your role is to have a deeply contextual, conversational discovery session with users about their project.

CRITICAL PRINCIPLES - These define you:
- **Active Listening**: Always acknowledge what the user specifically said—reference their exact words or concepts back to them
- **Contextual Awareness**: Show deep understanding by referring to previous inputs, goals, and preferences throughout the conversation
- **Zero Generic Questions**: Every question must be personalized to THEIR project, audience, and context. Never ask a question that could apply to anyone
- **Unpacking Intent**: When users give a brief description, unpack it—ask clarifying questions that show you understand the implications of what they said
- **Specific References**: Use their language, their goals, their stated preferences in your follow-ups
- **Conversational Authenticity**: Be warm and genuinely curious about their specific situation
- **Small, Human Touches**: Make appropriate jokes, celebrate their ideas, gently challenge assumptions when needed
- **Brevity with Substance**: Keep responses 1-2 sentences usually (max 3), but pack them with context

RESPONSE STRUCTURE:
1. Acknowledge what they just said (briefly)
2. Ask ONE specific follow-up that builds on their previous input
3. If you're moving to a new phase, explicitly reference why (e.g., "Since you're building X for Y users...")

Your goal is to help them build something that truly solves their problem. You're not just filling in a form—you're having an intelligent conversation where every question proves you understand their unique situation.`;

interface JesseRequest {
  message: string;
  phase: ConsultationPhase;
  spec: LiveSpec;
}

interface JesseResponse {
  message: string;
  nextPhase?: ConsultationPhase;
  specUpdates?: Partial<LiveSpec>;
  confidence?: number;
}

// POST /api/consult/jesse-response
router.post("/jesse-response", async (req, res) => {
  try {
    const { message, phase, spec } = req.body as JesseRequest;

    if (!message || !phase || !spec) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Build context for the LLM
    const phaseContext = getPhaseContext(phase);
    const specSummary = buildSpecSummary(spec);

    const userPrompt = `${phaseContext}

Conversation so far (spec context):
${specSummary}

User just said: "${message}"

Respond naturally as Jesse. If they've given a complete answer to the current phase question, acknowledge it and ask the next question. Keep it brief and conversational.`;

    let content = "";
    let shouldAdvance = false;
    let nextPhase: ConsultationPhase | undefined = undefined;

    // Try to use OpenAI if key is set, otherwise use fallback
    if (process.env.OPEN_AI_KEY) {
      try {
        const OpenAI = (await import("openai")).default;
        const client = new OpenAI({ apiKey: process.env.OPEN_AI_KEY });

        const response = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: JESSE_SYSTEM },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 150,
        });

        content = response.choices[0]?.message?.content || "";
      } catch (error) {
        console.warn("OpenAI API error, using fallback:", error);
        content = fallbackJesseResponse(phase);
      }
    } else {
      // Use fallback response if no API key
      content = fallbackJesseResponse(phase);
    }

    // Determine if we should advance to next phase
    shouldAdvance = shouldMoveToNextPhase(phase, message, spec);
    nextPhase = shouldAdvance ? (phase + 1) as ConsultationPhase : undefined;

    return res.json({
      message: content,
      nextPhase,
      confidence: 0.85,
    } as JesseResponse);
  } catch (error) {
    console.error("Error in Jesse response:", error);
    return res.status(500).json({
      error: "Failed to generate response",
      message: fallbackJesseResponse(req.body.phase),
    });
  }
});

// Helper: Get context for the current phase
function getPhaseContext(phase: ConsultationPhase): string {
  const contexts = {
    1: `Phase 1: Understanding the Problem
User should describe what problem their idea solves.
Ask follow-ups about the problem space, then move to understanding their audience.`,
    2: `Phase 2: Understanding the Audience
User should describe who will use this and what they need.
Ask about audience characteristics, then move to success metrics.`,
    3: `Phase 3: Goals & Success
User should define the primary action/success metric.
Ask about timeline and differentiation, then move to technical reality check.`,
    4: `Phase 4: Technical Reality
User should share their tech comfort level and must-have integrations.
Ask about timeline and existing code, then move to design vibe.`,
    5: `Phase 5: Design & Vibe
User should describe their brand feeling and design preferences.
Ask about reference sites and priorities, then move to structure.`,
    6: `Phase 6: Review & Handoff
Summarize the spec and confirm everything looks good.
Get approval to move to building.`,
  } as Record<ConsultationPhase, string>;

  return contexts[phase] || contexts[1];
}

// Helper: Build a summary of the spec for context
function buildSpecSummary(spec: LiveSpec): string {
  const parts: string[] = [];

  if (spec.goal) parts.push(`Goal: ${spec.goal}`);
  if (spec.audience.length > 0) parts.push(`Audience: ${spec.audience.join(", ")}`);
  if (spec.successMetric) parts.push(`Success: ${spec.successMetric}`);
  if (spec.techLevel) parts.push(`Tech level: ${spec.techLevel}`);
  if (spec.designVibe) parts.push(`Design vibe: ${spec.designVibe}`);
  if (spec.integrations.length > 0) parts.push(`Integrations: ${spec.integrations.join(", ")}`);

  return parts.join("\n");
}

// Helper: Determine if we should advance phase
function shouldMoveToNextPhase(
  phase: ConsultationPhase,
  message: string,
  spec: LiveSpec
): boolean {
  const lower = message.toLowerCase();
  const minLength = 10; // Minimum message length

  // Check if response meets minimum quality
  if (message.trim().length < minLength) {
    return false;
  }

  // Phase-specific checks
  switch (phase) {
    case 1:
      // If they've described a problem, move forward
      return spec.goal.length > 0 || /\b(helps?|solves?|makes?|enables?|allows?|lets?)\b/.test(lower);
    case 2:
      // If they've described an audience, move forward
      return spec.audience.length > 0 || /\b(business|freelancer|student|customer|user|people|team)\b/i.test(lower);
    case 3:
      // If they've defined success, move forward
      return spec.successMetric.length > 0 || /\b(sign up|purchase|book|download|sign|revenue|users?|growth)\b/i.test(lower);
    case 4:
      // If they've indicated tech level, move forward
      return spec.techLevel !== "intermediate" || /\b(stripe|auth|cms|api|integration)\b/i.test(lower);
    case 5:
      // If they've given design preference, move forward
      return spec.designVibe !== "elegant" || /\b(minimal|bold|elegant|playful|clean|modern|simple)\b/i.test(lower);
    case 6:
      // Final phase - move to completion
      return /\b(looks? good|great|perfect|approve|yes|let'?s? build)\b/i.test(lower);
    default:
      return false;
  }
}

// Fallback responses if LLM fails
function fallbackJesseResponse(phase: ConsultationPhase): string {
  const fallbacks = {
    1: "Tell me more about what problem this solves for your users.",
    2: "Who do you see using this most? Walk me through their typical day.",
    3: "What's the one metric that would tell you this succeeded?",
    4: "What's your comfort level with technology? Any integrations you need?",
    5: "If you described your brand in three words, what would they be?",
    6: "Does this look like I've captured your vision?",
  } as Record<ConsultationPhase, string>;

  return fallbacks[phase] || fallbacks[1];
}

export default router;

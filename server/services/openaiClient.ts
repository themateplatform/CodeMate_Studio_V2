import OpenAI from 'openai';
import { env } from '../config/env';

const client = new OpenAI({ apiKey: env.openAIApiKey });

async function invokeJSONResponse(systemPrompt: string, userPrompt: string) {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content ?? '';
  if (!content) {
    throw new Error('OpenAI returned empty response');
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error('Failed to parse OpenAI JSON response');
  }
}

export const openAIClient = {
  async analyzeRequirements(input: string, context: string[]) {
    const systemPrompt = `You are a senior product strategist translating app ideas into actionable requirements, structured follow-up questions, and completion status.`;
    const payload = await invokeJSONResponse(
      systemPrompt,
      JSON.stringify({ input, context })
    );
    return payload;
  },

  async suggestEnhancements(requirements: unknown) {
    const systemPrompt = `You are an AI product coach recommending enhancements and competitive insights. Return enhancements and competitors arrays.`;
    return invokeJSONResponse(systemPrompt, JSON.stringify({ requirements }));
  },

  async discoverResources(requirements: unknown, enhancements: unknown) {
    const systemPrompt = `You are an AI integrator recommending AI agents and MCP servers based on product requirements.`;
    return invokeJSONResponse(systemPrompt, JSON.stringify({ requirements, enhancements }));
  },

  async createDesignBrief(payload: unknown) {
    const systemPrompt = `You are a design lead producing a detailed design brief. Include title, description, targetAudience, keyFeatures, technicalStack, timeline, milestones.`;
    return invokeJSONResponse(systemPrompt, JSON.stringify(payload));
  },

  async planImplementation(payload: unknown) {
    const systemPrompt = `You are an engineering lead outlining next steps for implementation. Return an object with summary, nextActions, and confidence.`;
    return invokeJSONResponse(systemPrompt, JSON.stringify(payload));
  },
};

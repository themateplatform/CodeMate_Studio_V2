import type { Request, Response, Express, RequestHandler } from "express";
import OpenAI from "openai";
import "../types/session";

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface AnalyzeSpecRequest {
  title?: string;
  purpose?: string;
  audience?: string;
  problemStatement?: string;
  solutionOverview?: string;
}

interface SuggestionRequest {
  context: "purpose" | "audience" | "problem" | "solution" | "acceptance" | "metrics";
  currentContent?: string;
  relatedContent?: {
    title?: string;
    purpose?: string;
    audience?: string;
  };
}

export function registerAISuggestionsRoutes(app: Express, csrfProtection: RequestHandler): void {
  /**
   * POST /api/ai/analyze-spec - Analyze spec and provide quality feedback
   */
  app.post("/api/ai/analyze-spec", csrfProtection, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      const body = req.body as AnalyzeSpecRequest;

      const prompt = `You are an expert product specification analyst. Analyze this specification draft and provide actionable feedback.

Specification:
${body.title ? `Title: ${body.title}` : ''}
${body.purpose ? `Purpose: ${body.purpose}` : ''}
${body.audience ? `Audience: ${body.audience}` : ''}
${body.problemStatement ? `Problem: ${body.problemStatement}` : ''}
${body.solutionOverview ? `Solution: ${body.solutionOverview}` : ''}

Provide feedback in the following JSON format:
{
  "overallScore": <number 0-100>,
  "strengths": [<array of specific strengths>],
  "improvements": [
    {
      "area": <string: field name>,
      "issue": <string: what's missing or unclear>,
      "suggestion": <string: specific improvement>,
      "priority": <"high" | "medium" | "low">
    }
  ],
  "missingElements": [<array of important missing sections>],
  "clarityScore": <number 0-100>,
  "completenessScore": <number 0-100>
}`;

      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that analyzes product specifications and provides constructive feedback. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content || "{}");

      res.json({
        analysis,
        tokensUsed: completion.usage?.total_tokens || 0,
      });
    } catch (error: any) {
      console.error("AI analysis error:", error);
      
      if (error.code === 'insufficient_quota') {
        return res.status(429).json({ 
          message: "AI quota exceeded. Please try again later.",
          error: "quota_exceeded"
        });
      }
      
      res.status(500).json({ message: "Failed to analyze specification" });
    }
  });

  /**
   * POST /api/ai/suggest-content - Get AI suggestions for specific field
   */
  app.post("/api/ai/suggest-content", csrfProtection, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      const body = req.body as SuggestionRequest;

      let prompt = "";
      
      switch (body.context) {
        case "purpose":
          prompt = `Generate 3 clear, concise purpose statements for a software product.
${body.relatedContent?.title ? `Product: ${body.relatedContent.title}` : ''}
${body.relatedContent?.audience ? `Target Audience: ${body.relatedContent.audience}` : ''}

Each purpose should:
- Start with an action verb
- Be 1-2 sentences
- Focus on user value
- Be specific and measurable

Format: JSON array of strings`;
          break;

        case "audience":
          prompt = `Identify 3 specific target audience segments for this product.
${body.relatedContent?.title ? `Product: ${body.relatedContent.title}` : ''}
${body.relatedContent?.purpose ? `Purpose: ${body.relatedContent.purpose}` : ''}

Each audience segment should:
- Be specific (not just "users")
- Include relevant characteristics
- Explain why they'd use this product

Format: JSON array of strings`;
          break;

        case "problem":
          prompt = `Describe 3 specific problems this product solves.
${body.relatedContent?.title ? `Product: ${body.relatedContent.title}` : ''}
${body.relatedContent?.purpose ? `Purpose: ${body.relatedContent.purpose}` : ''}
${body.relatedContent?.audience ? `Audience: ${body.relatedContent.audience}` : ''}

Each problem should:
- Be concrete and relatable
- Explain current pain points
- Show impact on users

Format: JSON array of strings`;
          break;

        case "solution":
          prompt = `Describe 3 solution approaches for this product.
${body.relatedContent?.title ? `Product: ${body.relatedContent.title}` : ''}
${body.relatedContent?.purpose ? `Purpose: ${body.relatedContent.purpose}` : ''}

Each solution should:
- Explain how it addresses the problem
- Highlight key features
- Be clear and actionable

Format: JSON array of strings`;
          break;

        case "acceptance":
          prompt = `Generate 5 acceptance criteria for this specification.
${body.relatedContent?.title ? `Product: ${body.relatedContent.title}` : ''}
${body.relatedContent?.purpose ? `Purpose: ${body.relatedContent.purpose}` : ''}

Each criterion should:
- Be testable and measurable
- Use "Given/When/Then" or "The system should" format
- Be specific and unambiguous

Format: JSON array of strings`;
          break;

        case "metrics":
          prompt = `Suggest 5 success metrics for this product.
${body.relatedContent?.title ? `Product: ${body.relatedContent.title}` : ''}
${body.relatedContent?.purpose ? `Purpose: ${body.relatedContent.purpose}` : ''}

Each metric should:
- Be measurable with a number
- Include the metric name and how to calculate it
- Be achievable and relevant

Format: JSON array of strings`;
          break;
      }

      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates high-quality product specification content. Always respond with a JSON array of strings."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 800,
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0].message.content || "{}";
      const parsed = JSON.parse(responseContent);
      
      // Extract suggestions array from response (handle different response formats)
      const suggestions = parsed.suggestions || parsed.items || parsed.content || Object.values(parsed)[0] || [];

      res.json({
        suggestions: Array.isArray(suggestions) ? suggestions : [suggestions],
        tokensUsed: completion.usage?.total_tokens || 0,
      });
    } catch (error: any) {
      console.error("AI suggestion error:", error);
      
      if (error.code === 'insufficient_quota') {
        return res.status(429).json({ 
          message: "AI quota exceeded. Please try again later.",
          error: "quota_exceeded"
        });
      }
      
      res.status(500).json({ message: "Failed to generate suggestions" });
    }
  });

  /**
   * POST /api/ai/improve-text - Improve existing text with AI
   */
  app.post("/api/ai/improve-text", csrfProtection, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      const { text, context } = req.body;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ message: "Text is required" });
      }

      const prompt = `Improve this ${context || 'specification text'} to be clearer, more concise, and professional.

Original text:
${text}

Provide 2-3 improved versions with different tones:
1. Professional and formal
2. Clear and concise
3. User-friendly and accessible

Format: JSON object with keys "formal", "concise", "friendly"`;

      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that improves technical writing. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: "json_object" }
      });

      const improvements = JSON.parse(completion.choices[0].message.content || "{}");

      res.json({
        improvements,
        tokensUsed: completion.usage?.total_tokens || 0,
      });
    } catch (error: any) {
      console.error("AI improvement error:", error);
      
      if (error.code === 'insufficient_quota') {
        return res.status(429).json({ 
          message: "AI quota exceeded. Please try again later.",
          error: "quota_exceeded"
        });
      }
      
      res.status(500).json({ message: "Failed to improve text" });
    }
  });

  /**
   * POST /api/ai/generate-user-stories - Generate user stories from spec
   */
  app.post("/api/ai/generate-user-stories", csrfProtection, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      const { purpose, audience, problemStatement } = req.body;

      const prompt = `Generate 5-7 user stories in standard format from this specification:

Purpose: ${purpose || 'Not specified'}
Audience: ${audience || 'Not specified'}
Problem: ${problemStatement || 'Not specified'}

Format each story as:
"As a [user type], I want to [action] so that [benefit]"

Return JSON object with "stories" array of objects containing:
- story: the user story text
- acceptanceCriteria: array of 2-3 acceptance criteria
- priority: "high", "medium", or "low"`;

      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates user stories following agile best practices. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1200,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      res.json({
        stories: result.stories || [],
        tokensUsed: completion.usage?.total_tokens || 0,
      });
    } catch (error: any) {
      console.error("AI user stories error:", error);
      
      if (error.code === 'insufficient_quota') {
        return res.status(429).json({ 
          message: "AI quota exceeded. Please try again later.",
          error: "quota_exceeded"
        });
      }
      
      res.status(500).json({ message: "Failed to generate user stories" });
    }
  });
}

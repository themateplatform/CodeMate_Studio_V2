import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR,
  timeout: 30000, // 30 second timeout
  maxRetries: 3   // Retry up to 3 times
});

interface CodeGenerationResult {
  code: string;
  filePath?: string;
  language: string;
  tokens: number;
}

interface ChatResponse {
  success: boolean;
  data?: any;
  error?: string;
  tokens?: number;
}

interface OpenAIRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" | "text" };
}

class OpenAIService {
  private readonly defaultModel = "gpt-4o";
  private readonly fallbackModel = "gpt-4o-mini";
  
  /**
   * Centralized OpenAI chat completion with error handling and retries
   */
  async openaiChat(
    messages: Array<{ role: string; content: string }>,
    model?: string,
    options?: OpenAIRequestOptions
  ): Promise<ChatResponse> {
    try {
      const response = await openai.chat.completions.create({
        model: model || this.defaultModel,
        messages: messages as any,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 4000,
        response_format: options?.responseFormat
      });

      return {
        success: true,
        data: response,
        tokens: response.usage?.total_tokens
      };
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      // Try fallback model if main model fails
      if (model === this.defaultModel && error?.status !== 401) {
        try {
          const fallbackResponse = await openai.chat.completions.create({
            model: this.fallbackModel,
            messages: messages as any,
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 2000,
            response_format: options?.responseFormat
          });
          
          return {
            success: true,
            data: fallbackResponse,
            tokens: fallbackResponse.usage?.total_tokens
          };
        } catch (fallbackError) {
          console.error('Fallback model also failed:', fallbackError);
        }
      }
      
      return {
        success: false,
        error: error?.message || 'Unknown OpenAI API error'
      };
    }
  }
  async generateCode(prompt: string, context?: any): Promise<CodeGenerationResult> {
    try {
      const systemPrompt = `You are an expert software developer. Generate clean, production-ready code based on the user's request. 
      
      Consider the context provided and follow modern best practices. 
      
      Respond with JSON in this exact format:
      {
        "code": "generated code here",
        "filePath": "suggested/file/path.tsx",
        "language": "typescript",
        "explanation": "brief explanation of what the code does"
      }`;

      const userPrompt = context 
        ? `${prompt}\n\nContext: ${JSON.stringify(context)}`
        : prompt;

      const response = await this.openaiChat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ], undefined, {
        responseFormat: { type: "json_object" }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate code');
      }

      const result = JSON.parse(response.data.choices[0].message.content || '{}');
      
      return {
        code: result.code || '',
        filePath: result.filePath,
        language: result.language || 'typescript',
        tokens: response.tokens || 0,
      };
    } catch (error) {
      console.error('OpenAI code generation error:', error);
      throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateChatResponse(message: string, projectId: string): Promise<string> {
    try {
      const systemPrompt = `You are an AI assistant specialized in software development. 
      Help users with coding questions, explain concepts, suggest improvements, and provide guidance.
      Keep responses concise but informative.`;

      const response = await this.openaiChat([
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]);

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate chat response');
      }

      return response.data.choices[0].message.content || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw new Error(`Failed to generate chat response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeCode(code: string, language: string): Promise<{
    suggestions: string[];
    issues: string[];
    complexity: 'low' | 'medium' | 'high';
  }> {
    try {
      const prompt = `Analyze this ${language} code for potential improvements, issues, and complexity:

      \`\`\`${language}
      ${code}
      \`\`\`

      Respond with JSON in this format:
      {
        "suggestions": ["suggestion 1", "suggestion 2"],
        "issues": ["issue 1", "issue 2"],
        "complexity": "low|medium|high"
      }`;

      const response = await this.openaiChat([
        { role: "user", content: prompt }
      ], undefined, {
        responseFormat: { type: "json_object" }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to analyze code');
      }

      return JSON.parse(response.data.choices[0].message.content || '{}');
    } catch (error) {
      console.error('OpenAI code analysis error:', error);
      throw new Error(`Failed to analyze code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateComponent(description: string, framework: string = 'react'): Promise<CodeGenerationResult> {
    try {
      const prompt = `Generate a ${framework} component based on this description: ${description}
      
      Requirements:
      - Use TypeScript
      - Follow modern React patterns with hooks
      - Include proper props interface
      - Add basic styling with Tailwind CSS
      - Include accessibility attributes
      - Make it production-ready
      
      Respond with JSON in this format:
      {
        "code": "component code here",
        "filePath": "components/ComponentName.tsx",
        "language": "typescript"
      }`;

      const response = await this.openaiChat([
        { role: "user", content: prompt }
      ], undefined, {
        responseFormat: { type: "json_object" }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate component');
      }

      const result = JSON.parse(response.data.choices[0].message.content || '{}');
      
      return {
        code: result.code || '',
        filePath: result.filePath,
        language: result.language || 'typescript',
        tokens: response.tokens || 0,
      };
    } catch (error) {
      console.error('OpenAI component generation error:', error);
      throw new Error(`Failed to generate component: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const openaiService = new OpenAIService();

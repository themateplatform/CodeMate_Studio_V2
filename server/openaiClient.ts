// Use openaiService which implements the secure proxy pattern
import { openaiService } from "./services/openaiService";

export interface CodeGenerationRequest {
  prompt: string;
  language?: string;
  context?: string;
  existingCode?: string;
}

export interface CodeGenerationResponse {
  code: string;
  explanation: string;
  fileName?: string;
  language: string;
}

export async function generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
  try {
    const context = {
      existingCode: request.existingCode,
      language: request.language
    };
    
    const result = await openaiService.generateCode(request.prompt, context);
    
    return {
      code: result.code,
      explanation: 'Generated code using OpenAI service',
      fileName: result.filePath,
      language: result.language
    };
  } catch (error) {
    throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function improveCode(code: string, improvements: string): Promise<CodeGenerationResponse> {
  try {
    const analysisResult = await openaiService.analyzeCode(code, 'typescript');
    const improvedResult = await openaiService.generateCode(
      `Improve this code with the following requirements: ${improvements}\n\nCode to improve:\n${code}`,
      { improvements, originalCode: code }
    );
    
    return {
      code: improvedResult.code,
      explanation: `Code improved based on: ${improvements}`,
      fileName: improvedResult.filePath,
      language: improvedResult.language
    };
  } catch (error) {
    throw new Error(`Failed to improve code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function chatWithAI(message: string, context?: string): Promise<string> {
  try {
    const fullMessage = context ? `${message}\n\nContext: ${context}` : message;
    return await openaiService.generateChatResponse(fullMessage, 'default-project');
  } catch (error) {
    throw new Error(`Failed to chat with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

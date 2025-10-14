/**
 * Prompt Parser - Extract intents and requirements from natural language prompts
 */

const WORD_REGEX = /[a-zA-Z0-9]+/g;

export interface ParsedPrompt {
  keywords: string[];
  intent: string;
  features: string[];
  entities: string[];
  confidence: number;
}

// Common feature keywords
const FEATURE_KEYWORDS = {
  auth: ['login', 'signup', 'authentication', 'user', 'register', 'password'],
  blog: ['blog', 'post', 'article', 'content', 'cms', 'author'],
  dashboard: ['dashboard', 'admin', 'analytics', 'metrics', 'charts', 'stats'],
  ecommerce: ['shop', 'store', 'cart', 'product', 'checkout', 'payment'],
  landing: ['landing', 'marketing', 'homepage', 'hero', 'cta'],
  social: ['social', 'feed', 'follow', 'like', 'share', 'comment'],
  profile: ['profile', 'account', 'settings', 'preferences'],
  search: ['search', 'filter', 'query', 'find']
};

// Intent patterns
const INTENT_PATTERNS = {
  create: ['build', 'create', 'make', 'generate', 'develop'],
  modify: ['update', 'change', 'modify', 'edit', 'improve'],
  analyze: ['analyze', 'review', 'check', 'audit', 'test']
};

/**
 * Simple keyword extraction
 */
export function parsePrompt(prompt: string): string[] {
  if (!prompt.trim()) {
    return [];
  }

  return Array.from(new Set((prompt.match(WORD_REGEX) || []).map((word) => word.toLowerCase())));
}

/**
 * Enhanced prompt parsing with intent detection
 */
export function parsePromptEnhanced(prompt: string): ParsedPrompt {
  const normalized = prompt.toLowerCase().trim();
  const words = parsePrompt(prompt);
  
  // Detect intent
  let intent = 'create'; // default
  for (const [intentType, keywords] of Object.entries(INTENT_PATTERNS)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      intent = intentType;
      break;
    }
  }
  
  // Detect features
  const features: string[] = [];
  for (const [feature, keywords] of Object.entries(FEATURE_KEYWORDS)) {
    if (keywords.some(keyword => words.includes(keyword))) {
      features.push(feature);
    }
  }
  
  // Extract entities (capitalized words, could be names/brands)
  const entityMatches = prompt.match(/\b[A-Z][a-z]+\b/g) || [];
  const entities = Array.from(new Set(entityMatches));
  
  // Calculate confidence based on specificity
  const confidence = Math.min(
    0.5 + (features.length * 0.1) + (entities.length * 0.05),
    1.0
  );
  
  return {
    keywords: words,
    intent,
    features,
    entities,
    confidence
  };
}

/**
 * Extract primary template type from prompt
 */
export function extractTemplateType(prompt: string): string | null {
  const parsed = parsePromptEnhanced(prompt);
  
  // Priority order for template selection
  const templatePriority = ['blog', 'dashboard', 'landing', 'ecommerce'];
  
  for (const template of templatePriority) {
    if (parsed.features.includes(template)) {
      return template;
    }
  }
  
  // Default based on keywords
  if (parsed.keywords.some(k => ['blog', 'article', 'post'].includes(k))) return 'blog';
  if (parsed.keywords.some(k => ['dashboard', 'admin', 'analytics'].includes(k))) return 'dashboard';
  if (parsed.keywords.some(k => ['landing', 'homepage', 'marketing'].includes(k))) return 'landing';
  
  return null;
}


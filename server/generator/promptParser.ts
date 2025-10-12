const WORD_REGEX = /[a-zA-Z0-9]+/g;

export function parsePrompt(prompt: string): string[] {
  if (!prompt.trim()) {
    return [];
  }

  return Array.from(new Set((prompt.match(WORD_REGEX) || []).map((word) => word.toLowerCase())));
}

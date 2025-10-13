/**
 * Template Matcher - Match prompts to appropriate templates
 */

import mappings from "../../specs/templateMappings.json" assert { type: "json" };
import { Recipe } from "./types";
import { blogRecipe } from "../templates/recipes/blog.recipe.ts";
import { dashboardRecipe } from "../templates/recipes/dashboard.recipe.ts";
import { landingRecipe } from "../templates/recipes/landing.recipe.ts";
import { parsePromptEnhanced } from "./promptParser.ts";

type TemplateMappings = typeof mappings;

// Map recipe names to actual Recipe objects
const recipeRegistry: Record<string, Recipe> = {
  blog: blogRecipe,
  dashboard: dashboardRecipe,
  landing: landingRecipe,
};

export interface MatchResult {
  recipe: Recipe;
  confidence: number;
  matchedKeywords: string[];
  suggestions?: string[];
}

/**
 * Match template using keyword matching (original implementation)
 */
export function matchTemplate(keywords: string[]): Recipe | null {
  const normalized = keywords.map((keyword) => keyword.toLowerCase());
  const templateMappings = mappings as TemplateMappings;

  for (const recipeKey of Object.keys(templateMappings.keywords)) {
    const recipeKeywords = templateMappings.keywords[recipeKey as keyof typeof templateMappings.keywords] ?? [];
    if (recipeKeywords.some((candidate) => normalized.includes(candidate.toLowerCase()))) {
      const recipe = recipeRegistry[recipeKey];
      if (recipe) {
        return recipe;
      }
    }
  }

  return null;
}

/**
 * Enhanced template matching with confidence scoring
 */
export function matchTemplateEnhanced(prompt: string): MatchResult | null {
  const parsed = parsePromptEnhanced(prompt);
  const templateMappings = mappings as TemplateMappings;
  
  const scores: Record<string, { score: number; matches: string[] }> = {};
  
  // Score each template based on keyword matches
  for (const recipeKey of Object.keys(templateMappings.keywords)) {
    const recipeKeywords = templateMappings.keywords[recipeKey as keyof typeof templateMappings.keywords] ?? [];
    const matches = recipeKeywords.filter(keyword => 
      parsed.keywords.includes(keyword.toLowerCase())
    );
    
    if (matches.length > 0) {
      scores[recipeKey] = {
        score: matches.length / recipeKeywords.length,
        matches
      };
    }
  }
  
  // Find best match
  let bestMatch: string | null = null;
  let bestScore = 0;
  let matchedKeywords: string[] = [];
  
  for (const [recipeKey, data] of Object.entries(scores)) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestMatch = recipeKey;
      matchedKeywords = data.matches;
    }
  }
  
  if (!bestMatch || !recipeRegistry[bestMatch]) {
    return null;
  }
  
  // Generate suggestions for other templates
  const suggestions = Object.keys(scores)
    .filter(key => key !== bestMatch && scores[key].score > 0.2)
    .slice(0, 2);
  
  return {
    recipe: recipeRegistry[bestMatch],
    confidence: Math.min(bestScore * parsed.confidence, 1.0),
    matchedKeywords,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
}

/**
 * Get recipe by exact name
 */
export function getRecipeByName(name: string): Recipe | null {
  if (!name) {
    return null;
  }

  const key = name.toLowerCase();
  return recipeRegistry[key] ?? null;
}

/**
 * Get all available recipe names
 */
export function getAvailableRecipes(): string[] {
  return Object.keys(recipeRegistry);
}

/**
 * Get recipe metadata
 */
export function getRecipeMetadata(recipeName: string): {
  name: string;
  description: string;
  keywords: string[];
  pageCount: number;
  componentCount: number;
} | null {
  const recipe = getRecipeByName(recipeName);
  const templateMappings = mappings as TemplateMappings;
  
  if (!recipe) return null;
  
  const keywords = templateMappings.keywords[recipeName as keyof typeof templateMappings.keywords] ?? [];
  
  const descriptions: Record<string, string> = {
    blog: 'Content-focused site with posts, categories, and author pages',
    dashboard: 'Admin interface with analytics, charts, and data management',
    landing: 'Marketing page with hero section, features, and pricing'
  };
  
  return {
    name: recipe.name,
    description: descriptions[recipe.name] || 'Custom template',
    keywords: keywords as string[],
    pageCount: recipe.pages.length,
    componentCount: recipe.components.length
  };
}


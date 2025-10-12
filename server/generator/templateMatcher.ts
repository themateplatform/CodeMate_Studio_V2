import mappings from "../../specs/templateMappings.json" assert { type: "json" };
import { Recipe } from "./types";
import { blogRecipe } from "../templates/recipes/blog.recipe.ts";
import { dashboardRecipe } from "../templates/recipes/dashboard.recipe.ts";
import { landingRecipe } from "../templates/recipes/landing.recipe.ts";

type TemplateMappings = typeof mappings;

// Map recipe names to actual Recipe objects
const recipeRegistry: Record<string, Recipe> = {
  blog: blogRecipe,
  dashboard: dashboardRecipe,
  landing: landingRecipe,
};

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

export function getRecipeByName(name: string): Recipe | null {
  if (!name) {
    return null;
  }

  const key = name.toLowerCase();
  return recipeRegistry[key] ?? null;
}

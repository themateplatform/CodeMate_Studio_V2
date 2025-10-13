import type { Request, Response, Express, RequestHandler } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { parsePromptEnhanced, extractTemplateType } from "../generator/promptParser";
import { matchTemplateEnhanced, getAvailableRecipes, getRecipeMetadata, getRecipeByName } from "../generator/templateMatcher";
import { generateFiles, getFileStats } from "../generator/fileGenerator";
import { assembleProjectDetailed, generateProjectSummary } from "../generator/projectAssembler";
import { validateProject } from "../generator/buildValidator";

interface GenerateRequestBody {
  prompt?: string;
  recipe?: string;
  name?: string;
  validate?: boolean;
  outputDir?: string;
}

const DEFAULT_OUTPUT_ROOT = path.join(process.cwd(), ".generated");

export function registerGenerateRoutes(app: Express, csrfProtection: RequestHandler): void {
  /**
   * POST /api/generate - Generate a complete project from natural language
   */
  app.post("/api/generate", csrfProtection, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as GenerateRequestBody;

    try {
      const { prompt, recipe: recipeName, name, validate, outputDir } = body;

      const shouldValidate = validate !== false;
      const outputRoot = outputDir ? path.resolve(outputDir) : DEFAULT_OUTPUT_ROOT;

      // Parse prompt or use direct recipe
      let matchResult;
      if (prompt) {
        matchResult = matchTemplateEnhanced(prompt); // Takes string, does parsing internally
        
        if (!matchResult || matchResult.confidence < 0.3) {
          return res.status(400).json({
            success: false,
            message: "Could not determine project type from prompt",
            parsed: parsePromptEnhanced(prompt),
            suggestions: matchResult?.suggestions || []
          });
        }
      } else if (recipeName) {
        const recipe = getRecipeByName(recipeName);
        if (!recipe) {
          return res.status(400).json({
            success: false,
            message: `Recipe '${recipeName}' not found. Available: blog, dashboard, landing`,
          });
        }
        matchResult = { 
          recipe, 
          confidence: 1.0, 
          matchedKeywords: [recipeName],
          suggestions: [] 
        };
      } else {
        return res.status(400).json({
          success: false,
          message: "Provide either a prompt or a supported recipe name (blog, dashboard, landing).",
        });
      }

      const projectName = name || matchResult.recipe.name;
      
      // Generate files
      const files = generateFiles(matchResult.recipe);
      const stats = getFileStats(files);

      const folderName = projectName.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
      const destination = path.join(outputRoot, folderName);
      await fs.mkdir(destination, { recursive: true });

      // Assemble project
      const assembly = await assembleProjectDetailed(files, destination);

      if (!shouldValidate) {
        const summary = generateProjectSummary(files, matchResult.recipe.name);
        return res.json({
          success: true,
          recipeName: matchResult.recipe.name,
          confidence: matchResult.confidence,
          projectName,
          outputPath: destination,
          filesGenerated: Object.keys(files).length,
          stats,
          assembly,
          summary,
          message: `Generated ${matchResult.recipe.name} site with ${Object.keys(files).length} files. Validation skipped.`,
          prompt: prompt || null,
          validation: null,
        });
      }

      const buildResult = validateProject(destination);

      if (!buildResult.success) {
        return res.status(500).json({
          success: false,
          message: "Generated project failed during build validation.",
          error: buildResult.output,
          recipeName: matchResult.recipe.name,
          outputPath: destination,
        });
      }

      const summary = generateProjectSummary(files, matchResult.recipe.name);
      return res.json({
        success: true,
        recipeName: matchResult.recipe.name,
        confidence: matchResult.confidence,
        projectName,
        outputPath: destination,
        filesGenerated: Object.keys(files).length,
        stats,
        assembly,
        summary,
        message: `Generated ${matchResult.recipe.name} site with ${Object.keys(files).length} files. Build validation passed.`,
        prompt: prompt || null,
        validation: {
          success: true,
          output: buildResult.output,
        },
      });
    } catch (error) {
      console.error("Error generating site:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during site generation.",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/generate/recipes - Get available recipes
   */
  app.get("/api/generate/recipes", (req: Request, res: Response) => {
    const recipes = getAvailableRecipes();
    res.json({ recipes });
  });

  /**
   * GET /api/generate/recipes/:name - Get recipe metadata
   */
  app.get("/api/generate/recipes/:name", (req: Request, res: Response) => {
    const { name } = req.params;
    const metadata = getRecipeMetadata(name);
    
    if (!metadata) {
      return res.status(404).json({ message: "Recipe not found" });
    }
    
    res.json(metadata);
  });

  /**
   * POST /api/generate/parse - Parse a prompt without generating
   */
  app.post("/api/generate/parse", csrfProtection, (req: Request, res: Response) => {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ message: "prompt is required" });
    }
    
    const parsed = parsePromptEnhanced(prompt);
    const match = matchTemplateEnhanced(prompt); // Takes string, does parsing internally
    const templateType = extractTemplateType(prompt);
    
    res.json({
      parsed,
      match: match ? {
        recipeName: match.recipe.name,
        confidence: match.confidence,
        matchedKeywords: match.matchedKeywords,
        suggestions: match.suggestions
      } : null,
      templateType,
      suggestions: match?.suggestions || []
    });
  });
}



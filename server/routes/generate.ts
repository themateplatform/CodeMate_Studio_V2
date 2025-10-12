import type { Request, Response, Express, RequestHandler } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { parsePrompt } from "../generator/promptParser";
import { matchTemplate, getRecipeByName } from "../generator/templateMatcher";
import { generateFiles } from "../generator/fileGenerator";
import { assembleProject } from "../generator/projectAssembler";
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
  app.post("/api/generate", csrfProtection, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as GenerateRequestBody;

    try {
      const { prompt, recipe: recipeName, name, validate, outputDir } = body;

      const shouldValidate = validate !== false;
      const outputRoot = outputDir ? path.resolve(outputDir) : DEFAULT_OUTPUT_ROOT;

      let recipe = recipeName ? getRecipeByName(recipeName) : null;
      let resolvedPrompt = prompt?.trim() ?? "";

      if (!recipe) {
        if (!resolvedPrompt) {
          return res.status(400).json({
            success: false,
            message: "Provide either a prompt or a supported recipe name (blog, dashboard, landing).",
          });
        }

        const keywords = parsePrompt(resolvedPrompt);
        recipe = matchTemplate(keywords);
      }

      if (!recipe) {
        return res.status(400).json({
          success: false,
          message: "No matching template found. Try keywords like 'blog', 'dashboard', or 'landing'.",
        });
      }

      const files = generateFiles(recipe);

      const folderName = name ? name.replace(/[^a-z0-9-_]/gi, "-").toLowerCase() : recipe.name;
      const destination = path.join(outputRoot, folderName);
      await fs.mkdir(destination, { recursive: true });

      await assembleProject(files, destination);

      if (!shouldValidate) {
        return res.json({
          success: true,
          recipeName: recipe.name,
          outputPath: destination,
          filesGenerated: Object.keys(files).length,
          message: `Generated ${recipe.name} site with ${Object.keys(files).length} files. Validation skipped.`,
          prompt: resolvedPrompt || null,
          validation: null,
        });
      }

      const buildResult = validateProject(destination);

      if (!buildResult.success) {
        return res.status(500).json({
          success: false,
          message: "Generated project failed during build validation.",
          error: buildResult.output,
          recipeName: recipe.name,
          outputPath: destination,
        });
      }

      return res.json({
        success: true,
        recipeName: recipe.name,
        outputPath: destination,
        filesGenerated: Object.keys(files).length,
        message: `Generated ${recipe.name} site with ${Object.keys(files).length} files. Build validation passed.`,
        prompt: resolvedPrompt || null,
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
}

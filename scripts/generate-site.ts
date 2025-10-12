#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import fs from "node:fs/promises";
import { parsePrompt } from "../server/generator/promptParser.ts";
import { matchTemplate } from "../server/generator/templateMatcher.ts";
import { generateFiles } from "../server/generator/fileGenerator.ts";
import { assembleProject } from "../server/generator/projectAssembler.ts";
import { validateProject } from "../server/generator/buildValidator.ts";

const program = new Command();

program
  .name("generate-site")
  .description("Generate a complete React site from a natural language prompt")
  .version("1.0.0")
  .requiredOption("-p, --prompt <text>", "Natural language description of the site to generate")
  .option("-o, --output <directory>", "Output directory for generated files", "./.generated")
  .option("--skip-validation", "Skip build validation after generation", false)
  .parse(process.argv);

const options = program.opts();

async function main() {
  try {
    console.log("🔍 Parsing prompt:", options.prompt);

    // Parse natural language prompt into keywords
    const keywords = parsePrompt(options.prompt);
    console.log("📝 Extracted keywords:", keywords.join(", "));

    // Match keywords to a recipe template
    const recipe = matchTemplate(keywords);

    if (!recipe) {
      console.error("❌ No matching template found for the provided prompt.");
      console.error("💡 Try keywords like: blog, dashboard, landing page");
      process.exit(1);
    }

    console.log(`✨ Matched template: ${recipe.name}`);

    // Generate file contents from recipe
    const files = generateFiles(recipe);
    console.log(`📦 Generated ${Object.keys(files).length} files`);

    // Create output directory
    const outputDir = path.resolve(options.output, recipe.name);
    await fs.mkdir(outputDir, { recursive: true });

    // Assemble files to disk
    await assembleProject(files, outputDir);
    console.log(`💾 Wrote files to: ${outputDir}`);

    // Validate the generated project builds successfully
    if (!options.skipValidation) {
      console.log("🔨 Validating build...");
      const buildResult = validateProject(outputDir);

      if (!buildResult.success) {
        console.error("❌ Build validation failed:");
        console.error(buildResult.output);
        process.exit(1);
      }

      console.log("✅ Build validation passed");
    }

    console.log("\n🎉 Site generation complete!");
    console.log(`📁 Output: ${outputDir}`);
    console.log(`📊 Files: ${Object.keys(files).length}`);
    console.log(`🏷️  Template: ${recipe.name}`);
  } catch (error) {
    console.error("❌ Error generating site:", error);
    process.exit(1);
  }
}

main();

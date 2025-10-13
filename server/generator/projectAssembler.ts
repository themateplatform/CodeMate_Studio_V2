/**
 * Project Assembler - Assemble generated files into complete project structure
 */

import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { GeneratedFiles } from "./types";

export interface AssemblyResult {
  outputPath: string;
  filesWritten: number;
  structure: string[];
}

/**
 * Assemble project files into output directory
 */
export async function assembleProject(files: GeneratedFiles, outDir: string): Promise<string> {
  const absoluteOutDir = path.resolve(outDir);
  await mkdir(absoluteOutDir, { recursive: true });

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(absoluteOutDir, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, "utf-8");
  }

  return absoluteOutDir;
}

/**
 * Assemble project with detailed results
 */
export async function assembleProjectDetailed(
  files: GeneratedFiles, 
  outDir: string
): Promise<AssemblyResult> {
  const absoluteOutDir = path.resolve(outDir);
  await mkdir(absoluteOutDir, { recursive: true });

  const structure: string[] = [];
  let filesWritten = 0;

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(absoluteOutDir, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, "utf-8");
    
    structure.push(relativePath);
    filesWritten++;
  }

  return {
    outputPath: absoluteOutDir,
    filesWritten,
    structure: structure.sort()
  };
}

/**
 * Check if directory exists and has content
 */
export async function checkProjectExists(outDir: string): Promise<boolean> {
  try {
    await access(path.resolve(outDir));
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate project summary
 */
export function generateProjectSummary(files: GeneratedFiles, recipeName: string): string {
  const fileList = Object.keys(files).sort();
  const pages = fileList.filter(f => f.startsWith('src/pages/')).length;
  const components = fileList.filter(f => f.startsWith('src/components/')).length;
  
  return `Generated ${recipeName} project:
- ${fileList.length} files total
- ${pages} pages
- ${components} components
- Ready to run with: npm install && npm run dev
`;
}


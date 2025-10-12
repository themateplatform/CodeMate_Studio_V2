import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GeneratedFiles } from "./types";

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

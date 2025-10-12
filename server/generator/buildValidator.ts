import { spawnSync } from "node:child_process";

export function validateProject(outDir: string): { success: boolean; output: string } {
  const build = spawnSync("npm", ["run", "build"], {
    cwd: outDir,
    stdio: "pipe",
    encoding: "utf-8",
  });

  const success = build.status === 0;
  const output = [build.stdout, build.stderr].filter(Boolean).join("\n").trim();

  return { success, output };
}

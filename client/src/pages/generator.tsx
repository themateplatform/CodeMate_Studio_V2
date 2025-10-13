import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface GeneratorResponse {
  success: boolean;
  recipeName: string;
  outputPath: string;
  filesGenerated: number;
  message: string;
  prompt?: string | null;
  validation: null | {
    success: boolean;
    output: string;
  };
  error?: string;
}

const RECIPES = [
  { value: "blog", label: "Blog" },
  { value: "dashboard", label: "Dashboard" },
  { value: "landing", label: "Landing" },
] as const;

export default function GeneratorPage(): JSX.Element {
  const [projectName, setProjectName] = useState("my-generated-app");
  const [recipe, setRecipe] = useState<(typeof RECIPES)[number]["value"]>("blog");
  const [generatePrompt, setGeneratePrompt] = useState("Build a polished blog with posts and about page.");
  const [shouldValidate, setShouldValidate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: generatePrompt,
          recipe,
          name: projectName,
          validate: shouldValidate,
        }),
      });

      const json = (await response.json()) as GeneratorResponse;

      if (!response.ok || !json.success) {
        setError(json.error || json.message || "Generation failed.");
      } else {
        setResult(json);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error while generating site.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prompt → Site Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleGenerate}>
            <div className="space-y-2">
              <Label htmlFor="projectName">Project folder name</Label>
              <input
                id="projectName"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                required
                placeholder="my-generated-app"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipe">Recipe</Label>
              <select
                id="recipe"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
                value={recipe}
                onChange={(event) => setRecipe(event.target.value as (typeof RECIPES)[number]["value"])}
              >
                {RECIPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt (optional)</Label>
              <textarea
                id="prompt"
                className="w-full min-h-[96px] rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
                value={generatePrompt}
                onChange={(event) => setGeneratePrompt(event.target.value)}
                placeholder="Describe the site you want to create"
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-slate-200">
              <Switch checked={shouldValidate} onCheckedChange={setShouldValidate} id="validate" />
              Run build validation after generation
            </label>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Generating…" : "Generate"}
              </Button>
              {result && (
                <a
                  className="inline-flex items-center rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                  href={`vscode://file/${result.outputPath}`}
                >
                  Open in VS Code
                </a>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {(error || result) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-slate-950">
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-200">
              {error ? (
                <p className="text-red-400">{error}</p>
              ) : result ? (
                <div className="space-y-2">
                  <p className="font-medium text-slate-100">{result.message}</p>
                  <p>
                    Files generated: <span className="font-semibold">{result.filesGenerated}</span>
                  </p>
                  <p>
                    Output path: <span className="font-semibold text-slate-100">{result.outputPath}</span>
                  </p>
                  {result.prompt && (
                    <p className="text-slate-400">Prompt: {result.prompt}</p>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="bg-slate-950">
            <CardHeader>
              <CardTitle>Validation Output</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-200">
                {result?.validation?.output || (shouldValidate ? "Awaiting validation output" : "Validation skipped")}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

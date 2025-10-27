import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { AppSelector } from "@/components/AppSelector";
import { TokenPreview } from "@/components/TokenPreview";

interface GeneratorResponse {
  success: boolean;
  recipeName: string;
  confidence?: number;
  projectName: string;
  outputPath: string;
  filesGenerated: number;
  stats?: {
    totalFiles: number;
    totalLines: number;
    totalSize: number;
    avgFileSize: number;
  };
  assembly?: {
    outputPath: string;
    filesWritten: number;
    structure: string[];
  };
  summary?: string;
  message: string;
  prompt?: string | null;
  validation: null | {
    success: boolean;
    output: string;
  };
  error?: string;
  parsed?: any;
  suggestions?: string[];
}

interface ParseResponse {
  parsed: {
    intent: string;
    features: string[];
    entities: string[];
    keywords: string[];
    confidence: number;
  };
  match: {
    recipeName: string;
    confidence: number;
    matchedKeywords: string[];
    suggestions?: string[];
  } | null;
  templateType: string | null;
  suggestions: string[];
}

interface RecipeMetadata {
  name: string;
  description: string;
  pages: number;
  components: number;
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
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<GeneratorResponse | null>(null);
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<RecipeMetadata[]>([]);
  const [targetApp, setTargetApp] = useState("default");
  const [showTokenPreview, setShowTokenPreview] = useState(false);

  // Load available recipes on mount
  useEffect(() => {
    async function loadRecipes() {
      try {
        const response = await fetch("/api/generate/recipes");
        if (response.ok) {
          const data = await response.json();
          setRecipes(data.recipes || []);
        }
      } catch (err) {
        console.error("Failed to load recipes:", err);
      }
    }
    loadRecipes();
  }, []);

  // Analyze prompt as user types (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (generatePrompt.trim().length > 10) {
        await analyzePrompt(generatePrompt);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [generatePrompt]);

  async function analyzePrompt(prompt: string) {
    if (!prompt.trim()) return;
    
    setAnalyzing(true);
    try {
      const response = await apiRequest("POST", "/api/generate/parse", { prompt });
      if (response.ok) {
        const data = await response.json();
        setParseResult(data);
        
        // Auto-select best match if confidence is high
        if (data.match && data.match.confidence > 0.5) {
          setRecipe(data.match.recipeName as typeof recipe);
        }
      }
    } catch (err) {
      console.error("Failed to analyze prompt:", err);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiRequest("POST", "/api/generate", {
        prompt: generatePrompt,
        recipe,
        name: projectName,
        validate: shouldValidate,
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

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.7) return "bg-green-500";
    if (confidence >= 0.4) return "bg-yellow-500";
    return "bg-red-500";
  }

  function getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.7) return "High";
    if (confidence >= 0.4) return "Medium";
    return "Low";
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prompt → Site Generator</CardTitle>
          <CardDescription>
            Describe your project in natural language or select a recipe to generate a complete Vite + React + TypeScript application
          </CardDescription>
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
              <Label htmlFor="prompt">Describe your project</Label>
              <textarea
                id="prompt"
                className="w-full min-h-[96px] rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
                value={generatePrompt}
                onChange={(event) => setGeneratePrompt(event.target.value)}
                placeholder="Build a blog with posts, categories, and an about page..."
              />
              {analyzing && (
                <p className="text-xs text-slate-400">Analyzing prompt...</p>
              )}
              {parseResult && (
                <div className="space-y-2 rounded-md border border-slate-700 bg-slate-900/50 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Detected:</span>
                    <Badge variant="outline" className="text-xs">
                      {parseResult.parsed.intent}
                    </Badge>
                    {parseResult.parsed.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  {parseResult.match && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Best match:</span>
                      <Badge className="text-xs">{parseResult.match.recipeName}</Badge>
                      <div className="flex items-center gap-1">
                        <div className={`h-2 w-2 rounded-full ${getConfidenceColor(parseResult.match.confidence)}`} />
                        <span className="text-xs text-slate-400">
                          {getConfidenceLabel(parseResult.match.confidence)} ({Math.round(parseResult.match.confidence * 100)}%)
                        </span>
                      </div>
                    </div>
                  )}
                  {parseResult.suggestions && parseResult.suggestions.length > 0 && (
                    <div className="text-xs text-slate-400">
                      Suggestions: {parseResult.suggestions.join(", ")}
                    </div>
                  )}
                </div>
              )}
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
              {recipes.length > 0 && (
                <div className="grid gap-2 pt-2 sm:grid-cols-3">
                  {recipes.map((r) => (
                    <div
                      key={r.name}
                      className={`rounded-md border p-2 text-xs ${
                        recipe === r.name
                          ? "border-slate-500 bg-slate-800"
                          : "border-slate-700 bg-slate-900/50"
                      }`}
                    >
                      <div className="font-semibold text-slate-100">{r.name}</div>
                      <div className="text-slate-400">{r.description}</div>
                      <div className="mt-1 text-slate-500">
                        {r.pages} pages • {r.components} components
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center gap-3 text-sm text-slate-200">
              <Switch checked={shouldValidate} onCheckedChange={setShouldValidate} id="validate" />
              Run build validation after generation
            </label>

            {/* DesignMate Integration */}
            <div className="space-y-4 rounded-md border border-slate-700 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100">Design System</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTokenPreview(!showTokenPreview)}
                >
                  {showTokenPreview ? "Hide" : "Preview"} Tokens
                </Button>
              </div>
              <AppSelector value={targetApp} onChange={setTargetApp} />
              {showTokenPreview && (
                <div className="mt-4">
                  <TokenPreview appName={targetApp} />
                </div>
              )}
            </div>

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
              <CardTitle>Generation Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-200">
              {error ? (
                <div className="space-y-2">
                  <p className="text-red-400">{error}</p>
                  {result?.suggestions && result.suggestions.length > 0 && (
                    <div className="rounded-md border border-yellow-500/20 bg-yellow-500/10 p-2">
                      <p className="font-semibold text-yellow-400">Suggestions:</p>
                      <ul className="ml-4 list-disc text-xs text-yellow-300">
                        {result.suggestions.map((suggestion, i) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : result ? (
                <div className="space-y-3">
                  <p className="font-medium text-slate-100">{result.message}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Recipe:</span>
                      <span className="ml-2 font-semibold">{result.recipeName}</span>
                    </div>
                    {result.confidence && (
                      <div>
                        <span className="text-slate-400">Confidence:</span>
                        <span className="ml-2 font-semibold">{Math.round(result.confidence * 100)}%</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">Files:</span>
                      <span className="ml-2 font-semibold">{result.filesGenerated}</span>
                    </div>
                    {result.stats && (
                      <div>
                        <span className="text-slate-400">Total lines:</span>
                        <span className="ml-2 font-semibold">{result.stats.totalLines}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-slate-400">Output path:</p>
                    <code className="block rounded bg-slate-900 p-2 text-xs text-slate-100">
                      {result.outputPath}
                    </code>
                  </div>

                  {result.summary && (
                    <div>
                      <p className="text-slate-400">Summary:</p>
                      <pre className="whitespace-pre-wrap rounded bg-slate-900 p-2 text-xs text-slate-300">
                        {result.summary}
                      </pre>
                    </div>
                  )}

                  {result.prompt && (
                    <p className="text-xs text-slate-400">Prompt: {result.prompt}</p>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="bg-slate-950">
            <CardHeader>
              <CardTitle>
                {result?.assembly ? "File Structure" : "Validation Output"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result?.assembly ? (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">
                    {result.assembly.filesWritten} files written
                  </div>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-2 text-xs text-slate-300 font-mono">
                    {result.assembly.structure.map((file, i) => (
                      <div key={i} className="hover:bg-slate-800">
                        {file}
                      </div>
                    ))}
                  </pre>
                </div>
              ) : (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-200">
                  {result?.validation?.output || (shouldValidate ? "Awaiting validation output" : "Validation skipped")}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


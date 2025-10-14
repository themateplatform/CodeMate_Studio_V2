import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Lightbulb, TrendingUp, TrendingDown } from "lucide-react";

interface SpecAnalysis {
  overallScore: number;
  strengths: string[];
  improvements: Array<{
    area: string;
    issue: string;
    suggestion: string;
    priority: "high" | "medium" | "low";
  }>;
  missingElements: string[];
  clarityScore: number;
  completenessScore: number;
}

interface AIAnalysisProps {
  specData: {
    title?: string;
    purpose?: string;
    audience?: string;
    problemStatement?: string;
    solutionOverview?: string;
  };
}

export function AISpecAnalysis({ specData }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<SpecAnalysis | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai/analyze-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(specData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Analysis failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <TrendingDown className="h-5 w-5 text-red-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Spec Analysis
            </CardTitle>
            <CardDescription>
              Get instant feedback on your specification quality
            </CardDescription>
          </div>
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            size="sm"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {analyzeMutation.error && (
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {(analyzeMutation.error as Error).message}
            </AlertDescription>
          </Alert>
        </CardContent>
      )}

      {analysis && (
        <CardContent className="space-y-6">
          {/* Overall Score */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {getScoreIcon(analysis.overallScore)}
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                {analysis.overallScore}
              </div>
              <div className="text-sm text-gray-600">Overall Score</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {getScoreIcon(analysis.clarityScore)}
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(analysis.clarityScore)}`}>
                {analysis.clarityScore}
              </div>
              <div className="text-sm text-gray-600">Clarity</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {getScoreIcon(analysis.completenessScore)}
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(analysis.completenessScore)}`}>
                {analysis.completenessScore}
              </div>
              <div className="text-sm text-gray-600">Completeness</div>
            </div>
          </div>

          {/* Strengths */}
          {analysis.strengths.length > 0 && (
            <div>
              <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Strengths
              </h4>
              <ul className="space-y-1">
                {analysis.strengths.map((strength, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {analysis.improvements.length > 0 && (
            <div>
              <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Suggested Improvements
              </h4>
              <div className="space-y-3">
                {analysis.improvements.map((improvement, idx) => (
                  <div key={idx} className="border-l-4 border-blue-200 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">
                        {improvement.area}
                      </span>
                      <Badge variant={getPriorityColor(improvement.priority)} className="text-xs">
                        {improvement.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{improvement.issue}</p>
                    <p className="text-sm text-blue-700">💡 {improvement.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Elements */}
          {analysis.missingElements.length > 0 && (
            <div>
              <h4 className="font-semibold text-orange-700 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Missing Elements
              </h4>
              <ul className="space-y-1">
                {analysis.missingElements.map((element, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-orange-600 mt-1">•</span>
                    <span>{element}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

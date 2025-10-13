import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, Copy, Check, AlertCircle } from "lucide-react";

interface AISuggestionsProps {
  context: "purpose" | "audience" | "problem" | "solution" | "acceptance" | "metrics";
  label: string;
  relatedContent?: {
    title?: string;
    purpose?: string;
    audience?: string;
  };
  onSelect?: (suggestion: string) => void;
}

export function AISuggestions({ context, label, relatedContent, onSelect }: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const suggestMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai/suggest-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          context,
          relatedContent,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate suggestions");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions || []);
    },
  });

  const handleCopy = async (suggestion: string, index: number) => {
    await navigator.clipboard.writeText(suggestion);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    
    if (onSelect) {
      onSelect(suggestion);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              AI Suggestions for {label}
            </CardTitle>
            <CardDescription className="text-xs">
              Get AI-powered content ideas
            </CardDescription>
          </div>
          <Button
            onClick={() => suggestMutation.mutate()}
            disabled={suggestMutation.isPending}
            size="sm"
            variant="outline"
          >
            {suggestMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {suggestMutation.error && (
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {(suggestMutation.error as Error).message}
            </AlertDescription>
          </Alert>
        </CardContent>
      )}

      {suggestions.length > 0 && (
        <CardContent>
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="group relative border rounded-lg p-3 hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer"
                onClick={() => handleCopy(suggestion, index)}
              >
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs shrink-0">
                    {index + 1}
                  </Badge>
                  <p className="text-sm text-gray-700 flex-1">{suggestion}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(suggestion, index);
                    }}
                  >
                    {copiedIndex === index ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

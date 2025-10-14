import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, Copy, Check, AlertCircle, Wand2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AITextImproverProps {
  text: string;
  onSelect?: (improvedText: string) => void;
  triggerLabel?: string;
}

interface Variation {
  tone: string;
  text: string;
}

export function AITextImprover({ text, onSelect, triggerLabel = "Improve with AI" }: AITextImproverProps) {
  const [open, setOpen] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [copiedTone, setCopiedTone] = useState<string | null>(null);

  const improveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai/improve-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to improve text");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setVariations(data.variations || []);
    },
  });

  const handleCopy = async (variation: Variation) => {
    await navigator.clipboard.writeText(variation.text);
    setCopiedTone(variation.tone);
    setTimeout(() => setCopiedTone(null), 2000);
    
    if (onSelect) {
      onSelect(variation.text);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && text && text.trim().length > 0) {
      improveMutation.mutate();
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case "formal":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "concise":
        return "text-green-700 bg-green-50 border-green-200";
      case "friendly":
        return "text-purple-700 bg-purple-50 border-purple-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const getToneDescription = (tone: string) => {
    switch (tone) {
      case "formal":
        return "Professional and polished";
      case "concise":
        return "Clear and to the point";
      case "friendly":
        return "Approachable and warm";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!text || text.trim().length === 0}
        >
          <Wand2 className="h-3 w-3 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Text Improvements
          </DialogTitle>
          <DialogDescription>
            Choose a tone variation that best fits your needs
          </DialogDescription>
        </DialogHeader>

        {improveMutation.isPending && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <span className="ml-3 text-sm text-gray-600">Generating variations...</span>
          </div>
        )}

        {improveMutation.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {(improveMutation.error as Error).message}
            </AlertDescription>
          </Alert>
        )}

        {variations.length > 0 && (
          <Tabs defaultValue={variations[0]?.tone} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {variations.map((variation) => (
                <TabsTrigger key={variation.tone} value={variation.tone} className="capitalize">
                  {variation.tone}
                </TabsTrigger>
              ))}
            </TabsList>
            {variations.map((variation) => (
              <TabsContent key={variation.tone} value={variation.tone} className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={getToneColor(variation.tone)}>
                    {getToneDescription(variation.tone)}
                  </Badge>
                  <Button
                    onClick={() => handleCopy(variation)}
                    size="sm"
                    variant="outline"
                  >
                    {copiedTone === variation.tone ? (
                      <>
                        <Check className="h-3 w-3 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-2" />
                        Copy & Use
                      </>
                    )}
                  </Button>
                </div>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{variation.text}</p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        <div className="border-t pt-4">
          <p className="text-xs text-gray-500">
            <strong>Original:</strong>
          </p>
          <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{text}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

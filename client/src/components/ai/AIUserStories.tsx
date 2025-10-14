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
import { Sparkles, Loader2, Copy, Check, AlertCircle, Users } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface AIUserStoriesProps {
  specData: {
    title?: string;
    purpose?: string;
    audience?: string;
    problemStatement?: string;
    proposedSolution?: string;
  };
  onExport?: (stories: UserStory[]) => void;
}

interface UserStory {
  story: string;
  acceptanceCriteria: string[];
  priority: "high" | "medium" | "low";
}

export function AIUserStories({ specData, onExport }: AIUserStoriesProps) {
  const [open, setOpen] = useState(false);
  const [stories, setStories] = useState<UserStory[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai/generate-user-stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ specData }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate user stories");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setStories(data.stories || []);
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && specData.title) {
      generateMutation.mutate();
    }
  };

  const handleCopyStory = async (story: UserStory, index: number) => {
    const storyText = `${story.story}\n\nAcceptance Criteria:\n${story.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nPriority: ${story.priority}`;
    await navigator.clipboard.writeText(storyText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = async () => {
    const allStories = stories
      .map(
        (story, i) =>
          `Story ${i + 1}:\n${story.story}\n\nAcceptance Criteria:\n${story.acceptanceCriteria.map((c, idx) => `${idx + 1}. ${c}`).join("\n")}\n\nPriority: ${story.priority}`
      )
      .join("\n\n---\n\n");
    await navigator.clipboard.writeText(allStories);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const hasRequiredData = specData.title || specData.purpose || specData.problemStatement;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!hasRequiredData}>
          <Users className="h-3 w-3 mr-2" />
          Generate User Stories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI-Generated User Stories
              </DialogTitle>
              <DialogDescription>
                Based on your specification: {specData.title || "Untitled"}
              </DialogDescription>
            </div>
            {stories.length > 0 && (
              <Button onClick={handleCopyAll} size="sm" variant="outline">
                <Copy className="h-3 w-3 mr-2" />
                Copy All
              </Button>
            )}
          </div>
        </DialogHeader>

        {generateMutation.isPending && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <span className="ml-3 text-sm text-gray-600">Generating user stories...</span>
          </div>
        )}

        {generateMutation.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {(generateMutation.error as Error).message}
            </AlertDescription>
          </Alert>
        )}

        {stories.length > 0 && (
          <div className="space-y-4">
            <Accordion type="single" collapsible className="w-full">
              {stories.map((story, index) => (
                <AccordionItem key={index} value={`story-${index}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <Badge variant="outline" className="shrink-0">
                        Story {index + 1}
                      </Badge>
                      <span className="text-sm font-medium line-clamp-1">{story.story}</span>
                      <Badge variant="outline" className={`ml-auto mr-2 shrink-0 ${getPriorityColor(story.priority)}`}>
                        {story.priority}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-gray-700">{story.story}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyStory(story, index)}
                          className="shrink-0"
                        >
                          {copiedIndex === index ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      <div className="border-t pt-3">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Acceptance Criteria:</p>
                        <ul className="space-y-1.5">
                          {story.acceptanceCriteria.map((criterion, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-xs text-gray-500 mt-0.5">{idx + 1}.</span>
                              <span className="text-xs text-gray-700">{criterion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {onExport && (
              <div className="border-t pt-4">
                <Button onClick={() => onExport(stories)} variant="secondary" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Export to Project Backlog
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

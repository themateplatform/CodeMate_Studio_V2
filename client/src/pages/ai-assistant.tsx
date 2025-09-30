import { Bot, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AIAssistantPage() {
  return (
    <div className="h-full bg-background p-6 overflow-auto">
      <div className="max-w-4xl mx-auto fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-6">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4">AI Assistant</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get intelligent code suggestions, debugging help, and project guidance with our advanced AI assistant powered by GPT-4.
          </p>
        </div>

        {/* Coming Soon Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="glass border-border/50">
            <CardHeader>
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-lg">Code Generation</CardTitle>
              <CardDescription>
                Generate complete functions, components, and modules from natural language descriptions.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader>
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center mb-2">
                <Zap className="w-4 h-4 text-accent" />
              </div>
              <CardTitle className="text-lg">Smart Debugging</CardTitle>
              <CardDescription>
                Automatically identify and fix bugs with context-aware suggestions and explanations.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader>
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mb-2">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-lg">Project Context</CardTitle>
              <CardDescription>
                AI understands your entire codebase for accurate, project-specific assistance.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Coming Soon */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Coming Soon
          </div>
          <h3 className="text-2xl font-semibold mb-4">Advanced AI Features</h3>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            We're building the most powerful AI coding assistant. Join our waitlist to be notified when it launches.
          </p>
          <Button className="btn-primary" data-testid="button-join-waitlist">
            Join Waitlist
          </Button>
        </div>
      </div>
    </div>
  );
}
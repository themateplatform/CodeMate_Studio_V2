import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  MessageSquare, 
  Lightbulb, 
  Search, 
  FileText, 
  Code, 
  Github, 
  Play,
  CheckCircle,
  ArrowRight,
  Brain,
  Zap,
  Globe,
  Database,
  Bot
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AppSelector } from "@/components/AppSelector";

type AppBuilderStep = 'intake' | 'enhancement' | 'research' | 'brief' | 'agents' | 'implementation';

interface ProjectRequirement {
  id: string;
  type: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface Enhancement {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  category: string;
}

interface Competitor {
  name: string;
  url: string;
  strengths: string[];
  features: string[];
  marketPosition: string;
}

interface RecommendedAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  implementation: 'mcp' | 'api' | 'service';
  provider: string;
  benefits: string[];
}

interface MCPServer {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
}

interface DesignBrief {
  title: string;
  description: string;
  targetAudience: string;
  keyFeatures: string[];
  technicalStack: string[];
  timeline: string;
  milestones: Array<{
    title: string;
    description: string;
    duration: string;
    deliverables: string[];
  }>;
}

export default function AppBuilderPage() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [currentStep, setCurrentStep] = useState<AppBuilderStep>('intake');
  const [progress, setProgress] = useState(0);
  const [targetApp, setTargetApp] = useState('default');
  
  // Extract prompt from URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const initialPrompt = urlParams.get('prompt') || '';
  
  // DesignMate integration state
  const [targetApp, setTargetApp] = useState("default");
  
  // State for each step
  const [userInput, setUserInput] = useState(initialPrompt);
  const [projectRequirements, setProjectRequirements] = useState<ProjectRequirement[]>([]);
  const [enhancements, setEnhancements] = useState<Enhancement[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [recommendedAgents, setRecommendedAgents] = useState<RecommendedAgent[]>([]);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [designBrief, setDesignBrief] = useState<DesignBrief | null>(null);
  const [implementationPlan, setImplementationPlan] = useState<{ summary?: string; nextActions?: string[]; confidence?: string } | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Array<{id: string, type: 'user' | 'ai', content: string, timestamp: Date}>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-start with initial prompt if provided
  useEffect(() => {
    if (initialPrompt && !isProcessing && messages.length === 0) {
      handleSendMessage();
    }
  }, [initialPrompt]);

  // Smart intake mutation
  const processIntakeMutation = useMutation({
    mutationFn: async (input: string) => {
      const response = await apiRequest('POST', '/api/app-builder/intake', { 
        input, 
        context: messages,
        targetApp // Include selected design system
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.requirements) {
        setProjectRequirements(data.requirements);
      }
      if (data.followUpQuestions) {
        const aiMessage = {
          id: Date.now().toString(),
          type: 'ai' as const,
          content: data.followUpQuestions,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
      if (data.completed) {
        setCurrentStep('enhancement');
        setProgress(20);
      }
    },
    onError: (error) => {
      toast({
        title: "Processing Error",
        description: "Failed to process your input. Please try again.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  // Enhancement analysis mutation
  const enhancementMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/app-builder/enhance', { 
        requirements: projectRequirements,
        targetApp // Include design system
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setEnhancements(data.enhancements || []);
      setCompetitors(data.competitors || []);
      setCurrentStep('research');
      setProgress(40);
    }
  });

  // MCP and agent discovery mutation
  const discoveryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/app-builder/discover', { 
        requirements: projectRequirements,
        enhancements: enhancements,
        targetApp // Include design system
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setMcpServers(data.mcpServers || []);
      setRecommendedAgents(data.aiAgents || []);
      setCurrentStep('brief');
      setProgress(60);
    }
  });

  // Design brief generation mutation
  const briefMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/app-builder/brief', {
        requirements: projectRequirements,
        enhancements: enhancements,
        competitors: competitors,
        mcpServers: mcpServers,
        aiAgents: recommendedAgents,
        targetApp // Include design system
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setDesignBrief(data.brief);
      setCurrentStep('agents');
      setProgress(80);
    }
  });

  // Implementation mutation
  const implementMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/app-builder/implement', {
        brief: designBrief,
        selectedAgents: recommendedAgents.filter(a => a.id), // Add selection logic
        selectedMcpServers: mcpServers.filter(m => m.id), // Add selection logic
        targetApp // Include design system
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setImplementationPlan(data?.plan ?? null);
      setCurrentStep('implementation');
      setProgress(100);
      toast({
        title: "🎉 Project Created!",
        description: `Your project "${designBrief?.title}" has been created and is ready for development.`
      });
    }
  });

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: userInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    // Process the input based on current step
    if (currentStep === 'intake') {
      processIntakeMutation.mutate(userInput);
    }
    
    setUserInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const stepConfig = {
    intake: { icon: MessageSquare, title: "Tell us about your app", color: "text-blue-600" },
    enhancement: { icon: Lightbulb, title: "AI Enhancement Analysis", color: "text-orange-600" },
    research: { icon: Search, title: "Competitor Research", color: "text-purple-600" },
    brief: { icon: FileText, title: "Design Brief", color: "text-green-600" },
    agents: { icon: Brain, title: "AI Agent Recommendations", color: "text-red-600" },
    implementation: { icon: Code, title: "Implementation", color: "text-indigo-600" }
  };

  const currentStepConfig = stepConfig[currentStep];

  return (
    <div className="h-full flex bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Agentic AI App Builder</h1>
                <p className="text-sm text-muted-foreground">
                  Let our AI agent guide you through building your perfect app
                </p>
              </div>
            </div>
            <Badge variant="outline" className="gap-2">
              <currentStepConfig.icon className={`w-4 h-4 ${currentStepConfig.color}`} />
              {currentStepConfig.title}
            </Badge>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{progress}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {designBrief && (
            <div className="rounded-3xl border border-white/20 bg-gradient-to-r from-[#14142A] via-[#2E1A47] to-[#0B0B15] p-6 text-white shadow-2xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl space-y-2">
                  <h2 className="text-xl font-semibold">Design Vision: {designBrief.title}</h2>
                  <p className="text-sm text-white/80 leading-relaxed">{designBrief.description}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(designBrief.keyFeatures || []).slice(0, 4).map((feature, index) => (
                      <Badge key={index} variant="secondary" className="bg-white/10 text-white border-white/20">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="min-w-[220px] space-y-3 rounded-2xl bg-black/30 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/60">Target Audience</p>
                    <p className="text-sm font-medium">{designBrief.targetAudience}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/60">Timeline</p>
                    <p className="text-sm font-medium">{designBrief.timeline}</p>
                  </div>
                  {implementationPlan?.nextActions && implementationPlan.nextActions.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/60">Next Actions</p>
                      <ul className="list-disc list-inside text-sm space-y-1 text-white/80">
                        {implementationPlan.nextActions.slice(0, 3).map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex">
          {/* Chat Interface */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Welcome to the AI App Builder!</h3>
                    <p className="text-muted-foreground mb-4">
                      I'm your AI assistant that will help you create an amazing app. Let's start by understanding what you want to build.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Simply describe your app idea and I'll guide you through the entire process.
                    </p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.type === 'ai' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-2xl rounded-lg px-4 py-3 ${
                      message.type === 'user' 
                        ? 'bg-primary text-primary-foreground ml-12' 
                        : 'bg-muted mr-12'
                    }`}>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className={`text-xs mt-2 opacity-70 ${
                        message.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    {message.type === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-sm font-medium">U</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {isProcessing && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-3 mr-12">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                        <span className="text-sm text-muted-foreground ml-2">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-3">
                  <Textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={
                      currentStep === 'intake' 
                        ? "Describe your app idea... (e.g., 'I want to build a task management app for teams with real-time collaboration')"
                        : "Ask questions or provide feedback..."
                    }
                    className="flex-1 resize-none"
                    rows={3}
                    disabled={isProcessing}
                    data-testid="input-app-description"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!userInput.trim() || isProcessing}
                    className="self-end"
                    data-testid="button-send-message"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar - Show progress and results */}
          <div className="w-80 border-l border-border bg-muted/30">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Progress Overview</h3>
            </div>
            
            <ScrollArea className="h-full p-4 space-y-4">
              {/* Design System Selector */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Design System</CardTitle>
                </CardHeader>
                <CardContent>
                  <AppSelector value={targetApp} onChange={setTargetApp} />
                </CardContent>
              </Card>

              {/* Requirements */}
              {projectRequirements.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Requirements Captured
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {projectRequirements.slice(0, 3).map((req) => (
                      <div key={req.id} className="text-xs p-2 bg-background rounded border">
                        <Badge variant="outline" className="text-xs mb-1">{req.type}</Badge>
                        <p className="text-muted-foreground">{req.description}</p>
                      </div>
                    ))}
                    {projectRequirements.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{projectRequirements.length - 3} more requirements
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Enhancements */}
              {enhancements.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-orange-600" />
                      AI Enhancements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {enhancements.slice(0, 2).map((enhancement) => (
                      <div key={enhancement.id} className="text-xs p-2 bg-background rounded border">
                        <p className="font-medium">{enhancement.title}</p>
                        <p className="text-muted-foreground">{enhancement.description}</p>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">Impact: {enhancement.impact}</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Recommended Agents */}
              {recommendedAgents.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="w-4 h-4 text-red-600" />
                      AI Agents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {recommendedAgents.slice(0, 2).map((agent) => (
                      <div key={agent.id} className="text-xs p-2 bg-background rounded border">
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-muted-foreground">{agent.description}</p>
                        <Badge variant="outline" className="text-xs mt-1">{agent.category}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <div className="space-y-2">
                {currentStep !== 'intake' && currentStep !== 'implementation' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      if (currentStep === 'enhancement') enhancementMutation.mutate();
                      if (currentStep === 'research') discoveryMutation.mutate();
                      if (currentStep === 'brief') briefMutation.mutate();
                      if (currentStep === 'agents') implementMutation.mutate();
                    }}
                    disabled={isProcessing}
                  >
                    <Zap className="w-4 h-4" />
                    Continue to Next Step
                  </Button>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

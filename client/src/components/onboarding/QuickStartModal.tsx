import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Github, 
  Zap, 
  Code2, 
  Rocket, 
  ArrowRight,
  Sparkles,
  Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface QuickStartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const projectTemplates = [
  {
    id: "react-starter",
    name: "React App",
    description: "Modern React with TypeScript, Tailwind CSS, and Vite",
    icon: Code2,
    color: "bg-blue-500/20 text-blue-400 border-blue-500/20"
  },
  {
    id: "next-fullstack",
    name: "Next.js Full Stack",
    description: "Next.js 14 with API routes, TypeScript, and database",
    icon: Globe,
    color: "bg-green-500/20 text-green-400 border-green-500/20"
  },
  {
    id: "api-backend",
    name: "API Backend",
    description: "Express.js REST API with TypeScript and PostgreSQL",
    icon: Zap,
    color: "bg-purple-500/20 text-purple-400 border-purple-500/20"
  }
];

export function QuickStartModal({ open, onOpenChange, onComplete }: QuickStartModalProps) {
  const [, navigate] = useLocation();
  const [projectName, setProjectName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("react-starter");
  const [githubUrl, setGithubUrl] = useState("");
  const { toast } = useToast();

  // Create new project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; template?: string }) => {
      const response = await apiRequest('POST', '/api/projects', data);
      return await response.json();
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project created! 🚀",
        description: `${project.name} is ready. Opening IDE...`,
      });
      // Navigate to IDE immediately 
      setTimeout(() => {
        navigate(`/ide/${project.id}`);
        onComplete?.();
        onOpenChange(false);
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create project",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Import from GitHub mutation
  const importProjectMutation = useMutation({
    mutationFn: async (data: { name: string; githubUrl: string }) => {
      // First create the project
      const projectResponse = await apiRequest('POST', '/api/projects', { name: data.name });
      const project = await projectResponse.json();

      // Then connect and import from GitHub
      await apiRequest('POST', `/api/projects/${project.id}/github/clone`, { 
        repoUrl: data.githubUrl,
        clearExisting: true 
      });

      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Repository imported! 🎉",
        description: `${project.name} is ready with GitHub sync. Opening IDE...`,
      });
      // Navigate to IDE immediately
      setTimeout(() => {
        navigate(`/ide/${project.id}`);
        onComplete?.();
        onOpenChange(false);
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to import repository",
        description: error.message || "Check the URL and try again.",
        variant: "destructive"
      });
    }
  });

  const handleCreateProject = () => {
    if (!projectName.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a name for your project",
        variant: "destructive"
      });
      return;
    }

    createProjectMutation.mutate({
      name: projectName,
      template: selectedTemplate
    });
  };

  const handleImportProject = () => {
    if (!projectName.trim()) {
      toast({
        title: "Project name required", 
        description: "Please enter a name for your project",
        variant: "destructive"
      });
      return;
    }

    if (!githubUrl.trim()) {
      toast({
        title: "GitHub URL required",
        description: "Please enter a valid GitHub repository URL", 
        variant: "destructive"
      });
      return;
    }

    importProjectMutation.mutate({
      name: projectName,
      githubUrl: githubUrl
    });
  };

  const selectedTemplateData = projectTemplates.find(t => t.id === selectedTemplate);
  const isLoading = createProjectMutation.isPending || importProjectMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] glass border-border/50">
        <DialogHeader className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-2xl">Quick Start</DialogTitle>
          <DialogDescription>
            Get coding in seconds. Create a new project or import from GitHub.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="gap-2" data-testid="tab-create-project">
              <Plus className="w-4 h-4" />
              Create New
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2" data-testid="tab-import-project">
              <Github className="w-4 h-4" />
              Import from GitHub
            </TabsTrigger>
          </TabsList>

          {/* Create New Project */}
          <TabsContent value="create" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  placeholder="My Awesome Project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  data-testid="input-project-name"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-3">
                <Label>Choose Template</Label>
                <div className="grid grid-cols-1 gap-3">
                  {projectTemplates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-all duration-300 border ${
                        selectedTemplate === template.id 
                          ? 'border-neon-pink bg-neon-pink/10 neon-glow' 
                          : 'border-border hover:border-neon-pink/50 hover-neon'
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                      data-testid={`template-${template.id}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${template.color}`}>
                            <template.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                            <CardDescription className="text-xs">{template.description}</CardDescription>
                          </div>
                          {selectedTemplate === template.id && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleCreateProject}
              disabled={!projectName.trim() || isLoading}
              className="btn-primary w-full gap-2 hover-neon"
              data-testid="button-create-project"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Creating Project...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Create Project
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </TabsContent>

          {/* Import from GitHub */}
          <TabsContent value="import" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github-url">GitHub Repository URL</Label>
                <Input
                  id="github-url"
                  placeholder="https://github.com/username/repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  data-testid="input-github-url"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-project-name">Project Name</Label>
                <Input
                  id="import-project-name"
                  placeholder="My Imported Project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  data-testid="input-import-project-name"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Github className="w-4 h-4" />
                <span>Repository will be cloned and synced with GitHub automatically</span>
              </div>
            </div>

            <Button 
              onClick={handleImportProject}
              disabled={!projectName.trim() || !githubUrl.trim() || isLoading}
              className="btn-primary w-full gap-2 hover-neon"
              data-testid="button-import-project"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Importing Repository...
                </>
              ) : (
                <>
                  <Github className="w-4 h-4" />
                  Import & Open
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
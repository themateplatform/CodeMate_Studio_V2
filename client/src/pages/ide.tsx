import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { 
  Settings, 
  Play,
  Monitor,
  Smartphone,
  Share,
  MoreHorizontal,
  FileText,
  FolderOpen,
  Download,
  GitBranch,
  Save,
  Zap,
  ArrowUp,
  ArrowDown,
  Github
} from "lucide-react";
import { AIChatPanel } from "@/components/ai/AIChatPanel";
import { LivePreview } from "@/components/preview/LivePreview";
import { useWebSocket } from "@/hooks/useWebSocket";

interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file';
  language: string;
  isActive: boolean;
}

export default function IDEPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const { toast } = useToast();
  const { isConnected, sendMessage } = useWebSocket();

  // Load project data
  const { data: currentProject } = useQuery({
    queryKey: ['/api/projects', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to load project');
      return response.json();
    },
    enabled: !!projectId
  });

  // Load project files  
  const { data: projectFiles } = useQuery({
    queryKey: ['/api/projects', projectId, 'files'],
    queryFn: async () => {
      if (!projectId) return [];
      const response = await fetch(`/api/projects/${projectId}/files`);
      if (!response.ok) throw new Error('Failed to load files');
      return response.json();
    },
    enabled: !!projectId
  });

  const createFileMutation = useMutation({
    mutationFn: async (data: { fileName: string; content?: string }) => {
      if (!projectId) throw new Error('No project selected');
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: data.fileName,
          filePath: data.fileName,
          content: data.content || '',
          language: getLanguageFromFileName(data.fileName)
        }),
      });
      if (!response.ok) throw new Error('Failed to create file');
      return response.json();
    },
    onSuccess: (newFile) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
      toast({
        title: 'File created',
        description: `${newFile.fileName} is ready`,
      });
    },
    onError: () => {
      toast({
        title: 'Error creating file',
        description: 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const getLanguageFromFileName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': return 'javascript';
      case 'jsx': return 'javascript';
      case 'ts': return 'typescript';
      case 'tsx': return 'typescript';
      case 'css': return 'css';
      case 'html': return 'html';
      case 'json': return 'json';
      case 'md': return 'markdown';
      default: return 'plaintext';
    }
  };

  const handleSave = () => {
    if (currentProject && sendMessage) {
      sendMessage({
        type: 'project_save',
        projectId: currentProject.id,
        payload: { projectId: currentProject.id }
      });
      toast({ title: 'Project saved' });
    }
  };

  // GitHub PAT status
  const { data: githubPat } = useQuery({
    queryKey: ['/api/github/pat'],
    queryFn: async () => {
      const response = await fetch('/api/github/pat');
      if (!response.ok) return null;
      return response.json();
    }
  });

  const pushToGitHubMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project selected');
      return apiRequest('POST', `/api/github/push/${projectId}`, {
        commitMessage: `Update from CodeVibe - ${new Date().toLocaleString()}`
      });
    },
    onSuccess: () => {
      toast({
        title: 'Pushed to GitHub',
        description: 'Your changes have been uploaded to GitHub successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error pushing to GitHub',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const pullFromGitHubMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project selected');
      return apiRequest('POST', `/api/github/pull/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
      toast({
        title: 'Pulled from GitHub',
        description: 'Latest changes have been downloaded from GitHub',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error pulling from GitHub',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleGitHubPush = () => {
    if (!githubPat) {
      toast({
        title: 'GitHub PAT required',
        description: 'Please configure your GitHub Personal Access Token in Settings',
        variant: 'destructive',
      });
      return;
    }
    if (!currentProject?.githubRepoUrl) {
      toast({
        title: 'GitHub repository not connected',
        description: 'Please connect a GitHub repository first',
        variant: 'destructive',
      });
      return;
    }
    pushToGitHubMutation.mutate();
  };

  const handleGitHubPull = () => {
    if (!githubPat) {
      toast({
        title: 'GitHub PAT required',
        description: 'Please configure your GitHub Personal Access Token in Settings',
        variant: 'destructive',
      });
      return;
    }
    if (!currentProject?.githubRepoUrl) {
      toast({
        title: 'GitHub repository not connected',
        description: 'Please connect a GitHub repository first',
        variant: 'destructive',
      });
      return;
    }
    pullFromGitHubMutation.mutate();
  };

  const handleDeploy = () => {
    if (currentProject && sendMessage) {
      sendMessage({
        type: 'project_deploy', 
        projectId: currentProject.id,
        payload: { projectId: currentProject.id }
      });
      toast({ title: 'Deploying project...' });
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/ide/${projectId}`;
    navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Link copied to clipboard' });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Simplified Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500" data-testid="connection-status"></div>
            <span className="font-medium text-sm" data-testid="project-name">
              {currentProject?.name || 'Loading...'}
            </span>
            {currentProject?.githubRepoUrl && (
              <Badge variant="outline" className="text-xs" data-testid="github-badge">
                <GitBranch className="w-3 h-3 mr-1" />
                GitHub
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Preview Mode Toggle */}
          <div className="flex items-center border border-border rounded-md">
            <Button
              variant={previewMode === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('desktop')}
              className="h-8 px-3"
              data-testid="button-preview-desktop"
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant={previewMode === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('mobile')}
              className="h-8 px-3"
              data-testid="button-preview-mobile"
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Actions */}
          <Button size="sm" onClick={handleSave} data-testid="button-save">
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>

          <Button size="sm" onClick={handleDeploy} data-testid="button-deploy">
            <Play className="w-4 h-4 mr-1" />
            Deploy
          </Button>

          {/* GitHub Sync Controls */}
          {currentProject?.githubRepoUrl && (
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGitHubPull}
                disabled={!githubPat || pullFromGitHubMutation.isPending}
                className="h-8 px-3 border-r border-border rounded-r-none"
                data-testid="button-github-pull"
                title="Pull latest changes from GitHub"
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGitHubPush}
                disabled={!githubPat || pushToGitHubMutation.isPending}
                className="h-8 px-3 rounded-l-none"
                data-testid="button-github-push"
                title="Push changes to GitHub"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* GitHub Setup Prompt */}
          {!currentProject?.githubRepoUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast({
                title: 'Setup GitHub',
                description: 'Go to Settings to configure GitHub integration',
              })}
              data-testid="button-github-setup"
              className="text-muted-foreground"
            >
              <Github className="w-4 h-4 mr-1" />
              GitHub
            </Button>
          )}

          {/* Tools Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-tools-menu">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleShare} data-testid="menu-share">
                <Share className="w-4 h-4 mr-2" />
                Share Project
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="menu-files">
                <FolderOpen className="w-4 h-4 mr-2" />
                View Files ({projectFiles?.length || 0})
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="menu-download">
                <Download className="w-4 h-4 mr-2" />
                Export Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="menu-settings">
                <Settings className="w-4 h-4 mr-2" />
                Project Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Interface: Chat Left + Preview Right */}
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Chat Panel - Left Side */}
          <ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
            <div className="h-full flex flex-col bg-card border-r border-border">
              <div className="p-3 border-b border-border">
                <h2 className="font-medium text-sm flex items-center" data-testid="chat-header">
                  <Zap className="w-4 h-4 mr-2 text-blue-500" />
                  AI Assistant
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Describe what you want to build and I'll help you create it
                </p>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <AIChatPanel
                  isOpen={true}
                  onClose={() => {}}
                  currentProject={currentProject}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Preview Panel - Right Side */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col bg-card">
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-sm flex items-center" data-testid="preview-header">
                    <Monitor className="w-4 h-4 mr-2 text-green-500" />
                    Live Preview
                  </h2>
                  {projectFiles?.length === 0 && (
                    <Badge variant="outline" className="text-xs" data-testid="no-files-badge">
                      No files yet
                    </Badge>
                  )}
                </div>
                {currentProject && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentProject.description || 'Your project preview will appear here'}
                  </p>
                )}
              </div>
              
              <div className="flex-1 overflow-hidden">
                {projectFiles?.length > 0 ? (
                  <LivePreview
                    currentProject={currentProject}
                    className="h-full"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-8">
                    <div className="max-w-md">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2" data-testid="empty-state-title">
                        Ready to start building
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Use the AI assistant to describe what you want to create. I'll generate the files and show you a live preview here.
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>💬 Try: "Create a landing page for a coffee shop"</p>
                        <p>💬 Try: "Build a todo app with React"</p>
                        <p>💬 Try: "Make a simple portfolio site"</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
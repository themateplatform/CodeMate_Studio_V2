import { useState } from "react";
import { Github, ExternalLink, GitBranch, GitCommit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Project } from "@/types";

interface GitHubIntegrationProps {
  currentProject: Project | null;
}

export function GitHubIntegration({ currentProject }: GitHubIntegrationProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const { toast } = useToast();

  const { data: repositories = [], isLoading } = useQuery({
    queryKey: ['/api/github/repos'],
    enabled: !!currentProject,
  });

  const parseGitHubUrl = (url: string) => {
    if (!url) return null;
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    return match ? { owner: match[1], repo: match[2] } : null;
  };

  const gitHubInfo = currentProject?.githubRepoUrl 
    ? parseGitHubUrl(currentProject.githubRepoUrl)
    : null;

  const connectRepoMutation = useMutation({
    mutationFn: async (githubRepoUrl: string) => {
      return apiRequest('PATCH', `/api/projects/${currentProject?.id}`, { githubRepoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({ title: "Success", description: "GitHub repository connected successfully!" });
      setIsDialogOpen(false);
      setRepoUrl("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to connect repository: ${error.message}`, variant: "destructive" });
    }
  });

  const handleConnect = () => {
    setIsDialogOpen(true);
  };

  const handleSubmitRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      toast({ title: "Error", description: "Please enter a repository URL", variant: "destructive" });
      return;
    }
    
    // Validate GitHub URL format
    const githubUrlPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/;
    if (!githubUrlPattern.test(repoUrl.trim())) {
      toast({ title: "Error", description: "Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)", variant: "destructive" });
      return;
    }
    
    connectRepoMutation.mutate(repoUrl.trim());
  };

  if (!currentProject) {
    return (
      <div className="text-xs text-muted-foreground">
        No project selected
      </div>
    );
  }

  if (gitHubInfo) {
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm">
          <Github className="w-4 h-4" />
          <span className="font-medium">{gitHubInfo.owner}/{gitHubInfo.repo}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Badge variant="outline" className="text-xs">
            <GitBranch className="w-2 h-2 mr-1" />
            main
          </Badge>
          <Badge variant="outline" className="text-xs">
            <GitCommit className="w-2 h-2 mr-1" />
            3 commits
          </Badge>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="w-full justify-start h-6 text-xs"
          data-testid="button-open-github-repo"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Open on GitHub
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start h-6 text-xs"
            onClick={handleConnect}
            disabled={isConnecting}
            data-testid="button-connect-github"
          >
            <Github className="w-3 h-3 mr-1" />
            {isConnecting ? 'Connecting...' : 'Connect Repository'}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md" data-testid="dialog-github-connect">
          <DialogHeader>
            <DialogTitle>Connect GitHub Repository</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmitRepo} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repo-url">Repository URL</Label>
              <Input
                id="repo-url"
                type="url"
                placeholder="https://github.com/owner/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                data-testid="input-github-url"
              />
              <p className="text-xs text-muted-foreground">
                Enter the full GitHub repository URL (e.g., https://github.com/microsoft/vscode)
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                data-testid="button-cancel-github"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={connectRepoMutation.isPending}
                data-testid="button-submit-github"
              >
                {connectRepoMutation.isPending ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {isLoading && (
        <div className="text-xs text-muted-foreground">
          Loading repositories...
        </div>
      )}
    </div>
  );
}

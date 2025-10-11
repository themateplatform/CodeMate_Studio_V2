import { Zap, Folder, GitBranch, Sparkles, Save, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Project } from "@/types";

interface TopNavBarProps {
  currentProject: Project | null;
  isConnected: boolean;
  onToggleChat: () => void;
  onSave: () => void;
  onDeploy: () => void;
}

export function TopNavBar({ 
  currentProject, 
  isConnected, 
  onToggleChat, 
  onSave, 
  onDeploy 
}: TopNavBarProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-card border-b border-border backdrop-blur-md bg-card/95">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <img src="https://cdn.builder.io/api/v1/image/assets%2F7f4f17bc2420491a95f23b47a94e6efc%2Fcf2bb14f9f634632acd8da085020bfdb?format=webp&width=800" alt="CodeMate Studio Logo" className="h-8 w-auto" />
          <span className="text-lg font-heading font-bold neon-text">
            CodeMate Studio
          </span>
        </div>

        {currentProject && (
          <div className="flex items-center space-x-2 text-sm">
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Folder className="w-3 h-3" />
              <span>{currentProject.name}</span>
            </Badge>
            <Badge variant="outline" className="flex items-center space-x-1 bg-accent/20 text-accent border-accent/20">
              <GitBranch className="w-3 h-3" />
              <span>main</span>
            </Badge>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Button
          onClick={onToggleChat}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          data-testid="button-toggle-ai-chat"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          AI Assistant
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onSave}
          data-testid="button-save-project"
        >
          <Save className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onDeploy}
          data-testid="button-deploy-project"
        >
          <Rocket className="w-4 h-4" />
        </Button>

        <Badge 
          variant={isConnected ? "default" : "destructive"} 
          className={`flex items-center space-x-1 ${isConnected ? 'bg-accent text-accent-foreground' : ''}`}
        >
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent-foreground animate-pulse' : 'bg-destructive-foreground'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </Badge>
      </div>
    </header>
  );
}

import { useState } from "react";
import { FolderTree, MessageCircle, ChevronRight, Folder, FileCode, FileText, Github, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitHubIntegration } from "@/components/github/GitHubIntegration";
import { FileTreeNode, Project } from "@/types";
import { cn } from "@/lib/utils";

interface LeftSidebarProps {
  fileTree: FileTreeNode[];
  onFileSelect: (file: FileTreeNode) => void;
  currentProject: Project | null;
}

export function LeftSidebar({ fileTree, onFileSelect, currentProject }: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'chat'>('files');

  const renderFileTreeNode = (node: FileTreeNode, level: number = 0) => {
    const isFolder = node.type === 'folder';
    const Icon = isFolder ? (node.isOpen ? Folder : Folder) : getFileIcon(node.name);

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "flex items-center space-x-2 py-1 px-2 hover:bg-secondary rounded text-sm cursor-pointer",
            node.isActive && "bg-secondary/50",
            `ml-${level * 4}`
          )}
          onClick={() => onFileSelect(node)}
          data-testid={`file-${node.name}`}
        >
          {isFolder && (
            <ChevronRight className={cn("w-3 h-3 transition-transform", node.isOpen && "rotate-90")} />
          )}
          <Icon className={cn(
            "w-4 h-4",
            isFolder ? "text-accent" : getFileIconColor(node.name)
          )} />
          <span>{node.name}</span>
          {node.isActive && <div className="ml-auto w-2 h-2 bg-accent rounded-full" />}
        </div>
        
        {isFolder && node.isOpen && node.children && (
          <div>
            {node.children.map(child => renderFileTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx') || fileName.endsWith('.ts') || fileName.endsWith('.js')) {
      return FileCode;
    }
    return FileText;
  };

  const getFileIconColor = (fileName: string) => {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
      return "text-primary";
    }
    if (fileName.endsWith('.css')) {
      return "text-blue-400";
    }
    if (fileName.endsWith('.json')) {
      return "text-yellow-400";
    }
    if (fileName.endsWith('.md')) {
      return "text-green-400";
    }
    return "text-foreground";
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
      {/* Sidebar Tabs */}
      <div className="flex border-b border-border">
        <Button
          variant={activeTab === 'files' ? "secondary" : "ghost"}
          className={cn(
            "flex-1 rounded-none border-b-2",
            activeTab === 'files' ? "border-primary" : "border-transparent"
          )}
          onClick={() => setActiveTab('files')}
          data-testid="tab-files"
        >
          <FolderTree className="w-4 h-4 mr-2" />
          Files
        </Button>
        <Button
          variant={activeTab === 'chat' ? "secondary" : "ghost"}
          className={cn(
            "flex-1 rounded-none border-b-2",
            activeTab === 'chat' ? "border-primary" : "border-transparent"
          )}
          onClick={() => setActiveTab('chat')}
          data-testid="tab-chat"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          AI Chat
        </Button>
      </div>

      {/* File Explorer */}
      {activeTab === 'files' && (
        <div className="flex-1 p-3 overflow-auto">
          {/* GitHub Integration */}
          <div className="mb-3 p-2 bg-secondary/50 rounded-md">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>GitHub Repository</span>
              <Button size="sm" variant="ghost" className="h-auto p-0">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            <GitHubIntegration currentProject={currentProject} />
          </div>

          {/* File Tree */}
          <div className="space-y-1">
            {fileTree.length > 0 ? (
              fileTree.map(node => renderFileTreeNode(node))
            ) : (
              <div className="text-muted-foreground text-sm p-4 text-center">
                No files yet. Create a new file or connect to a GitHub repository.
              </div>
            )}
          </div>

          {/* Supabase Integration */}
          <div className="mt-4 p-2 bg-secondary/30 rounded-md">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Supabase Backend</span>
              <Button size="sm" variant="ghost" className="h-auto p-0">
                <Database className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Connected</span>
              </div>
              <div className="text-muted-foreground">
                {currentProject?.supabaseProjectId || 'Not configured'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Tab Content */}
      {activeTab === 'chat' && (
        <div className="flex-1 p-3">
          <div className="text-muted-foreground text-sm text-center">
            AI Chat is available in the side panel. Click the AI Assistant button in the top bar.
          </div>
        </div>
      )}
    </div>
  );
}

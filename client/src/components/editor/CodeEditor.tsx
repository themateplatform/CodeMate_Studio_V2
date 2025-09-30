import { useState } from "react";
import { FileCode, FilePlus, X, Terminal, Bug, History, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MonacoEditor } from "./MonacoEditor";
import { Project, FileTreeNode } from "@/types";
import { cn } from "@/lib/utils";

interface CodeEditorProps {
  activeFile: FileTreeNode | null;
  currentProject: Project | null;
  onCreateFile?: (fileName: string) => void;
}

export function CodeEditor({ activeFile, currentProject, onCreateFile }: CodeEditorProps) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [terminalTab, setTerminalTab] = useState<'terminal' | 'console' | 'history'>('terminal');
  const [openTabs, setOpenTabs] = useState<FileTreeNode[]>(activeFile ? [activeFile] : []);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const handleCloseTab = (fileId: string) => {
    setOpenTabs(prev => prev.filter(tab => tab.id !== fileId));
  };

  const handleAIPromptSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && aiPrompt.trim()) {
      // TODO: Implement AI code generation
      console.log('AI Prompt:', aiPrompt);
      setAiPrompt("");
    }
  };

  const handleNewFileClick = () => {
    setIsCreatingFile(true);
    setNewFileName("");
  };

  const handleCreateFileSubmit = () => {
    if (newFileName.trim() && onCreateFile) {
      onCreateFile(newFileName.trim());
      setIsCreatingFile(false);
      setNewFileName("");
    }
  };

  const handleCreateFileCancel = () => {
    setIsCreatingFile(false);
    setNewFileName("");
  };

  const handleFileNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCreateFileSubmit();
    } else if (e.key === 'Escape') {
      handleCreateFileCancel();
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Tab Bar */}
      <div className="flex bg-card border-b border-border">
        {openTabs.length > 0 ? (
          openTabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "flex items-center px-4 py-2 text-sm font-medium border-r border-border",
                tab.isActive ? "bg-secondary" : "bg-card hover:bg-secondary/50"
              )}
              data-testid={`tab-${tab.name}`}
            >
              <FileCode className="w-4 h-4 mr-2 text-primary" />
              <span>{tab.name}</span>
              <Button
                size="sm"
                variant="ghost"
                className="ml-2 h-auto p-0.5 hover:bg-muted"
                onClick={() => handleCloseTab(tab.id)}
                data-testid={`button-close-tab-${tab.name}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))
        ) : (
          <div className="flex items-center px-4 py-2 text-sm text-muted-foreground">
            <FilePlus className="w-4 h-4 mr-2" />
            <span>No file open</span>
          </div>
        )}
        
        {isCreatingFile ? (
          <div className="flex items-center px-4 py-2 space-x-2">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={handleFileNameKeyDown}
              placeholder="filename.tsx"
              className="h-8 text-sm"
              autoFocus
              data-testid="input-new-filename"
            />
            <Button
              size="sm"
              onClick={handleCreateFileSubmit}
              disabled={!newFileName.trim()}
              data-testid="button-confirm-create-file"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCreateFileCancel}
              data-testid="button-cancel-create-file"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="flex items-center px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover-neon-purple"
            onClick={handleNewFileClick}
            disabled={!currentProject}
            data-testid="button-new-file"
          >
            <FilePlus className="w-4 h-4 mr-2" />
            <span>New File</span>
          </Button>
        )}
      </div>

      {/* Code Editor Area */}
      <div className="flex-1 relative">
        {activeFile ? (
          <MonacoEditor
            file={activeFile}
            project={currentProject}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-heading mb-2">No file selected</p>
              <p className="text-sm">Select a file from the sidebar or create a new one</p>
            </div>
          </div>
        )}

        {/* AI Code Generation Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-card border border-border rounded-lg p-3 backdrop-blur-md bg-card/95">
            <div className="flex items-center space-x-2 text-sm mb-2">
              <div className="flex items-center space-x-2 text-accent">
                <div className="w-4 h-4 bg-accent rounded-sm flex items-center justify-center animate-pulse">
                  <div className="w-2 h-2 bg-accent-foreground rounded-full" />
                </div>
                <span>AI Assistant</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">Type your request to generate code</span>
            </div>
            <Input
              placeholder="e.g., Create a user profile component with avatar and bio..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyPress={handleAIPromptSubmit}
              className="bg-input border-border focus:ring-ring"
              data-testid="input-ai-prompt"
            />
          </div>
        </div>
      </div>

      {/* Bottom Terminal/Output */}
      <div className="h-32 bg-card border-t border-border">
        <div className="flex bg-secondary/30">
          <Button
            variant={terminalTab === 'terminal' ? "secondary" : "ghost"}
            className={`rounded-none ${terminalTab === 'terminal' ? 'neon-glow' : 'hover-neon-purple'}`}
            onClick={() => setTerminalTab('terminal')}
            data-testid="tab-terminal"
          >
            <Terminal className="w-4 h-4 mr-2" />
            Terminal
          </Button>
          <Button
            variant={terminalTab === 'console' ? "secondary" : "ghost"}
            className={`rounded-none ${terminalTab === 'console' ? 'neon-glow' : 'hover-neon-purple'}`}
            onClick={() => setTerminalTab('console')}
            data-testid="tab-console"
          >
            <Bug className="w-4 h-4 mr-2" />
            Console
          </Button>
          <Button
            variant={terminalTab === 'history' ? "secondary" : "ghost"}
            className={`rounded-none ${terminalTab === 'history' ? 'neon-glow' : 'hover-neon-purple'}`}
            onClick={() => setTerminalTab('history')}
            data-testid="tab-history"
          >
            <History className="w-4 h-4 mr-2" />
            Generation History
          </Button>
        </div>
        
        <div className="p-3 font-mono text-sm overflow-auto h-24 bg-card">
          {terminalTab === 'terminal' && (
            <div className="space-y-1">
              <div className="text-accent">$ npm run dev</div>
              <div className="text-muted-foreground">vite v4.4.0 dev server running at:</div>
              <div className="text-muted-foreground">
                Local: <span className="text-accent">http://localhost:5173/</span>
              </div>
              <div className="text-green-400">✓ ready in 340ms</div>
            </div>
          )}
          {terminalTab === 'console' && (
            <div className="text-muted-foreground">
              Console output will appear here...
            </div>
          )}
          {terminalTab === 'history' && (
            <div className="text-muted-foreground">
              AI generation history will appear here...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

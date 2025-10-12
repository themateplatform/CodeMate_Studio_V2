import { useState, useEffect } from "react";
import { useEffect, useState } from 'react';
import { AlertCircle, Globe, Zap } from "lucide-react";
import { Project, FileTreeNode } from "@/types";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useQuery } from "@tanstack/react-query";
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface LivePreviewProps {
  currentProject: Project | null;
  activeFile?: FileTreeNode | null;
  mode?: 'desktop' | 'mobile';
  className?: string;
}

export function LivePreview({ currentProject, activeFile, mode = 'desktop', className }: LivePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, lastMessage, sendMessage } = useWebSocket();
  const [, setLocation] = useLocation();

  // Ensure user is authenticated before loading preview
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const resp = await fetch('/api/auth/user', { headers: { Accept: 'application/json' } });
      if (!resp.ok) throw new Error('Not authenticated');
      return resp.json();
    },
    retry: false,
  });

  // Load project files to build preview
  const { data: projectFiles } = useQuery({
    queryKey: ['/api/projects', currentProject?.id, 'files'],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const response = await fetch(`/api/projects/${currentProject.id}/files`);
      if (!response.ok) throw new Error('Failed to load files');
      return response.json();
    },
    enabled: !!currentProject?.id && !!user
  });

  // Generate preview URL for the project
  useEffect(() => {
    if (!currentProject) {
      setError('No project selected');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Check if project has HTML files or if we need to build a preview
    const timer = setTimeout(() => {
      if (projectFiles && projectFiles.length > 0) {
        // Find main HTML file or create a live preview URL
        const htmlFile = projectFiles.find((file: any) => 
          file.fileName === 'index.html' || file.filePath === 'index.html'
        );
        
        if (htmlFile) {
          // Use blob URL to serve the HTML content
          setPreviewUrl(`/api/projects/${currentProject.id}/preview`);
        } else {
          // For non-HTML projects, show a component preview
          setPreviewUrl(null); // Will show component preview
        }
      } else {
        // No files yet, show welcome state
        setPreviewUrl(null);
      }
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentProject, projectFiles]);

  // Listen for WebSocket updates to refresh preview
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'project_save' && lastMessage.projectId === currentProject?.id) {
      // Refresh preview when project is saved
      if (previewUrl) {
        setPreviewUrl(prev => prev ? `${prev}?t=${Date.now()}` : null);
      }
    }
  }, [lastMessage, currentProject?.id, previewUrl]);

  if (isLoading || userLoading) {
    return (
      <div className="flex-1 p-3">
        <div className="h-full bg-background rounded-lg border-2 border-border flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading preview...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 p-3">
        <div className="h-full bg-background rounded-lg border-2 border-border flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg mb-2">Sign in to view previews</h3>
            <p className="text-sm text-muted-foreground mb-4">Previews are only available to authenticated users.</p>
            <div className="flex items-center justify-center">
              <Button onClick={() => setLocation('/login')} variant="default">Sign in</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-3">
        <div className="h-full bg-background rounded-lg border-2 border-border flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Preview unavailable</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full", className)}>
      <div className={cn(
        "h-full bg-white rounded-lg border-2 border-border overflow-hidden transition-all duration-300",
        mode === 'mobile' && "max-w-sm mx-auto"
      )}>
        {previewUrl ? (
          <div className="h-full flex flex-col">
            {/* Connection Status Bar */}
            <div className="flex items-center justify-between p-2 bg-muted border-b">
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                )}></div>
                <span className="text-xs text-muted-foreground">
                  {isConnected ? "Live Updates Active" : "Disconnected"}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Live Preview</span>
              </div>
            </div>
            
            {/* Preview Frame */}
            <iframe
              src={previewUrl}
              className="flex-1 w-full"
              title="Live Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              data-testid="preview-iframe"
            />
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 bg-muted border-b">
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                )}></div>
                <span className="text-xs text-muted-foreground">
                  {isConnected ? "Real-time Connected" : "Connection Lost"}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3 text-blue-500" />
                <span className="text-xs text-muted-foreground">
                  {projectFiles?.length || 0} files
                </span>
              </div>
            </div>

            {/* Component Preview - Shows when files exist but no HTML */}
            <div className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  {projectFiles?.length > 0 ? "Component Preview" : "Ready for Live Preview"}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {projectFiles?.length > 0 
                    ? "Your components are building. HTML files will show full preview."
                    : "Create files with the AI assistant to see live preview here."
                  }
                </p>
                {projectFiles?.length > 0 && (
                  <div className="space-y-2">
                    {projectFiles.slice(0, 3).map((file: any, index: number) => (
                      <div key={index} className="bg-white rounded-lg p-3 border text-left">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium">{file.fileName}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{file.language}</span>
                        </div>
                      </div>
                    ))}
                    {projectFiles.length > 3 && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        +{projectFiles.length - 3} more files...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Monitor, Package, RefreshCw, ExternalLink, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LivePreview } from "@/components/preview/LivePreview";
import { ComponentLibrary } from "@/components/components/ComponentLibrary";
import { Project, FileTreeNode } from "@/types";
import { cn } from "@/lib/utils";

interface RightSidebarProps {
  currentProject: Project | null;
  activeFile: FileTreeNode | null;
}

export function RightSidebar({ currentProject, activeFile }: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'components'>('preview');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="w-96 bg-card border-l border-border flex flex-col">
      {/* Preview Tabs */}
      <div className="flex border-b border-border">
        <Button
          variant={activeTab === 'preview' ? "secondary" : "ghost"}
          className={cn(
            "flex-1 rounded-none border-b-2",
            activeTab === 'preview' ? "border-primary" : "border-transparent"
          )}
          onClick={() => setActiveTab('preview')}
          data-testid="tab-preview"
        >
          <Monitor className="w-4 h-4 mr-2" />
          Preview
        </Button>
        <Button
          variant={activeTab === 'components' ? "secondary" : "ghost"}
          className={cn(
            "flex-1 rounded-none border-b-2",
            activeTab === 'components' ? "border-primary" : "border-transparent"
          )}
          onClick={() => setActiveTab('components')}
          data-testid="tab-components"
        >
          <Package className="w-4 h-4 mr-2" />
          Components
        </Button>
      </div>

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="flex-1 flex flex-col">
          {/* Preview Controls */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="ghost" data-testid="button-refresh-preview">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" data-testid="button-open-external">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={previewMode === 'mobile' ? "secondary" : "ghost"}
                onClick={() => setPreviewMode('mobile')}
                data-testid="button-mobile-preview"
              >
                <Smartphone className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={previewMode === 'desktop' ? "secondary" : "ghost"}
                onClick={() => setPreviewMode('desktop')}
                data-testid="button-desktop-preview"
              >
                <Monitor className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Live Preview */}
          <LivePreview
            currentProject={currentProject}
            activeFile={activeFile}
            mode={previewMode}
          />
        </div>
      )}

      {/* Components Tab */}
      {activeTab === 'components' && (
        <div className="flex-1 flex flex-col">
          <ComponentLibrary />
        </div>
      )}
    </div>
  );
}

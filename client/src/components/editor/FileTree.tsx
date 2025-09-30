import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProjectFile } from '@shared/schema';

interface FileTreeProps {
  files: ProjectFile[];
  onFileSelect: (fileId: string) => void;
  activeFileId: string | null;
}

interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  language?: string;
  children: FileTreeNode[];
  parent?: string;
}

export default function FileTree({ files, onFileSelect, activeFileId }: FileTreeProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Build tree structure from flat file list
  const buildTree = (files: ProjectFile[]): FileTreeNode[] => {
    const nodeMap = new Map<string, FileTreeNode>();
    const roots: FileTreeNode[] = [];

    // Create nodes for all files and directories
    files.forEach(file => {
      const path = file.filePath || file.fileName;
      const parts = path.split('/');
      const fileName = parts[parts.length - 1];
      
      const node: FileTreeNode = {
        id: file.id,
        name: fileName,
        path: path,
        isDirectory: false, // ProjectFile doesn't have isDirectory, assume all are files
        language: file.language || undefined,
        children: [],
      };

      nodeMap.set(path, node);
    });

    // Build parent-child relationships
    files.forEach(file => {
      const path = file.filePath || file.fileName;
      const parts = path.split('/');
      const node = nodeMap.get(path)!;

      if (parts.length === 1) {
        // Root level file/directory
        roots.push(node);
      } else {
        // Find parent directory
        const parentPath = parts.slice(0, -1).join('/');
        const parent = nodeMap.get(parentPath);
        if (parent) {
          parent.children.push(node);
          node.parent = parentPath;
        }
      }
    });

    // Sort: directories first, then files, both alphabetically
    const sortNodes = (nodes: FileTreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(node => sortNodes(node.children));
    };

    sortNodes(roots);
    return roots;
  };

  const tree = buildTree(files);

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const getFileIcon = (file: FileTreeNode) => {
    if (file.isDirectory) {
      return expandedDirs.has(file.path) ? FolderOpen : Folder;
    }
    
    switch (file.language) {
      case 'typescript':
      case 'javascript':
        return FileCode;
      default:
        return File;
    }
  };

  const getFileIconColor = (file: FileTreeNode) => {
    if (file.isDirectory) return 'text-accent';
    
    switch (file.language) {
      case 'typescript':
        return 'text-blue-400';
      case 'javascript':
        return 'text-yellow-400';
      case 'html':
        return 'text-orange-400';
      case 'css':
        return 'text-blue-400';
      case 'json':
        return 'text-green-400';
      case 'markdown':
        return 'text-gray-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const renderNode = (node: FileTreeNode, depth: number = 0) => {
    const IconComponent = getFileIcon(node);
    const isExpanded = expandedDirs.has(node.path);
    const isActive = node.id === activeFileId;

    return (
      <div key={node.id}>
        <div
          className={`file-item flex items-center space-x-2 py-1 px-2 hover:bg-secondary rounded text-sm cursor-pointer ${
            isActive ? 'bg-secondary/50' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.isDirectory) {
              toggleDirectory(node.path);
            } else {
              onFileSelect(node.id);
            }
          }}
          data-testid={`file-item-${node.name}`}
        >
          {node.isDirectory && (
            <Button variant="ghost" size="sm" className="h-auto p-0">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </Button>
          )}
          {!node.isDirectory && <div className="w-3" />}
          
          <IconComponent className={`w-4 h-4 ${getFileIconColor(node)}`} />
          <span className="flex-1">{node.name}</span>
          
          {isActive && !node.isDirectory && (
            <div className="w-2 h-2 bg-accent rounded-full" data-testid="active-file-indicator" />
          )}
        </div>

        {node.isDirectory && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (files.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8" data-testid="empty-file-tree">
        <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No files in this project</p>
      </div>
    );
  }

  return (
    <div className="space-y-1" data-testid="file-tree">
      {tree.map(node => renderNode(node))}
    </div>
  );
}

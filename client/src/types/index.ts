export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  githubRepoUrl?: string;
  supabaseProjectId?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  fileName: string;
  filePath: string;
  content: string;
  language?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  isOpen?: boolean;
  isActive?: boolean;
  language?: string;
}

export interface CodeGenerationResult {
  code: string;
  explanation: string;
  fileName?: string;
  language: string;
  generationId: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface ComponentLibraryItem {
  id: string;
  name: string;
  icon: string;
  category: string;
  template: string;
  description: string;
}

export interface WebSocketMessage {
  type: string;
  payload?: any;
  projectId?: string;
  userId?: string;
}

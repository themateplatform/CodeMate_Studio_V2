import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Github, Calendar, Code, Settings, Search, Filter, Clock, CheckCircle, XCircle, GitBranch, Star, AlertCircle, MoreVertical, Trash2, GitPullRequest, RefreshCw, Unlink2, Link, Zap, Heart, Globe, Download } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function ProjectsPage() {
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectName, setProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [connectProjectId, setConnectProjectId] = useState<string | null>(null);
  
  // Multi-platform import state
  const [selectedPlatform, setSelectedPlatform] = useState<'github' | 'lovable' | 'replit' | 'bubble' | 'generic'>('github');
  const [importUrl, setImportUrl] = useState('');
  const [sourceType, setSourceType] = useState<'git' | 'zip' | 'github' | 'gitlab' | 'bitbucket'>('git');
  
  // Codemate database options
  const [databaseChoice, setDatabaseChoice] = useState<'existing' | 'new' | 'none'>('existing');
  const [existingSupabaseUrl, setExistingSupabaseUrl] = useState('');
  const [existingSupabaseKey, setExistingSupabaseKey] = useState('');
  
  const { toast } = useToast();

  // Load current user
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user');
      if (!response.ok) throw new Error('Not authenticated');
      return response.json();
    },
  });

  // Load user's projects  
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects/user', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/projects/user/${currentUser.id}`);
      if (!response.ok) throw new Error('Failed to load projects');
      return response.json();
    },
    enabled: !!currentUser?.id
  });

  // Load sync status for all GitHub projects in a single batch request
  const githubProjectIds = projects.filter((p: any) => p.githubRepoUrl).map((p: any) => p.id);
  const { data: syncStatuses = {}, isLoading: syncStatusLoading } = useQuery({
    queryKey: ['/api/projects/github/sync-status', githubProjectIds],
    queryFn: async () => {
      if (githubProjectIds.length === 0) return {};
      
      const response = await fetch('/api/projects/github/sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds: githubProjectIds })
      });
      
      if (!response.ok) {
        console.warn('Failed to fetch sync statuses');
        return {};
      }
      
      const statusData = await response.json();
      return statusData || {};
    },
    enabled: githubProjectIds.length > 0,
    refetchInterval: (data) => {
      // Refetch every 5 seconds if any project is syncing
      const hasSyncing = Object.values(data || {}).some((status: any) => status?.status === 'syncing');
      return hasSyncing ? 5000 : false;
    }
  });

  // Load GitHub repositories for import
  const { data: githubRepos = [], isLoading: reposLoading } = useQuery({
    queryKey: ['/api/github/repos'],
    queryFn: async () => {
      const response = await fetch('/api/github/repos');
      if (!response.ok) {
        if (response.status === 401) return []; // No GitHub connection
        throw new Error('Failed to load repositories');
      }
      return response.json();
    },
    enabled: !!currentUser
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; template?: string; database?: any }) => {
      const payload: { name: string; template?: string; database?: any } = { name: data.name };
      if (data.template && data.template !== 'blank') {
        payload.template = data.template;
      }
      if (data.database) {
        payload.database = data.database;
      }
      const response = await apiRequest('POST', '/api/projects', payload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects/user'] });
      setLocation(`/ide/${data.id}`);
      toast({
        title: 'Project created successfully',
        description: `${data.name} is ready for development`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const importRepoMutation = useMutation({
    mutationFn: async (data: { repoName: string; repoUrl: string }) => {
      // First create the project
      const projectResponse = await apiRequest('POST', '/api/projects', { 
        name: data.repoName,
        githubRepoUrl: data.repoUrl 
      });
      const project = await projectResponse.json();
      
      try {
        // Then import the repository
        const importResponse = await apiRequest('POST', `/api/projects/${project.id}/github/clone`, {
          repoUrl: data.repoUrl
        });
        await importResponse.json();
        
        return project;
      } catch (error) {
        // Rollback: delete the created project if import fails
        try {
          await apiRequest('DELETE', `/api/projects/${project.id}`);
        } catch (deleteError) {
          console.error('Failed to cleanup project after import failure:', deleteError);
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects/user'] });
      setLocation(`/ide/${data.id}`);
      toast({
        title: 'Repository imported successfully',
        description: `${data.name} is ready for development`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error importing repository',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Multi-platform import mutation
  const importPlatformMutation = useMutation({
    mutationFn: async (data: { 
      platform: string; 
      projectName: string; 
      url: string; 
      sourceType?: string;
    }) => {
      // First create the project
      const projectResponse = await apiRequest('POST', '/api/projects', { name: data.projectName });
      const project = await projectResponse.json();
      
      try {
        // Then import from the platform
        let importPayload: any = {};
        let endpoint = '';
        
        switch (data.platform) {
          case 'github':
            endpoint = `/api/projects/${project.id}/github/clone`;
            importPayload = { repoUrl: data.url };
            break;
          case 'lovable':
            endpoint = `/api/projects/${project.id}/import/lovable`;
            importPayload = { projectUrl: data.url };
            break;
          case 'replit':
            endpoint = `/api/projects/${project.id}/import/replit`;
            importPayload = { replUrl: data.url };
            break;
          case 'bubble':
            endpoint = `/api/projects/${project.id}/import/bubble`;
            importPayload = { appUrl: data.url };
            break;
          case 'generic':
            endpoint = `/api/projects/${project.id}/import/generic`;
            importPayload = { sourceUrl: data.url, sourceType: data.sourceType };
            break;
          default:
            throw new Error('Unsupported platform');
        }
        
        const importResponse = await apiRequest('POST', endpoint, importPayload);
        const result = await importResponse.json();
        
        return { project, result };
      } catch (error) {
        // Rollback: delete the created project if import fails
        try {
          await apiRequest('DELETE', `/api/projects/${project.id}`);
        } catch (deleteError) {
          console.error('Failed to cleanup project after import failure:', deleteError);
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects/user'] });
      setLocation(`/ide/${data.project.id}`);
      toast({
        title: 'Import successful',
        description: data.result.message,
      });
      // Reset form
      setImportUrl('');
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest('DELETE', `/api/projects/${projectId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects/user'] });
      toast({
        title: 'Project deleted',
        description: 'The project has been permanently deleted',
      });
      setDeleteProjectId(null);
    },
    onError: (error) => {
      toast({
        title: 'Error deleting project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Disconnect GitHub repo mutation
  const disconnectRepoMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return apiRequest('PATCH', `/api/projects/${projectId}`, { githubRepoUrl: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/github/sync-status'] });
      toast({
        title: 'Repository disconnected',
        description: 'GitHub repository has been disconnected from this project',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error disconnecting repository',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Refresh sync status mutation
  const refreshSyncMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/github/sync-refresh`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects/github/sync-status'] });
      toast({
        title: 'Sync status refreshed',
        description: 'GitHub sync status has been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error refreshing sync',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Retry sync mutation
  const retrySyncMutation = useMutation({
    mutationFn: async (projectId: string) => {
      if (!currentUser?.id) throw new Error('Not authenticated');
      const project = projects.find((p: any) => p.id === projectId);
      if (!project?.githubRepoUrl) throw new Error('No GitHub repository connected');
      
      const response = await apiRequest('POST', `/api/projects/${projectId}/github/clone`, {
        repoUrl: project.githubRepoUrl,
        clearExisting: false 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects/github/sync-status'] });
      toast({
        title: 'Sync retry started',
        description: 'GitHub repository sync has been restarted',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error retrying sync',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateProject = () => {
    if (!projectName.trim()) return;
    
    // Prepare database config
    let databaseConfig = null;
    if (databaseChoice === 'existing' && existingSupabaseUrl && existingSupabaseKey) {
      databaseConfig = {
        type: 'existing_supabase',
        url: existingSupabaseUrl,
        key: existingSupabaseKey
      };
    } else if (databaseChoice === 'new') {
      databaseConfig = {
        type: 'new_supabase'
      };
    }
    
    createProjectMutation.mutate({ 
      name: projectName, 
      template: selectedTemplate,
      database: databaseConfig
    });
    setIsCreateOpen(false);
    setProjectName('');
    setSelectedTemplate('blank');
    setDatabaseChoice('existing');
    setExistingSupabaseUrl('');
    setExistingSupabaseKey('');
  };

  const handleImportRepo = (repo: any) => {
    importRepoMutation.mutate({
      repoName: repo.name,
      repoUrl: repo.clone_url
    });
  };

  const handlePlatformImport = () => {
    if (!importUrl.trim()) {
      toast({
        title: 'URL required',
        description: 'Please enter a valid URL to import from',
        variant: 'destructive',
      });
      return;
    }

    // Generate project name from URL
    const projectName = generateProjectNameFromUrl(importUrl, selectedPlatform);
    
    importPlatformMutation.mutate({
      platform: selectedPlatform,
      projectName,
      url: importUrl,
      sourceType: selectedPlatform === 'generic' ? sourceType : undefined,
    });
  };

  const generateProjectNameFromUrl = (url: string, platform: string): string => {
    try {
      const urlObj = new URL(url);
      let name = '';
      
      switch (platform) {
        case 'lovable':
          // Extract project name from Lovable URL
          const lovableMatch = url.match(/\/project\/([^\/\?]+)/);
          name = lovableMatch ? lovableMatch[1] : 'lovable-project';
          break;
        case 'replit':
          // Extract repl name from Replit URL
          const replitMatch = url.match(/@[^\/]+\/([^\/\?]+)/);
          name = replitMatch ? replitMatch[1] : 'replit-project';
          break;
        case 'bubble':
          // Extract app name from Bubble URL
          const bubbleMatch = url.match(/\/([^\/\?]+)(?:\?|$)/);
          name = bubbleMatch ? bubbleMatch[1] : 'bubble-app';
          break;
        default:
          // Generic: try to extract meaningful name from URL
          const pathSegments = urlObj.pathname.split('/').filter(Boolean);
          name = pathSegments[pathSegments.length - 1] || 'imported-project';
          // Remove .git extension if present
          name = name.replace(/\.git$/, '');
          break;
      }
      
      // Clean the name
      return name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    } catch {
      return `${platform}-import`;
    }
  };

  const resetImportForm = () => {
    setImportUrl('');
    setSelectedPlatform('github');
    setSourceType('git');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    queryClient.clear();
    setLocation('/');
  };

  // Redirect to login if not authenticated
  if (userLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!currentUser) {
    setLocation('/login');
    return null;
  }

  const filteredProjects = projects.filter((project: any) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRepos = githubRepos.filter((repo: any) =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold" data-testid="text-projects-title">Projects</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
                data-testid="input-search-projects"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {currentUser.username}
            </span>
            <Button 
              variant="outline" 
              onClick={() => setLocation('/settings')}
              data-testid="button-settings"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              data-testid="button-logout"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Create Project Button */}
        <div className="mb-8">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg" data-testid="button-create-project">
                <Plus className="w-5 h-5 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="fresh" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="fresh" data-testid="tab-start-fresh">Start Fresh</TabsTrigger>
                  <TabsTrigger value="github" data-testid="tab-import-github">Import GitHub</TabsTrigger>
                  <TabsTrigger value="nocode" data-testid="tab-import-nocode">Import No-Code</TabsTrigger>
                </TabsList>
                
                <TabsContent value="fresh" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Project Name</Label>
                    <Input
                      id="projectName"
                      placeholder="My Awesome Project"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      data-testid="input-project-name"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Select Template</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Blank Template */}
                      <Card 
                        className={`cursor-pointer transition-all ${selectedTemplate === 'blank' ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'}`}
                        onClick={() => setSelectedTemplate('blank')}
                        data-testid="template-blank"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                              <Code className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-sm">Blank Project</h3>
                              <p className="text-xs text-muted-foreground">Start from scratch with an empty project</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* React Starter */}
                      <Card 
                        className={`cursor-pointer transition-all ${selectedTemplate === 'react-starter' ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'}`}
                        onClick={() => setSelectedTemplate('react-starter')}
                        data-testid="template-react-starter"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                              <Code className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-sm">React Starter</h3>
                              <p className="text-xs text-muted-foreground">Modern React with TypeScript, Tailwind CSS, and Vite</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Next.js Fullstack */}
                      <Card 
                        className={`cursor-pointer transition-all ${selectedTemplate === 'next-fullstack' ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'}`}
                        onClick={() => setSelectedTemplate('next-fullstack')}
                        data-testid="template-next-fullstack"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded bg-black flex items-center justify-center">
                              <Code className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-sm">Next.js Fullstack</h3>
                              <p className="text-xs text-muted-foreground">Next.js 14 with App Router, API routes, and Tailwind</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* API Backend */}
                      <Card 
                        className={`cursor-pointer transition-all ${selectedTemplate === 'api-backend' ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'}`}
                        onClick={() => setSelectedTemplate('api-backend')}
                        data-testid="template-api-backend"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center">
                              <Code className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-sm">API Backend</h3>
                              <p className="text-xs text-muted-foreground">Express.js API with TypeScript, auth, and PostgreSQL</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  
                  {/* Database Options */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Database Setup</Label>
                    <div className="space-y-2">
                      <Card 
                        className={`cursor-pointer transition-all ${databaseChoice === 'existing' ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'}`}
                        onClick={() => setDatabaseChoice('existing')}
                        data-testid="database-existing"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center">
                              <Link className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-sm">Attach Existing Supabase</h3>
                              <p className="text-xs text-muted-foreground">Connect to your existing Supabase database instance</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card 
                        className={`cursor-pointer transition-all ${databaseChoice === 'new' ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'}`}
                        onClick={() => setDatabaseChoice('new')}
                        data-testid="database-new"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                              <Plus className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-sm">Provision New Supabase DB</h3>
                              <p className="text-xs text-muted-foreground">Automatically create a new Supabase database</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card 
                        className={`cursor-pointer transition-all ${databaseChoice === 'none' ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'}`}
                        onClick={() => setDatabaseChoice('none')}
                        data-testid="database-none"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                              <Code className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-sm">No Database</h3>
                              <p className="text-xs text-muted-foreground">Start without database (add later)</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Existing Supabase Connection Form */}
                  {databaseChoice === 'existing' && (
                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="supabaseUrl">Supabase Project URL</Label>
                        <Input
                          id="supabaseUrl"
                          placeholder="https://your-project.supabase.co"
                          value={existingSupabaseUrl}
                          onChange={(e) => setExistingSupabaseUrl(e.target.value)}
                          data-testid="input-supabase-url"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supabaseKey">Supabase Anon Key</Label>
                        <Input
                          id="supabaseKey"
                          type="password"
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          value={existingSupabaseKey}
                          onChange={(e) => setExistingSupabaseKey(e.target.value)}
                          data-testid="input-supabase-key"
                        />
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleCreateProject}
                    disabled={!projectName.trim() || createProjectMutation.isPending}
                    className="w-full"
                    data-testid="button-create-new"
                  >
                    {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                  </Button>
                </TabsContent>
                
                <TabsContent value="github" className="space-y-4 mt-4">
                  {/* GitHub Import */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Select GitHub Repository</Label>
                    {reposLoading ? (
                      <div className="text-center py-8">Loading repositories...</div>
                    ) : githubRepos.length === 0 ? (
                      <div className="text-center py-8">
                        <Github className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">No GitHub repositories found</p>
                        <Button variant="outline" onClick={() => window.location.href = '/api/auth/github'}>
                          Connect GitHub Account
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredRepos.map((repo: any) => (
                          <div key={repo.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">{repo.name}</h4>
                              <p className="text-sm text-muted-foreground">{repo.description || 'No description'}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                {repo.language && (
                                  <Badge variant="secondary" className="text-xs">{repo.language}</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  Updated {new Date(repo.updated_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleImportRepo(repo)}
                              disabled={importRepoMutation.isPending}
                              data-testid={`button-import-${repo.name}`}
                            >
                              {importRepoMutation.isPending ? 'Importing...' : 'Import'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="nocode" className="space-y-4 mt-4">
                  {/* Platform Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Select No-Code Platform</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={selectedPlatform === 'lovable' ? 'default' : 'outline'}
                        onClick={() => setSelectedPlatform('lovable')}
                        className="justify-start"
                        data-testid="button-platform-lovable"
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Lovable
                      </Button>
                      <Button
                        variant={selectedPlatform === 'replit' ? 'default' : 'outline'}
                        onClick={() => setSelectedPlatform('replit')}
                        className="justify-start"
                        data-testid="button-platform-replit"
                      >
                        <Code className="w-4 h-4 mr-2" />
                        Replit
                      </Button>
                      <Button
                        variant={selectedPlatform === 'bubble' ? 'default' : 'outline'}
                        onClick={() => setSelectedPlatform('bubble')}
                        className="justify-start"
                        data-testid="button-platform-bubble"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Bubble
                      </Button>
                      <Button
                        variant={selectedPlatform === 'generic' ? 'default' : 'outline'}
                        onClick={() => setSelectedPlatform('generic')}
                        className="justify-start col-span-2"
                        data-testid="button-platform-generic"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        Generic (Git, ZIP, etc.)
                      </Button>
                    </div>
                  </div>

                  {/* Platform Import Forms */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="importUrl">
                        {selectedPlatform === 'lovable' && 'Lovable Project URL'}
                        {selectedPlatform === 'replit' && 'Replit Project URL'}
                        {selectedPlatform === 'bubble' && 'Bubble App URL'}
                        {selectedPlatform === 'generic' && 'Source URL'}
                      </Label>
                      <Input
                        id="importUrl"
                        placeholder={
                          selectedPlatform === 'lovable' ? 'https://lovable.dev/project/your-project'
                          : selectedPlatform === 'replit' ? 'https://replit.com/@username/project-name'
                          : selectedPlatform === 'bubble' ? 'https://your-app.bubbleapps.io'
                          : 'https://github.com/user/repo or zip file URL'
                        }
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        data-testid="input-import-url"
                      />
                    </div>

                    {selectedPlatform === 'generic' && (
                      <div className="space-y-2">
                        <Label>Source Type</Label>
                        <div className="flex gap-2">
                          {[
                            { value: 'git', label: 'Git Repository' },
                            { value: 'zip', label: 'ZIP Archive' },
                            { value: 'github', label: 'GitHub' },
                            { value: 'gitlab', label: 'GitLab' },
                            { value: 'bitbucket', label: 'Bitbucket' }
                          ].map((type) => (
                            <Button
                              key={type.value}
                              variant={sourceType === type.value ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSourceType(type.value as any)}
                              data-testid={`button-source-${type.value}`}
                            >
                              {type.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handlePlatformImport}
                      disabled={!importUrl.trim() || importPlatformMutation.isPending}
                      className="w-full"
                      data-testid="button-import-platform"
                    >
                      {importPlatformMutation.isPending ? 'Importing...' : `Import from ${selectedPlatform === 'generic' ? sourceType.toUpperCase() : selectedPlatform}`}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects List */}
        <div className="space-y-6">
          {projectsLoading ? (
            <div className="text-center py-12" role="status" aria-live="polite">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" aria-hidden="true"></div>
              <p className="text-muted-foreground">Loading your projects...</p>
              <span className="sr-only">Loading projects</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12" role="status" aria-live="polite">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Code className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">Create your first project to get started with Codemate Dynamic Intelligence</p>
              <Button 
                onClick={() => setIsCreateOpen(true)}
                data-testid="button-create-first-project"
                aria-label="Create your first project"
              >
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                Create Your First Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project: any) => {
                const syncStatus = syncStatuses[project.id];
                return (
                  <Card key={project.id} className="group hover:shadow-lg transition-all duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle 
                            className="text-lg truncate cursor-pointer hover:text-primary transition-colors"
                            onClick={() => setLocation(`/ide/${project.id}`)}
                            data-testid={`link-project-${project.name}`}
                          >
                            {project.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-3 h-3" />
                              <span className="text-xs">
                                Created {new Date(project.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label={`Options for ${project.name}`}
                            >
                              <MoreVertical className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLocation(`/ide/${project.id}`)}>
                              <Code className="w-4 h-4 mr-2" />
                              Open in IDE
                            </DropdownMenuItem>
                            {project.githubRepoUrl && (
                              <>
                                <DropdownMenuItem onClick={() => refreshSyncMutation.mutate(project.id)}>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Refresh Sync
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => retrySyncMutation.mutate(project.id)}>
                                  <GitPullRequest className="w-4 h-4 mr-2" />
                                  Retry Sync
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => disconnectRepoMutation.mutate(project.id)}>
                                  <Unlink2 className="w-4 h-4 mr-2" />
                                  Disconnect GitHub
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Project
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{project.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteProjectMutation.mutate(project.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* GitHub Repository Info */}
                        {project.githubRepoUrl && (
                          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div className="flex items-center space-x-2 min-w-0">
                              <Github className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm text-muted-foreground truncate">
                                {project.githubRepoUrl.split('/').slice(-2).join('/')}
                              </span>
                            </div>
                            {syncStatus && (
                              <Badge 
                                variant={
                                  syncStatus.status === 'synced' ? 'default' :
                                  syncStatus.status === 'syncing' ? 'secondary' :
                                  syncStatus.status === 'error' ? 'destructive' : 'outline'
                                }
                                className="ml-2 flex-shrink-0"
                              >
                                {syncStatus.status === 'syncing' && <div className="w-2 h-2 rounded-full bg-current animate-pulse mr-1" />}
                                {syncStatus.status === 'synced' && <CheckCircle className="w-3 h-3 mr-1" />}
                                {syncStatus.status === 'error' && <XCircle className="w-3 h-3 mr-1" />}
                                {syncStatus.status}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Project Actions */}
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => setLocation(`/ide/${project.id}`)}
                            data-testid={`button-open-${project.name}`}
                          >
                            <Code className="w-4 h-4 mr-2" />
                            Open
                          </Button>
                          {project.githubRepoUrl && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.open(project.githubRepoUrl, '_blank')}
                              data-testid={`button-github-${project.name}`}
                            >
                              <Github className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
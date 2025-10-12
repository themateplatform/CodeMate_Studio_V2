import { useState } from 'react';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Github, Code, Calendar, Zap, ExternalLink, Edit2, Trash2, MoreVertical, Eye, Play, Sparkles, ArrowRight, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function ProjectsPageSimplified() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
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

  // Rename project mutation
  const renameProjectMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await apiRequest('PATCH', `/api/projects/${id}`, { name });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects/user', currentUser?.id] });
      setEditingProjectId(null);
      setEditingName('');
      toast({
        title: "Project renamed! 🎉",
        description: "Your project has been successfully renamed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rename failed",
        description: error.message || "Failed to rename project. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/projects/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects/user', currentUser?.id] });
      toast({
        title: "Project deleted",
        description: "Your project has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete project. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleStartEditing = (project: any) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };

  const handleSaveEdit = () => {
    if (editingProjectId && editingName.trim()) {
      renameProjectMutation.mutate({ id: editingProjectId, name: editingName.trim() });
    }
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
    setEditingName('');
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const generateThumbnailUrl = (project: any): string => {
    // Generate a placeholder thumbnail based on project type/name
    const seed = project.name.split('').reduce((a: number, b: string) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const colors = [
      'from-blue-500 to-purple-600',
      'from-green-500 to-teal-600', 
      'from-pink-500 to-rose-600',
      'from-orange-500 to-red-600',
      'from-indigo-500 to-blue-600',
      'from-purple-500 to-pink-600'
    ];
    return colors[Math.abs(seed) % colors.length];
  };

  if (userLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="fade-in text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-4">
            <Code className="w-6 h-6 text-white animate-pulse" />
          </div>
          <h3 className="font-semibold mb-2">Loading your projects...</h3>
          <p className="text-sm text-muted-foreground">Setting up your workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background p-6 overflow-auto">
      <div className="max-w-7xl mx-auto fade-in">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Your Projects</h1>
              <p className="text-muted-foreground">
                Build, deploy, and manage your applications
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                variant="ghost"
                className="gap-2"
                onClick={() => setLocation('/')}
                data-testid="button-home"
              >
                <Home className="w-5 h-5" />
                Home
              </Button>

              <Button
                size="lg"
                className="btn-primary gap-2 hover-neon"
                onClick={() => setLocation('/')}
                data-testid="button-create-project"
              >
                <Sparkles className="w-5 h-5" />
                + Create New App
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {projectsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="glass animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-muted rounded w-2/3"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-6">
              <Code className="w-12 h-12 text-primary/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Get coding in seconds. Create a new project or import from GitHub.
            </p>
            <Button 
              className="btn-primary gap-2 hover-neon" 
              size="lg"
              onClick={() => setLocation('/')}
              data-testid="button-empty-state-quickstart"
            >
              <Sparkles className="w-4 h-4" />
              + Create New App
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: any) => (
              <Card 
                key={project.id} 
                className="glass hover:bg-secondary/10 transition-all duration-300 hover:scale-[1.02] border-border/50 hover-neon group"
                data-testid={`card-project-${project.id}`}
              >
                {/* Project Thumbnail */}
                <div className="relative h-32 overflow-hidden rounded-t-lg">
                  <div 
                    className={`w-full h-full bg-gradient-to-br ${generateThumbnailUrl(project)} flex items-center justify-center`}
                  >
                    <Code className="w-8 h-8 text-white/80" />
                  </div>
                  {project.githubRepoUrl && (
                    <Badge className="absolute top-2 right-2 bg-green-500/20 text-green-400 border-green-500/30">
                      <Github className="w-3 h-3 mr-1" />
                      Synced
                    </Badge>
                  )}
                  
                  {/* Action Menu */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm border-border/50"
                          data-testid={`button-menu-${project.id}`}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem
                          onClick={() => setLocation(`/ide/${project.id}`)}
                          data-testid={`button-open-editor-${project.id}`}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Editor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStartEditing(project)}
                          data-testid={`button-rename-${project.id}`}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteProject(project.id, project.name)}
                          className="text-destructive"
                          data-testid={`button-delete-${project.id}`}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    {editingProjectId === project.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="text-lg font-semibold"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit();
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          autoFocus
                          data-testid={`input-edit-name-${project.id}`}
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSaveEdit}
                            disabled={renameProjectMutation.isPending}
                            className="h-8 w-8 p-0 text-green-600"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            className="h-8 w-8 p-0"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <CardTitle className="flex items-center gap-2 text-lg cursor-pointer" onClick={() => setLocation(`/ide/${project.id}`)}>
                        <Code className="w-4 h-4 text-primary" />
                        {project.name}
                      </CardTitle>
                    )}
                  </div>
                  <CardDescription className="text-sm">
                    {project.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setLocation(`/ide/${project.id}`)}
                      data-testid={`button-quick-open-${project.id}`}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartEditing(project)}
                      data-testid={`button-quick-rename-${project.id}`}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

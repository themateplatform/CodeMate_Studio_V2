import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Folder, GitBranch, Settings, Copy, Trash2, ExternalLink, FileText, Code2, Loader2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  autonomyLevel: string;
  githubRepoUrl?: string;
  githubBranch?: string;
  githubSyncEnabled: boolean;
  provisioningStatus: string;
  createdAt: string;
  updatedAt: string;
}

export function ProjectsDashboard() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [error, setError] = useState("");

  // Fetch projects
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ["/api/projects/stats"],
    queryFn: async () => {
      const response = await fetch("/api/projects/stats", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create project");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/stats"] });
      setIsCreateDialogOpen(false);
      setError("");
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete project");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/stats"] });
    },
  });

  // Duplicate project mutation
  const duplicateProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}/duplicate`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to duplicate project");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/stats"] });
    },
  });

  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    isPublic: false,
    autonomyLevel: "ask_some" as const,
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!newProject.name.trim()) {
      setError("Project name is required");
      return;
    }

    createProjectMutation.mutate(newProject);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access your projects</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation("/login")} className="w-full">
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const projects = projectsData?.projects || [];
  const stats = statsData?.stats || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.username}!</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateProject}>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Start a new project to build your application
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name *</Label>
                    <Input
                      id="name"
                      placeholder="My Awesome App"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your project..."
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="autonomy">AI Autonomy Level</Label>
                    <Select
                      value={newProject.autonomyLevel}
                      onValueChange={(value: any) => setNewProject({ ...newProject, autonomyLevel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ask_everything">Ask Everything - Full approval</SelectItem>
                        <SelectItem value="ask_some">Ask Some - Balanced approach</SelectItem>
                        <SelectItem value="ask_none">Ask None - Full autonomy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createProjectMutation.isPending}>
                    {createProjectMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Projects</CardDescription>
              <CardTitle className="text-3xl">{stats.totalProjects || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Public Projects</CardDescription>
              <CardTitle className="text-3xl">{stats.publicProjects || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>GitHub Synced</CardDescription>
              <CardTitle className="text-3xl">{stats.githubSyncEnabled || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Provisioned</CardDescription>
              <CardTitle className="text-3xl">{stats.provisionedProjects || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Folder className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600 text-center mb-4">
                Create your first project to get started with building
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: Project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{project.name}</CardTitle>
                      {project.description && (
                        <CardDescription className="line-clamp-2">
                          {project.description}
                        </CardDescription>
                      )}
                    </div>
                    <Folder className="h-8 w-8 text-blue-600 flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {project.isPublic && (
                      <Badge variant="secondary">Public</Badge>
                    )}
                    {project.githubSyncEnabled && (
                      <Badge variant="outline" className="gap-1">
                        <GitBranch className="h-3 w-3" />
                        GitHub
                      </Badge>
                    )}
                    <Badge variant="outline">{project.autonomyLevel.replace("_", " ")}</Badge>
                  </div>
                  {project.githubRepoUrl && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Code2 className="h-4 w-4" />
                      <a 
                        href={project.githubRepoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 truncate"
                      >
                        {project.githubRepoUrl.replace("https://github.com/", "")}
                      </a>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => setLocation(`/spec-editor?projectId=${project.id}`)}
                  >
                    <FileText className="h-4 w-4" />
                    Specs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateProjectMutation.mutate(project.id)}
                    disabled={duplicateProjectMutation.isPending}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
                        deleteProjectMutation.mutate(project.id);
                      }
                    }}
                    disabled={deleteProjectMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
